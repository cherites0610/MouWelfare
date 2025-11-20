import { Injectable, Logger } from "@nestjs/common";
import { ConversationService } from "./conversation.service.js";
import { WelfareService } from "../welfare/welfare.service.js";
import { UserService } from "../user/user.service.js";
import {
  WelfareCard,
  EnrichedWelfareCard,
  UserProfile,
  AiAnswerResponse,
  ComparisonRow,
  ComparisonColumn,
  ComparisonTableResponse,
} from "./dto/vertex.interfaces.js";
import { DiscoveryEngineClient } from "./discovery-engine.service.js";
import { ResilientAIService } from "../ai/resilient-ai.service.js";
import { ConstDataService } from "../common/const-data/const-data.service.js";
import { Identity } from "src/common/const-data/entities/identity.entity.js";

@Injectable()
export class VertexService {
  private readonly logger = new Logger(VertexService.name);

  constructor(
    private readonly conversationService: ConversationService,
    private readonly welfareService: WelfareService,
    private readonly userService: UserService,
    private readonly discoveryEngineClient: DiscoveryEngineClient,
    private readonly aiProvider: ResilientAIService,
    private readonly constDataService: ConstDataService
  ) {}

  async getAiAnswer(
    userQuery: string,
    userId: string,
    conversationId?: number,
    personalized?: boolean
  ): Promise<AiAnswerResponse> {
    this.logger.log(`User: ${userId}, ConversationID: ${conversationId}`);

    const userProfile = personalized
      ? await this.getUserProfile(userId)
      : undefined;

    const currentConversationId = await this.ensureConversationId(
      userId,
      conversationId
    );

    const { fullContextText, lastSessionName } =
      await this.getConversationContext(currentConversationId, userQuery);

    const { sessionName, queryId, results } = await this.executeSearch(
      userQuery,
      userId,
      lastSessionName,
      userProfile
    );

    const welfareCards = this.mapResultsToWelfareCards(results);

    let enrichedWelfareCards: EnrichedWelfareCard[] = [];
    let detectedIdentities: string[] = [];
    let detectedLocation: string | undefined = undefined;

    if (welfareCards.length > 0) {
      [detectedIdentities, detectedLocation] = await Promise.all([
        this.getContextIdentity(fullContextText),
        this.getLocationIdentity(fullContextText),
      ]);
      const identities = this.constDataService
        .getIdentities()
        .filter((i) => detectedIdentities.includes(i.name));
      console.log("完整的對話上下文為:", fullContextText);
      console.log("用戶的身份別為:", detectedIdentities);
      console.log("用戶的地區為:", detectedLocation);

      enrichedWelfareCards = await this.enrichWelfareCards(
        welfareCards,
        identities,
        detectedLocation
      );
    }

    const { answerText, relatedQuestions } =
      await this.discoveryEngineClient.answer({
        userQuery,
        sessionName,
        queryId,
      });

    await this.saveMessages(currentConversationId, userQuery, answerText, {
      welfareCards: enrichedWelfareCards,
      sessionName,
      queryId,
      relatedQuestions,
      detectedIdentities, // 也可以選擇存入 metadata
      detectedLocation,
    });

    return {
      conversationId: currentConversationId,
      answer: answerText,
      welfareCards: enrichedWelfareCards,
      relatedQuestions,
      sessionName,
      queryId,
      isNewConversation: !conversationId || !lastSessionName,
      detectedIdentities,
      detectedLocation,
    };
  }

  private async ensureConversationId(
    userId: string,
    conversationId?: number
  ): Promise<number> {
    if (conversationId) {
      return conversationId;
    }
    const newConversation = await this.conversationService.createConversation(
      userId,
      "未命名對話"
    );
    return newConversation.id;
  }

