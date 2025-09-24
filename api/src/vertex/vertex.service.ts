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

  /** 呼叫 Search API（僅用於新對話的第一次查詢） */
  private async callSearchApi(userQuery: string, userId: string) {
    const accessToken = await this.getAccessToken();
    const apiEndpoint = `https://discoveryengine.googleapis.com/v1alpha/projects/${this.projectId}/locations/global/collections/${this.collectionId}/engines/${this.engineId}/servingConfigs/default_search:search`;

    // 使用 sessions/- 創建新的 session
    const data = {
      query: userQuery,
      pageSize: 10,
      queryExpansionSpec: { condition: 'AUTO' },
      spellCorrectionSpec: { mode: 'AUTO' },
      languageCode: 'zh-TW',
      userInfo: { timeZone: 'Asia/Taipei' },
      session: `projects/${this.projectId}/locations/global/collections/${this.collectionId}/engines/${this.engineId}/sessions/-`,
    };

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
        applicationCriteria:r.document?.structData?.applicationCriteria
      }));

      const enrichedWelfareCards = await Promise.all(welfareCards.map(async (card) => {
        if (card.id && userId) { // 確保有福利 ID 和用戶 ID
          try {
            // 使用 this.welfareService 呼叫服務
            const lightStatus = await this.welfareService.getWelfareLightStatus (card.id, userId);
            this.logger.debug(`card.id=${card.id}, lightStatus=${lightStatus}`);
            return { ...card, lightStatus };
          } catch (error) {
            this.logger.warn(`獲取福利 ${card.id} 的 lightStatus 失敗:`, error.message);
            return { ...card, lightStatus: undefined }; // 失敗時設置為 undefined
          }
        }
        return { ...card, lightStatus: undefined }; // 沒有 ID 或用戶 ID 時設置為 undefined
      }));
      return { welfareCards: enrichedWelfareCards, sessionName, queryId };

    } catch (error) {
      this.logger.error('Search API 錯誤:', error.response?.data || error.message);
      throw error;
    }
  }

  /** 呼叫 Search API（用於延續對話，使用現有 session） */
  private async callSearchApiWithSession(userQuery: string, sessionName: string, userId: string) {
    const accessToken = await this.getAccessToken();
    const apiEndpoint = `https://discoveryengine.googleapis.com/v1alpha/projects/${this.projectId}/locations/global/collections/${this.collectionId}/engines/${this.engineId}/servingConfigs/default_search:search`;

    // 使用現有的 sessionName
    const data = {
      query: userQuery,
      pageSize: 10,
      queryExpansionSpec: { condition: 'AUTO' },
      spellCorrectionSpec: { mode: 'AUTO' },
      languageCode: 'zh-TW',
      userInfo: { timeZone: 'Asia/Taipei' },
      session: sessionName, // 使用現有的 session
    };

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
        applicationCriteria:r.document?.structData?.applicationCriteria
      }));

      const enrichedWelfareCards = await Promise.all(
      welfareCards.map(async (card) => {
        if (card.id && userId) {
          try {
            const lightStatus = await this.welfareService.getWelfareLightStatus(
              card.id,
              userId,
            );
            return { ...card, lightStatus };
          } catch (error) {
            this.logger.warn(`獲取福利 ${card.id} 的 lightStatus 失敗:`, error.message);
            return { ...card, lightStatus: undefined };
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
                        0. 首次打招呼必須專注於介紹自己與提問獲取更多用戶訊息。
                        1. 回答內容必須嚴格基於所提供的資料庫。
                        2. 清楚說明福利的名稱和相關內容，並以專業、熱心的口吻回答。
                        3. 單次回答的總字數必須維持在 100 字以內，提供0至3筆福利，並力求簡潔明瞭。
                        4. 對於提到的每一筆福利，都必須使用 Markdown 格式附上連結。格式為：[福利標題](內部路由)。例如：如果清單中有一筆福利的內部路由是 /home/some-uuid，你就必須生成像 [育兒津貼](/home/some-uuid) 這樣的連結。
                        5. 當使用者提供的資料不明確或不夠完整時，在回應的最後持續追問更多資訊，例如「請問您是哪個縣市的居民呢？」或「您方便提供更具體的資料嗎？」，以幫助使用者找到適合自己的福利。
                        6. 如果資料庫中找不到使用者提問的資訊，請禮貌地告知使用者目前無法提供相關資訊，並避免編造或猜測答案。`,
        },
        modelSpec: { modelVersion: 'stable' },
      },
    };

    // 添加 session 和 queryId（如果存在）
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

  /** 主函式：AI 答案 + 福利資訊，支援新對話與延續對話 */
  async getAiAnswer(userQuery: string, userId: string, conversationId?: number) {
    let newConversationId: number;
    let sessionName: string | undefined = undefined;
    let queryId: string | undefined = undefined;
    let welfareCards: any[] = [];

    this.logger.log('--- getAiAnswer 啟動 ---');
    this.logger.log('當前 conversationId:', conversationId);

    const isNewConversation = !conversationId;

    if (isNewConversation) {
      // 🆕 新對話流程
      this.logger.log('🆕 開始新對話流程');
      
      const newConversation = await this.conversationService.createConversation(userId, '未命名對話');
      newConversationId = newConversation.id;

      // 先呼叫 Search API 生成 sessionName
      const searchResult = await this.callSearchApi(userQuery,userId);
      sessionName = searchResult.sessionName;
      queryId = searchResult.queryId;
      welfareCards = searchResult.welfareCards;

      this.logger.log(`新對話 Search API 完成: sessionName=${sessionName}, queryId=${queryId}`);
    } else {
      // 🔄 延續對話流程
      this.logger.log('🔄 延續對話流程');
      newConversationId = conversationId;

      const lastAiMessage = await this.conversationService.getLastAiMessage(newConversationId);
      sessionName = lastAiMessage?.metadata?.sessionName || lastAiMessage?.metadata?.session;

      if (!sessionName) {
        // ⚠️ 找不到 sessionName → 自動回退到新對話
        this.logger.warn(`延續對話找不到有效 sessionName，將自動建立新 session`);

        const newConversation = await this.conversationService.createConversation(userId, '未命名對話');
        newConversationId = newConversation.id;

        const searchResult = await this.callSearchApi(userQuery, userId);
        sessionName = searchResult.sessionName;
        queryId = searchResult.queryId;
        welfareCards = searchResult.welfareCards;

        this.logger.log(`自動新對話 Search API 完成: sessionName=${sessionName}, queryId=${queryId}`);
      } else {
        // 找到 sessionName → 延續對話查詢福利
        try {
          const searchResult = await this.callSearchApiWithSession(userQuery, sessionName,userId);
          welfareCards = searchResult.welfareCards;
          this.logger.log(`延續對話搜尋到 ${welfareCards.length} 筆福利資料`);
        } catch (error) {
          this.logger.warn('延續對話時搜尋福利資料失敗，但不影響對話:', error.message);
        }
      }
    }

    // 2️⃣ 調用 Answer API
    const { answerText, relatedQuestions } = await this.callAnswerApi(userQuery, sessionName, queryId);
    this.logger.log(`Answer API 完成，回應長度: ${answerText.length} 字元`);

    // 3️⃣ 儲存問答記錄
    const metadata = {
      welfareCards,
      sessionName,
      queryId,
      relatedQuestions,
      isNewConversation: !conversationId || !sessionName,
    };

    await this.conversationService.addMessage(newConversationId, 'user', userQuery);
    await this.conversationService.addMessage(newConversationId, 'ai', answerText, metadata);

    this.logger.log('--- getAiAnswer 結束 ---');

    return {
      conversationId: newConversationId,
      answer: answerText,
      welfareCards,
      relatedQuestions,
      sessionName,
      queryId,
      isNewConversation: !conversationId || !sessionName,
    };
  }
}