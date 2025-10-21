import { SearchServiceClient } from '@google-cloud/discoveryengine';
import { ConfigService } from '@nestjs/config';
import { Injectable, Logger } from "@nestjs/common";
import axios from "axios";
import { google } from 'googleapis';
import { ConversationService } from './conversation.service.js';
import { WelfareService } from '../welfare/welfare.service.js';

@Injectable()
export class VertexService {
  private searchClient: SearchServiceClient;
  private readonly collectionId: string;
  private readonly projectId: string;
  private readonly engineId: string;
  private readonly credentials: any;
  private readonly logger = new Logger(VertexService.name);

  // 🆕 台灣縣市列表
  private readonly TAIWAN_LOCATIONS = [
    '臺北市', '台北市', '新北市', '桃園市', '臺中市', '台中市', '臺南市', '台南市', '高雄市',
    '基隆市', '新竹市', '嘉義市', '新竹縣', '苗栗縣', '彰化縣', '南投縣', '雲林縣',
    '嘉義縣', '屏東縣', '宜蘭縣', '花蓮縣', '臺東縣', '台東縣', '澎湖縣', '金門縣', '連江縣'
  ];

  // 🆕 福利類別列表（根據你的實際資料調整）
  private readonly WELFARE_CATEGORIES = [
    '社會救助福利', '育兒津貼', '婦女與幼兒福利', '老人福利', '身心障礙福利',
    '就業輔助', '教育補助', '住宅補助', '醫療補助', '生育補助', '托育補助'
  ];

  constructor(
    private readonly configService: ConfigService,
    private readonly conversationService: ConversationService,
    private readonly welfareService: WelfareService,
  ) {
    const keyFileBase64 = this.configService.get<string>('GOOGLE_APPLICATION_CREDENTIALS_BASE64');

    if (!keyFileBase64) throw new Error('GCP credentials are not configured.');

    try {
      const decodedBuffer = Buffer.from(keyFileBase64, 'base64');
      this.credentials = JSON.parse(decodedBuffer.toString('utf-8'));
    } catch (error) {
      throw new Error('解碼或解析 GCP 憑證時發生錯誤: ' + error.message);
    }

    this.projectId = this.configService.get<string>('PROJECT_ID') ?? '';
    this.collectionId = this.configService.get<string>('COLLECTION_ID') ?? '';
    this.engineId = this.configService.get<string>('ENGINE_ID') ?? '';

    this.searchClient = new SearchServiceClient({ credentials: this.credentials });
  }