  private async executeSearch(
    userQuery: string,
    userId: string,
    sessionName?: string,
    userProfile?: UserProfile
  ): Promise<{ sessionName?: string; queryId?: string; results: any[] }> {
    try {
      if (!sessionName) {
        return await this.discoveryEngineClient.search({
          query: userQuery,
          userId,
          userProfile,
        });
      }

      return await this.discoveryEngineClient.search({
        query: userQuery,
        userId,
        sessionName,
      });
    } catch (error) {
      this.logger.error(`Search API failed: ${error.message}`);
      return { sessionName, queryId: undefined, results: [] };
    }
  }

  private async getUserProfile(
    userId: string
  ): Promise<UserProfile | undefined> {
    try {
      const user = await this.userService.findOneByID(userId);
      return {
        age: user.birthday
          ? new Date().getFullYear() - new Date(user.birthday).getFullYear()
          : undefined,
        city: user.location?.name,
        identity: user.identities[0]?.name,
        income: undefined,
      };
    } catch (error) {
      this.logger.warn(`Failed to get UserProfile: ${error.message}`);
      return undefined;
    }
  }

  private async getConversationContext(
    conversationId: number,
    userQuery: string
  ): Promise<{ fullContextText: string; lastSessionName?: string }> {
    const lastAiMessage =
      await this.conversationService.getLastAiMessage(conversationId);
    const sessionName =
      lastAiMessage?.metadata?.sessionName || lastAiMessage?.metadata?.session;

    const historyText =
      await this.conversationService.getHistoryAsText(conversationId);
    const fullContextText = `${historyText}\n${userQuery}`;

    return { fullContextText, lastSessionName: sessionName };
  }

  private mapResultsToWelfareCards(results: any[]): WelfareCard[] {
    return results.map((r) => ({
      id: r.document?.structData?.id || r.document?.id,
      title: r.document?.structData?.title || r.document?.displayName,
      summary: r.document?.structData?.summary || r.document?.snippet,
      detail: r.document?.structData?.detail,
      forward: r.document?.structData?.forward,
      link: r.document?.structData?.link,
      location: r.document?.structData?.location,
      publicationDate: r.document?.structData?.publicationDate,
      categories: r.document?.structData?.categories,
      applicationCriteria: r.document?.structData?.applicationCriteria,
    }));
  }

  // 修改重點：參數不再是 fullContextText，而是直接接收資料
  private async enrichWelfareCards(
    cards: WelfareCard[],
    userIdentities: Identity[],
    userLocation?: string
  ): Promise<EnrichedWelfareCard[]> {
    return Promise.all(
      cards.map(async (card) => {
        if (!card.id) return { ...card, lightStatus: undefined };
        try {
          const welfare = await this.welfareService.findSourceOne(card.id);
          if (!welfare) {
            throw new Error(`welfare not found: ${card.id}`);
          }

          const { status, reasons } = this.welfareService.getWelfareLight(
            welfare.identities,
            userIdentities,
            welfare.location?.name,
            userLocation
          );

          const lightStatus =
            status === 1 ? "green" : status === 2 ? "yellow" : "red";
          return {
            ...card,
            lightStatus: lightStatus,
            lightReason: reasons,
          };
        } catch (error) {
          this.logger.warn(
            `Enrichment failed for ${card.id}: ${error.message}`
          );
          return {
            ...card,
            lightStatus: undefined,
            lightReason: ["查詢資格時發生錯誤"],
          };
        }
      })
    );
  }

  private async saveMessages(
    conversationId: number,
    userQuery: string,
    aiAnswer: string,
    metadata: any
  ) {
    try {
      await this.conversationService.addMessage(
        conversationId,
        "user",
        userQuery
      );
      await this.conversationService.addMessage(
        conversationId,
        "ai",
        aiAnswer,
        metadata
      );
    } catch (error) {
      this.logger.error(
        `Failed to save messages (ID: ${conversationId}): ${error.message}`
      );
    }
  }

