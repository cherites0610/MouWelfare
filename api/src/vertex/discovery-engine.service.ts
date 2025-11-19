// src/discovery-engine/discovery-engine.client.ts
import { Injectable, Inject, Logger } from "@nestjs/common";
import { ConfigType } from "@nestjs/config";
import axios, { AxiosInstance } from "axios";
import { google } from "googleapis";
import googleConfig, { GoogleConfig } from "../config/google.config.js";
import { UserProfile } from "./dto/vertex.interfaces.js";

// 搜尋 API 的請求參數
interface SearchParams {
  query: string;
  userId: string;
  sessionName?: string;
  userProfile?: UserProfile;
}

// 搜尋 API 的回應
interface SearchResponse {
  results: any[];
  sessionName: string;
  queryId: string;
}

// 回答 API 的請求參數
interface AnswerParams {
  userQuery: string;
  sessionName?: string;
  queryId?: string;
}

// 回答 API 的回應
interface AnswerResponse {
  answerText: string;
  relatedQuestions: string[];
}

@Injectable()
export class DiscoveryEngineClient {
  private readonly logger = new Logger(DiscoveryEngineClient.name);
  private readonly apiBaseUrl =
    "https://discoveryengine.googleapis.com/v1alpha";
  private readonly searchEndpoint: string;
  private readonly answerEndpoint: string;
  private readonly defaultSession: string;

  constructor(
    @Inject(googleConfig.KEY)
    private readonly config: ConfigType<typeof googleConfig>
  ) {
    const location = "global";
    const commonPath = `projects/${this.config.projectId}/locations/${location}/collections/${this.config.collectionId}/engines/${this.config.engineId}`;

    this.searchEndpoint = `${this.apiBaseUrl}/${commonPath}/servingConfigs/default_search:search`;
    this.answerEndpoint = `${this.apiBaseUrl}/${commonPath}/servingConfigs/default_search:answer`;
    this.defaultSession = `${commonPath}/sessions/-`;
  }

  /** 獲取 GCP Access Token */
  private async getAccessToken(): Promise<string> {
    const auth = new google.auth.GoogleAuth({
      credentials: this.config.credentials,
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });
    const client = await auth.getClient();
    const tokenResponse = await client.getAccessToken();
    if (!tokenResponse || !tokenResponse.token) {
      throw new Error("無法取得 access token");
    }
    return tokenResponse.token;
  }

  /**
   * 建立個人化查詢字串
   */
  private buildPersonalizedQuery(query: string, profile: UserProfile): string {
    const profileParts = [
      `年齡：${profile.age ?? "未知"}`,
      `地區：${profile.city ?? "未知"}`,
      `身份：${profile.identity ?? "未指定"}`,
      profile.income ? `收入：${profile.income}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    return `以下是使用者的個人資料（請根據此提供更精準的建議）：
${profileParts}

問題：${query}`;
  }

  /**
   * 呼叫 Search API (已整合新/舊 session)
   */
  async search(params: SearchParams): Promise<SearchResponse> {
    const { query, userId, sessionName, userProfile } = params;
    const accessToken = await this.getAccessToken();

    // 🧠 判斷是否為新對話且需要個人化
    const isNewPersonalized = !sessionName && userProfile;
    const queryText = isNewPersonalized
      ? this.buildPersonalizedQuery(query, userProfile)
      : query;

    const data = {
      query: queryText,
      pageSize: 10,
      queryExpansionSpec: { condition: "AUTO" },
      spellCorrectionSpec: { mode: "AUTO" },
      languageCode: "zh-TW",
      userInfo: { timeZone: "Asia/Taipei", userId },
      session: sessionName || this.defaultSession, // 傳入 session 或使用 '-'
    };

    try {
      const response = await axios.post(this.searchEndpoint, data, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      const results = response.data.results || [];
      const sessionInfo = response.data.sessionInfo || {};
      const newSessionName = sessionInfo.name;
      const queryId = sessionInfo.queryId;

      if (!sessionName && (!newSessionName || !queryId)) {
        this.logger.error(
          "Search API (新對話) 未返回完整的 sessionInfo",
          response.data
        );
        throw new Error("Search API 未返回完整的 sessionInfo");
      }

      return {
        results,
        sessionName: newSessionName || sessionName, // 回傳新的或舊的 session
        queryId,
      };
    } catch (error) {
      this.logger.error(
        "Search API 錯誤:",
        error.response?.data || error.message
      );
      throw error;
    }
  }

  /**
   * 呼叫 Answer API
   */
  async answer(params: AnswerParams): Promise<AnswerResponse> {
    const { userQuery, sessionName, queryId } = params;
    const accessToken = await this.getAccessToken();

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
        modelSpec: { modelVersion: "stable" },
      },
    };

    if (sessionName) data.session = sessionName;
    if (queryId) data.query.queryId = queryId;

    try {
      const response = await axios.post(this.answerEndpoint, data, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      const answerText = response.data.answer?.answerText || "無法生成答案";
      const relatedQuestions = response.data.answer?.relatedQuestions || [];

      return { answerText, relatedQuestions };
    } catch (error) {
      this.logger.error(
        "Answer API 錯誤:",
        error.response?.data || error.message
      );
      throw error;
    }
  }
}