  private async getAccessToken(): Promise<string> {
    const auth = new google.auth.GoogleAuth({
      credentials: this.credentials,
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
    const client = await auth.getClient();
    const tokenResponse = await client.getAccessToken();
    if (!tokenResponse || !tokenResponse.token) throw new Error('無法取得 access token');
    return tokenResponse.token;
  }

  /**
   * 從使用者問題中提取地區和類別
   * 使用簡單的關鍵字匹配方法
   */
  private extractLocationAndCategories(userQuery: string): { 
    location: string | undefined; 
    categories: string[] 
  } {
    let location: string | undefined = undefined;
    const categories: string[] = [];

    // 提取地區
    for (const loc of this.TAIWAN_LOCATIONS) {
      if (userQuery.includes(loc)) {
        location = loc;
        // 標準化台北、台中、台南、台東的寫法
        if (loc === '台北市') location = '臺北市';
        if (loc === '台中市') location = '臺中市';
        if (loc === '台南市') location = '臺南市';
        if (loc === '台東縣') location = '臺東縣';
        break;
      }
    }

    // 提取類別
    for (const category of this.WELFARE_CATEGORIES) {
      if (userQuery.includes(category)) {
        categories.push(category);
      }
    }

    // 特殊關鍵字映射
    const keywordMapping: Record<string, string[]> = {
      '育兒': ['育兒津貼', '婦女與幼兒福利', '托育補助'],
      '幼兒': ['婦女與幼兒福利', '育兒津貼'],
      '小孩': ['育兒津貼', '婦女與幼兒福利'],
      '孩子': ['育兒津貼', '婦女與幼兒福利'],
      '老人': ['老人福利'],
      '長者': ['老人福利'],
      '身障': ['身心障礙福利'],
      '殘障': ['身心障礙福利'],
      '就業': ['就業輔助'],
      '工作': ['就業輔助'],
      '教育': ['教育補助'],
      '學費': ['教育補助'],
      '住宅': ['住宅補助'],
      '租屋': ['住宅補助'],
      '醫療': ['醫療補助'],
      '看病': ['醫療補助'],
      '生育': ['生育補助', '婦女與幼兒福利'],
    };

    for (const [keyword, cats] of Object.entries(keywordMapping)) {
      if (userQuery.includes(keyword)) {
        cats.forEach(cat => {
          if (!categories.includes(cat)) {
            categories.push(cat);
          }
        });
      }
    }

    this.logger.log(`🔍 從問題「${userQuery}」中提取到:`);
    if (location) this.logger.log(`   ‣ 地區: ${location}`);
    if (categories.length > 0) this.logger.log(`   ‣ 類別: ${categories.join(', ')}`);

    return { location, categories };
  }

  /**
   * 使用 AI 提取地區和類別（更精準的方法）
   * 可選：如果簡單關鍵字匹配不夠精準，可以使用這個方法
   */
  private async extractWithAI(userQuery: string): Promise<{ 
    location: string | undefined; 
    categories: string[] 
  }> {
    const accessToken = await this.getAccessToken();
    const apiEndpoint = `https://discoveryengine.googleapis.com/v1alpha/projects/${this.projectId}/locations/global/collections/${this.collectionId}/engines/${this.engineId}/servingConfigs/default_search:answer`;

    const prompt = `請從以下使用者問題中提取「地區」和「福利類別」，以 JSON 格式回答：

使用者問題：「${userQuery}」

可能的地區：${this.TAIWAN_LOCATIONS.join('、')}
可能的類別：${this.WELFARE_CATEGORIES.join('、')}

請回答 JSON 格式：
{
  "location": "提取到的縣市（如果沒有則為 null）",
  "categories": ["提取到的類別陣列"]
}`;

    const data = {
      query: { text: prompt },
      answerGenerationSpec: {
        ignoreAdversarialQuery: false,
        ignoreNonAnswerSeekingQuery: false,
        modelSpec: { modelVersion: 'stable' },
      },
    };

    try {
      const response = await axios.post(apiEndpoint, data, {
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      });

      const answerText = response.data.answer?.answerText || '{}';
      const extracted = JSON.parse(answerText);
      
      return {
        location: extracted.location || undefined,
        categories: extracted.categories || []
      };
    } catch (error) {
      this.logger.warn('AI 提取失敗，使用關鍵字匹配:', error.message);
      return this.extractLocationAndCategories(userQuery);
    }
  }

  /**
   * 建立 boostSpec
   * 修正：categories 是陣列，需使用 ANY 語法
   * 修正：boost 值必須在 [-1, 1] 之間
   */
  private createBoostSpec(userLocation: string | undefined, preferredCategories: string[] | undefined) {
    const conditionBoostSpecs: any[] = [];

    if (userLocation) {
      conditionBoostSpecs.push({
        condition: `location: ANY("${userLocation}")`,
        boost: 0.8  // 強力提升地區相關福利（範圍: -1 到 1）
      });
    }

    if (preferredCategories && preferredCategories.length > 0) {
      preferredCategories.forEach((category: string) => {
        conditionBoostSpecs.push({
          condition: `categories: ANY("${category}")`,
          boost: 0.5  // 適度提升類別相關福利（範圍: -1 到 1）
        });
      });
    }

    return conditionBoostSpecs.length > 0 ? { conditionBoostSpecs } : undefined;
  }

  /** 呼叫 Search API（僅用於新對話的第一次查詢） */
  private async callSearchApi(
    userQuery: string, 
    userId: string,
    fullContextText: string,
    userLocation: string | undefined,
    preferredCategories: string[] | undefined
  ) {
    const accessToken = await this.getAccessToken();
    const apiEndpoint = `https://discoveryengine.googleapis.com/v1alpha/projects/${this.projectId}/locations/global/collections/${this.collectionId}/engines/${this.engineId}/servingConfigs/default_search:search`;

    const boostSpec = this.createBoostSpec(userLocation, preferredCategories);

    const data: any = {
      query: userQuery,
      pageSize: 10,
      queryExpansionSpec: { condition: 'AUTO' },
      spellCorrectionSpec: { mode: 'AUTO' },
      languageCode: 'zh-TW',
      userInfo: { timeZone: 'Asia/Taipei' },
      session: `projects/${this.projectId}/locations/global/collections/${this.collectionId}/engines/${this.engineId}/sessions/-`,
    };

    if (boostSpec) {
      data.boostSpec = boostSpec;
      this.logger.debug('使用 boostSpec:', JSON.stringify(boostSpec, null, 2));
    }

    this.logger.debug('Search API 請求 (新對話):', JSON.stringify(data, null, 2));

    try {
      const response = await axios.post(apiEndpoint, data, {
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      });

      this.logger.debug('Search API 完整回應:', JSON.stringify(response.data, null, 2));

      const results = response.data.results || [];
      const sessionInfo = response.data.sessionInfo || {};
      const sessionName = sessionInfo.name || undefined;
      const queryId = sessionInfo.queryId || undefined;

      this.logger.log(`Search API (新對話) 結果: ${results.length} 個, sessionName: ${sessionName}, queryId: ${queryId}`);

      if (!sessionName || !queryId) {
        throw new Error('Search API 未返回完整的 sessionInfo');
      }

      const welfareCards = results.map((r) => ({
        id: r.document?.structData?.id || r.document?.id,
        title: r.document?.structData?.title || r.document?.displayName,
        summary: r.document?.structData?.summary || r.document?.snippet,
        detail: r.document?.structData?.detail,
        forward: r.document?.structData?.forward,
        link: r.document?.structData?.link,
        location: r.document?.structData?.location,
        publicationDate: r.document?.structData?.publicationDate,
        categories: r.document?.structData?.categories,
        applicationCriteria: r.document?.structData?.applicationCriteria
      }));

      const enrichedWelfareCards = await Promise.all(welfareCards.map(async (card) => {
        if (card.id) { 
          try {
            const lightResult = await this.welfareService.getWelfareLightStatusFromText(
              card.id,
              fullContextText,
            );
            return { 
              ...card, 
              lightStatus: lightResult.status,
              lightReason: lightResult.reasons 
            };
          } catch (error) {
            this.logger.error('查詢資格錯誤:', error.message);
            return { ...card, lightStatus: undefined, lightReason: ['查詢資格時發生錯誤'] };
          }
        }
        return { ...card, lightStatus: undefined };
      }));

      return { welfareCards: enrichedWelfareCards, sessionName, queryId };

    } catch (error) {
      this.logger.error('Search API 錯誤:', error.response?.data || error.message);
      throw error;
    }
  }

  /** 呼叫 Search API（用於延續對話，使用現有 session） */
  private async callSearchApiWithSession(
    userQuery: string, 
    sessionName: string, 
    userId: string, 
    fullContextText: string,
    userLocation: string | undefined,
    preferredCategories: string[] | undefined
  ) {
    const accessToken = await this.getAccessToken();
    const apiEndpoint = `https://discoveryengine.googleapis.com/v1alpha/projects/${this.projectId}/locations/global/collections/${this.collectionId}/engines/${this.engineId}/servingConfigs/default_search:search`;

    const boostSpec = this.createBoostSpec(userLocation, preferredCategories);

    const data: any = {
      query: userQuery,
      pageSize: 10,
      queryExpansionSpec: { condition: 'AUTO' },
      spellCorrectionSpec: { mode: 'AUTO' },
      languageCode: 'zh-TW',
      userInfo: { timeZone: 'Asia/Taipei' },
      session: sessionName,
    };

    if (boostSpec) {
      data.boostSpec = boostSpec;
      this.logger.debug('使用 boostSpec:', JSON.stringify(boostSpec, null, 2));
    }

    this.logger.debug('Search API 請求 (延續對話):', JSON.stringify(data, null, 2));

    try {
      const response = await axios.post(apiEndpoint, data, {
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      });

      this.logger.debug('Search API 回應 (延續對話):', JSON.stringify(response.data, null, 2));

      const results = response.data.results || [];
      this.logger.log(`Search API (延續對話) 結果: ${results.length} 個福利`);

      const welfareCards = results.map((r) => ({
        id: r.document?.structData?.id || r.document?.id,
        title: r.document?.structData?.title || r.document?.displayName,
        summary: r.document?.structData?.summary || r.document?.snippet,
        detail: r.document?.structData?.detail,
        forward: r.document?.structData?.forward,
        link: r.document?.structData?.link,
        location: r.document?.structData?.location,
        publicationDate: r.document?.structData?.publicationDate,
        categories: r.document?.structData?.categories,
        applicationCriteria: r.document?.structData?.applicationCriteria
      }));

      const enrichedWelfareCards = await Promise.all(
        welfareCards.map(async (card) => {
          if (card.id) {
            try {
              const lightResult = await this.welfareService.getWelfareLightStatusFromText(
                card.id,
                fullContextText,
              );
              return { 
                ...card, 
                lightStatus: lightResult.status,
                lightReason: lightResult.reasons
              };
            } catch (error) {
              this.logger.warn(`獲取福利 ${card.id} 的 lightStatus 失敗:`, error.message);
              return { ...card, lightStatus: undefined, lightReason: ['查詢資格時發生錯誤'] };
            }
          }
          return { ...card, lightStatus: undefined };
        }),
      );

      return { welfareCards: enrichedWelfareCards };

    } catch (error) {
      this.logger.error('Search API (延續對話) 錯誤:', error.response?.data || error.message);
      throw error;
    }
  }

  /** 呼叫 Answer API */
  private async callAnswerApi(userQuery: string, sessionName?: string, queryId?: string) {
    const accessToken = await this.getAccessToken();
    const apiEndpoint = `https://discoveryengine.googleapis.com/v1alpha/projects/${this.projectId}/locations/global/collections/${this.collectionId}/engines/${this.engineId}/servingConfigs/default_search:answer`;

    const data: any = {
      query: { text: userQuery },
      relatedQuestionsSpec: { enable: true },
      answerGenerationSpec: {
        ignoreAdversarialQuery: false,
        ignoreNonAnswerSeekingQuery: false,
        ignoreLowRelevantContent: true,
        multimodalSpec: {},
        includeCitations: true,
        promptSpec: {
          preamble: `你是一位熱心且專業的福利查詢小幫手，名字是「阿哞」。你的任務是根據所提供的資料庫內容，為使用者提供政府福利相關的資訊。

                        回答原則：
                        0. 首次對話開啟必須專注於介紹自己與提問獲取更多用戶訊息。
                        1. 回答內容必須嚴格基於所提供的資料庫，清楚說明福利的名稱和相關內容，並以專業、熱心的口吻回答。
                        2. 單次回答的總字數必須維持在 150 字以內，提供0至3筆福利，並力求簡潔明瞭。
                        3. 對於提到的每一筆福利，利用福利id使用 Markdown 格式附上連結。格式為：[福利標題](/home/some-uuid)。例如：必須生成像[育兒津貼](/home/some-uuid)這樣的連結。
                        4. 當使用者提供的資料不明確或不夠完整時，在回應的最後持續追問更多資訊或給出2至3個選項，例如「請問您是哪個縣市的居民呢？」或「您方便提供更具體的資料嗎？如:...」，以幫助使用者找到適合自己的福利。
                        5. 如果資料庫中確定找不到使用者提問的資訊，請禮貌地告知使用者目前無法提供相關資訊，就不需要追問了。`,
        },
        modelSpec: { modelVersion: 'stable' },
      },
    };

    if (sessionName) {
      data.session = sessionName;
    }
    if (queryId) {
      data.query.queryId = queryId;
    }

    const isNewConversation = !sessionName;
    this.logger.debug(`Answer API 請求 (${isNewConversation ? '新對話' : '延續對話'}):`, JSON.stringify(data, null, 2));

    try {
      const response = await axios.post(apiEndpoint, data, {
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      });

      this.logger.debug('Answer API 回應:', JSON.stringify(response.data, null, 2));

      const answerText = response.data.answer?.answerText || '無法生成答案';
      const relatedQuestions = response.data.answer?.relatedQuestions || [];

      return { answerText, relatedQuestions };

    } catch (error) {
      this.logger.error('Answer API 錯誤:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * 嚴格過濾福利卡片
   * 只保留完全符合 location 和 categories 條件的卡片
   */
  private strictFilterWelfareCards(
    cards: any[], 
    targetLocation: string | undefined, 
    targetCategories: string[] | undefined
  ): any[] {
    if (!targetLocation && (!targetCategories || targetCategories.length === 0)) {
      // 沒有任何篩選條件，返回所有卡片
      return cards;
    }

    return cards.filter(card => {
      let locationMatch = true;
      let categoryMatch = true;

      // 嚴格匹配地區
      if (targetLocation) {
        locationMatch = card.location === targetLocation;
      }

      // 嚴格匹配類別（categories 必須包含至少一個目標類別）
      if (targetCategories && targetCategories.length > 0) {
        if (!Array.isArray(card.categories) || card.categories.length === 0) {
          categoryMatch = false;
        } else {
          // 檢查卡片的 categories 是否包含任一目標類別
          categoryMatch = targetCategories.some((targetCat: string) => 
            card.categories.includes(targetCat)
          );
        }
      }

      // 必須同時滿足地區和類別條件
      return locationMatch && categoryMatch;
    });
  }

  /** 
   * 主函式：AI 答案 + 福利資訊，支援新對話與延續對話
   * 自動從使用者問題中提取地區和類別
   * 嚴格過濾結果，無符合資料時明確告知
   */
    async getAiAnswer(
    userQuery: string, 
    userId: string, 
    conversationId?: number
  ) {
    let newConversationId: number;
    let sessionName: string | undefined = undefined;
    let queryId: string | undefined = undefined;
    let welfareCards: any[] = [];
    let fullContextText: string = userQuery;

    this.logger.log('--- getAiAnswer 啟動 ---');
    this.logger.log('當前 conversationId:', conversationId);

    // 1️⃣ 提取地區和類別
    const { location, categories } = this.extractLocationAndCategories(userQuery);

    const isNewConversation = !conversationId;

    if (isNewConversation) {
      // 2️⃣ 新對話
      this.logger.log('🆕 開始新對話流程');
      const newConversation = await this.conversationService.createConversation(userId, '未命名對話');
      newConversationId = newConversation.id;

      const searchResult = await this.callSearchApi(
        userQuery, 
        userId, 
        fullContextText,
        location,
        categories
      );
      sessionName = searchResult.sessionName;
      queryId = searchResult.queryId;
      welfareCards = searchResult.welfareCards;

    } else {
      // 3️⃣ 延續對話
      this.logger.log('🔄 延續對話流程');
      newConversationId = conversationId;

      const lastAiMessage = await this.conversationService.getLastAiMessage(newConversationId);
      sessionName = lastAiMessage?.metadata?.sessionName || lastAiMessage?.metadata?.session;

      const historyText = await this.conversationService.getHistoryAsText(newConversationId);
      fullContextText = `${historyText}\n${userQuery}`;

      if (!sessionName) {
        this.logger.warn(`延續對話找不到有效 sessionName，將自動建立新 session`);
        const newConversation = await this.conversationService.createConversation(userId, '未命名對話');
        newConversationId = newConversation.id;

        const searchResult = await this.callSearchApi(
          userQuery, 
          userId, 
          fullContextText,
          location,
          categories
        );
        sessionName = searchResult.sessionName;
        queryId = searchResult.queryId;
        welfareCards = searchResult.welfareCards;
      } else {
        try {
          const searchResult = await this.callSearchApiWithSession(
            userQuery, 
            sessionName, 
            userId, 
            fullContextText,
            location,
            categories
          );
          welfareCards = searchResult.welfareCards;
        } catch (error) {
          this.logger.warn('延續對話時搜尋福利資料失敗，但不影響對話:', error.message);
        }
      }
    }

    // 4️⃣ 嚴格過濾福利卡片
    const originalCount = welfareCards.length;
    const filteredWelfareCards = this.strictFilterWelfareCards(welfareCards, location, categories);
    this.logger.log(`嚴格過濾: ${originalCount} → ${filteredWelfareCards.length} 筆`);

    // 5️⃣ 生成 AI 回覆
    let finalAnswerText: string;
    let finalRelatedQuestions: string[] = [];
    let noResultsFound = false;

    if (filteredWelfareCards.length === 0 && (location || (categories && categories.length > 0))) {
      // 無符合結果 → 提示使用者
      noResultsFound = true;
      const conditionText: string[] = [];
      if (location) conditionText.push(`地區「${location}」`);
      if (categories && categories.length > 0) conditionText.push(`類別「${categories.join('、')}」`);
      
      finalAnswerText = `很抱歉，目前資料庫中沒有符合 ${conditionText.join(' 與 ')} 的福利資料。\n\n建議您可以：\n1. 嘗試搜尋其他縣市或類別\n2. 放寬搜尋條件\n3. 聯繫當地社會局了解更多資訊`;
    } else {
      // 有符合卡片 → 注入卡片資訊給 AI
      const cardSummaries = filteredWelfareCards
        .slice(0, 3)
        .map(c => `[${c.title}](${c.link}) - ${c.summary}`)
        .join('\n');

      const aiPrompt = `
      你是一位熱心且專業的福利查詢小幫手「阿哞」。

      使用者問題：「${userQuery}」

      目前符合條件的福利：
      ${cardSummaries}

      請生成簡短回答（150 字以內），內容必須和上述福利對應。
      若使用者可能需要更多資訊，可在回覆最後追問「您是否想了解更多福利？」。
      `;

      const answerResult = await this.callAnswerApi(aiPrompt, sessionName, queryId);
      finalAnswerText = answerResult.answerText;
      finalRelatedQuestions = answerResult.relatedQuestions;
    }

    // 6️⃣ 記錄對話
    const metadata = {
      welfareCards: filteredWelfareCards,
      sessionName,
      queryId,
      relatedQuestions: finalRelatedQuestions,
      isNewConversation: isNewConversation,
      extractedLocation: location,
      extractedCategories: categories,
      noResultsFound,
      originalResultCount: originalCount,
      filteredResultCount: filteredWelfareCards.length,
    };

    await this.conversationService.addMessage(newConversationId, 'user', userQuery);
    await this.conversationService.addMessage(newConversationId, 'ai', finalAnswerText, metadata);

    this.logger.log('--- getAiAnswer 結束 ---');

    return {
      conversationId: newConversationId,
      answer: finalAnswerText,
      welfareCards: filteredWelfareCards,
      relatedQuestions: finalRelatedQuestions,
      sessionName,
      queryId,
      isNewConversation: isNewConversation,
      extractedLocation: location,
      extractedCategories: categories,
      noResultsFound,
    };
  }
}