  async findSimilarWelfareGlobally(
    templateWelfareId: string,
    userId: string
  ): Promise<WelfareCard[]> {
    const sourceWelfare =
      await this.welfareService.findSourceOne(templateWelfareId);
    if (!sourceWelfare) {
      throw new Error(`Template welfare not found: ${templateWelfareId}`);
    }

    const sourceCityName = sourceWelfare.location?.name || "";

    const promptInput = `
  排除縣市：${sourceCityName}
  標題：${sourceWelfare.title}
  簡介：${sourceWelfare.summary}
  `;

    const genericKeywords = await this.aiProvider.generateContent(
      promptInput,
      extractGenericKeywordsPrompt
    );

    this.logger.log(
      `Global Similar Search Keywords: [${genericKeywords.trim()}] (Excluded: ${sourceCityName})`
    );

    const { results } = await this.discoveryEngineClient.search({
      query: genericKeywords.trim(),
      userId: userId,
    });

    const mappedCards = this.mapResultsToWelfareCards(results);

    return mappedCards.filter((card) => card.id !== templateWelfareId);
  }

  async generateComparisonTable(
    cards: WelfareCard[]
  ): Promise<ComparisonRow[]> {
    if (cards.length < 2) return [];

    const inputs = cards.map((card) => ({
      id: card.id,
      location: card.location || "未知地區", // 把地區也餵給 AI 參考
      title: card.title,
      content: `
      摘要: ${card.summary}
      福利地區: ${card.location || "未知地區"}
      可獲得福利: ${card.forward || "無"}
      資格: ${card.applicationCriteria || "無"}
    `.trim(),
    }));

    const prompt = `
    ${generateComparisonPrompt}

    待比較資料:
    ${JSON.stringify(inputs)}
  `;

    const result = await this.aiProvider.generateContent(prompt, "");

    try {
      const cleanedResult = result.replace(/```json|```/g, "").trim();
      const parsed: ComparisonRow[] = JSON.parse(cleanedResult);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      this.logger.error(`Comparison generation failed: ${error.message}`);
      return [];
    }
  }

  async autoCompareSimilar(
    welfareId: string,
    userId: string
  ): Promise<ComparisonTableResponse> {
    // 改為回傳新介面

    const sourceWelfare = await this.welfareService.findSourceOne(welfareId);
    if (!sourceWelfare) {
      throw new Error("Welfare not found");
    }

    const sourceCard: WelfareCard = {
      id: sourceWelfare.id,
      title: sourceWelfare.title,
      summary: sourceWelfare.summary,
      detail: sourceWelfare.details,
      applicationCriteria: sourceWelfare.applicationCriteria.join(", "),
      location: sourceWelfare.location?.name || "未知地區", // 確保有值
      link: sourceWelfare.link,
    };

    // 搜尋類似福利 (排除本體)
    const similarCards = await this.findSimilarWelfareGlobally(
      welfareId,
      userId
    );

    // 組合：本體 + 前 3 筆類似
    const cardsToCompare = [sourceCard, ...similarCards.slice(0, 3)];

    // 1. 產生 Rows (AI 分析内容)
    const rows = await this.generateComparisonTable(cardsToCompare);

    // 2. 產生 Columns (程式提取地區與標題)
    const columns: ComparisonColumn[] = cardsToCompare.map((card) => ({
      key: card.id,
      location: card.location || "其他地區", // 這就是你要的表頭重點
      title: card.title,
      isSource: card.id === welfareId,
    }));

    return {
      columns,
      rows,
    };
  }

  private async getContextIdentity(text: string) {
    const validIdentities = this.constDataService
      .getIdentities()
      .map((i) => i.name);

    const prompt = `
    標簽共有:${validIdentities.join(",")}

    對話内容:${text}
  `;

    const result = await this.aiProvider.generateContent(
      prompt,
      userIdentityPrompt
    );

    try {
      const cleanedResult = result.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleanedResult);
      const identitiesArray = Array.isArray(parsed) ? parsed : [];

      return identitiesArray.filter((id) => validIdentities.includes(id));
    } catch (error) {
      return [];
    }
  }

  private async getLocationIdentity(text: string) {
    const validIdentities = this.constDataService
      .getLocations()
      .map((i) => i.name);

    const prompt = `
    標簽共有:${validIdentities.join(",")}

    對話内容:${text}
  `;

    const result = await this.aiProvider.generateContent(
      prompt,
      userLocationPrompt
    );

    try {
      return result.trim();
    } catch (error) {
      return undefined;
    }
  }
}

const userIdentityPrompt = `
# Role: 多标签分类器

## Profile
- language: 中文
- description: 根据输入对话，从预定义身份类别列表中选择所有符合的标签。
- personality: 客观、准确、高效。
- expertise: 文本分类、多标签分类、自然语言理解。

## Skills
- 文本分析，特征提取，多标签分类，置信度评估。
- 数据格式化：以JSON数组形式返回识别的标签。
- 上下文学习，提升分类准确性。

## Rules
1.  根据对话内容客观、准确、完整、高效地识别身份。
2.  尊重用户隐私，清晰表达，持续学习，及时反馈。
3.  仅从预定义标签选择，主要处理中文，结果依赖上下文，无法处理模糊内容。

## Workflows
- 目标: 返回所有符合的身份标签的JSON数组。
- 步骤: 接收对话 -> 文本分析和特征提取 -> 匹配身份标签 -> 返回JSON数组。
- 预期结果: 包含所有符合身份标签的JSON数组。

## Initialization
作为多标签分类器，你必须遵守上述Rules，按照Workflows执行任务。
`;

const userLocationPrompt = `
# Role: 单标签分类器

## Profile
- language: 中文
- description: 专业的单标签分类器，根据对话内容准确识别并返回最后讨论的地区名称，输出纯文本格式。
- expertise: 文本分类、上下文分析、命名实体识别。

## Skills
- 核心技能：文本分类 (上下文理解, 命名实体识别, 类别选择, 消除歧义)
- 辅助技能：数据处理 (数据清洗, 文本分析, 错误处理, 模型优化)

## Rules
- 准确识别对话中最后讨论的地区名称，返回单一、相关、简洁的结果。
- 基于文本内容进行客观判断，忽略引导性语句。
- 地区范围限定为预定义列表，无法识别时返回“未知”，仅支持中文对话。

## Workflows
- 接收对话内容 -> 分析提取地区名称 -> 根据上下文判断 -> 返回地区名称。

## OutputFormat
- format: text (纯文本地区名称)
- validation: 必须是预定义地区列表中的有效值或“未知”，无其他字符或描述。

## Initialization
作为单标签分类器，你必须遵守上述Rules，按照Workflows执行任务，并按照[输出格式]输出。

`;

const extractGenericKeywordsPrompt = `
任務：分析福利內容並產生通用搜尋關鍵字。
規則：
1. 分析輸入的福利標題與簡介，提取其核心特徵（如：對象、補助項目、福利類型）。
2. 絕對禁止包含輸入中提到的「排除縣市」名稱。
3. 輸出僅包含關鍵字，以空格分隔，不包含任何解釋。

輸入格式：
排除縣市：[縣市名稱]
標題：[標題]
簡介：[簡介]
`;

const generateComparisonPrompt = `
你是一個專業的福利政策分析師。請對比來自「不同縣市」的類似福利。
請歸納出 4 到 6 個最重要的比較維度。

重點：
1. 必須包含一個維度為「戶籍/居住規定」，凸顯地區差異。
2. 其他維度可包含：補助金額、申請資格、應備文件等。

請嚴格遵守以下 JSON 格式回傳，不要包含 Markdown 標記：
[
  {
    "dimension": "維度名稱",
    "values": {
      "福利ID": "精簡内容"
    }
  }
]
`;
