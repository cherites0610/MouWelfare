import { Injectable } from '@nestjs/common';
import { SearchServiceClient } from '@google-cloud/discoveryengine';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { google } from 'googleapis';
import { ConversationService } from './conversation.service.js';

@Injectable()
export class VertexService {
    private conversationHistory: { user: string; ai: string }[] = [];
    private searchClient: SearchServiceClient;
    private readonly collectionId: string;
    private readonly projectId: string;
    private readonly engineId: string;
    private readonly credentials: any;


    constructor(
        private readonly configService: ConfigService,
        private readonly conversationService: ConversationService,
    ) {
        const keyFileBase64 = this.configService.get<string>('GOOGLE_APPLICATION_CREDENTIALS_BASE64');

        if (!keyFileBase64) {
        throw new Error('GCP credentials are not configured.');
        }

        try {
        // 解碼 Base64 字串並解析為 JSON 物件
        const decodedBuffer = Buffer.from(keyFileBase64, 'base64');
        const jsonString = decodedBuffer.toString('utf-8');
        this.credentials = JSON.parse(jsonString);

        } catch (error) {
        throw new Error('解碼或解析 GCP 憑證時發生錯誤: ' + error.message);
        }

        this.projectId = this.configService.get<string>('PROJECT_ID') ?? "";
        this.collectionId = this.configService.get<string>('COLLECTION_ID') ?? "";
        this.engineId = this.configService.get<string>('ENGINE_ID') ?? "";

        // 使用解碼後的 JSON 物件作為憑證
        this.searchClient = new SearchServiceClient({
        credentials: this.credentials,
        });
    }

    private async getAccessToken(): Promise<string> {
        const auth = new google.auth.GoogleAuth({
        credentials: this.credentials,
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
        });

        const client = await auth.getClient();
        const tokenResponse = await client.getAccessToken();
        if (!tokenResponse || !tokenResponse.token) {
        throw new Error('無法取得 access token');
        }
        return tokenResponse.token;
    }

    
    private async callAnswerApi(userQuery: string, contextText: string, welfareInfoText: string) {
        // const historyText = this.conversationHistory
        // .map(h => `User: ${h.user}\nAI: ${h.ai}`)
        // .join('\n');

        const combinedPrompt = `
        這是之前的對話：
        ${contextText}

        這是為您找到的相關福利清單，請根據這些資料來回答：
        ${welfareInfoText}

        這是我的新問題：${userQuery}
      `;

        const accessToken = await this.getAccessToken();
        const apiEndpoint = `https://discoveryengine.googleapis.com/v1alpha/projects/${this.projectId}/locations/global/collections/${this.collectionId}/engines/${this.engineId}/servingConfigs/default_search:answer`;

        const data = {
        query: {
                text: combinedPrompt,
                queryId: ''
            },
            session: '',
            relatedQuestionsSpec: {
                enable: true
            },
            answerGenerationSpec: {
                ignoreAdversarialQuery: false,
                ignoreNonAnswerSeekingQuery: false,
                ignoreLowRelevantContent: true,
                multimodalSpec: {},
                includeCitations: true,
                promptSpec: {
                    preamble: `你是一位熱心且專業的福利查詢小幫手，名字是「阿哞」。
                        你的任務是根據所提供的資料庫內容，為使用者提供政府福利相關的資訊。

                        回答原則：
                        0. 首次打招呼必須專注於介紹自己與提問獲取更多用戶訊息。 
                        1. 回答內容必須嚴格基於所提供的資料庫。
                        2. 清楚說明福利的名稱和相關內容，並以專業、熱心的口吻回答。
                        3. 單次回答的總字數必須維持在 100 字以內，提供0至3筆福利，並力求簡潔明瞭。
                        4. 對於提到的每一筆福利，都必須使用 Markdown 格式附上連結。格式為：[福利標題](內部路由)。例如：如果清單中有一筆福利的內部路由是 /home/some-uuid，你就必須生成像 [育兒津貼](/home/some-uuid) 這樣的連結。
                        5. 當使用者提供的資料不明確或不夠完整時，在回應的最後持續追問更多資訊，例如「請問您是哪個縣市的居民呢？」或「您方便提供更具體的資料嗎？」，以幫助使用者找到適合自己的福利。
                        6. 如果資料庫中找不到使用者提問的資訊，請禮貌地告知使用者目前無法提供相關資訊，並避免編造或猜測答案。`
                },
                modelSpec: {
                    modelVersion: 'stable'
                },
            },
            queryUnderstandingSpec: {
                queryClassificationSpec: {
                    types: [
                        "NON_ANSWER_SEEKING_QUERY",
                        "NON_ANSWER_SEEKING_QUERY_V2"
                    ]
                }
            }
        };

        const response = await axios.post(apiEndpoint, data, {
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        });

        const answerData = response.data.answer;
        const answerText = answerData?.answerText || '無法生成答案';

        return { answerText };
    }

    /** 呼叫 Search API (福利資訊) */
    private async callSearchApi(userQuery: string) {
        const accessToken = await this.getAccessToken();
        const apiEndpoint = `https://discoveryengine.googleapis.com/v1alpha/projects/${this.projectId}/locations/global/collections/${this.collectionId}/engines/${this.engineId}/servingConfigs/default_search:search`;

        const data = {
            query: userQuery,
            pageSize: 10,
            queryExpansionSpec: { condition: "AUTO" },
            spellCorrectionSpec: { mode: "AUTO" },
            languageCode: "zh-TW",
            userInfo: { timeZone: "Asia/Taipei" }
        };

        const response = await axios.post(apiEndpoint, data, {
            headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
        });

        const results = response.data.results || [];
        return results.map(r => ({
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


    /** 主函式 回傳 AI 答案 + 福利資訊 */
   async getAiAnswer(userQuery: string, userId: string, conversationId?: number) { 
  // 步驟 1: 確保我們有一個有效的 conversationId
  if (!conversationId) {
    const newConversation = await this.conversationService.createConversation(userId, '未命名對話');
    conversationId = newConversation.id;
  }

  // 步驟 2: 從資料庫中獲取歷史紀錄
  const historyFromDb = await this.conversationService.getRecentMessages(conversationId, 5);

  // 步驟 3: 將歷史紀錄轉換成純文字的上下文
  const contextText = historyFromDb
    .map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${m.content}`)
    .reverse()
    .join('\n');

  // 步驟 4: 呼叫 Search API，獲取相關的福利卡片
  const welfareCards = await this.callSearchApi(userQuery);

  // 步驟 5: 將福利卡片轉換為包含【完整路由】的文字資訊，供 AI 參考
  const welfareInfoText = welfareCards
    .map(card => 
      `福利標題: ${card.title}, 摘要: ${card.summary}, 內部路由: /home/${card.id}`
    )
    .join('\n\n'); 

  // 步驟 6: 將所有準備好的資訊傳遞給 AI，獲取最終的文字回答
  const { answerText } = await this.callAnswerApi(userQuery, contextText, welfareInfoText);

  // 步驟 7: 將新的問答儲存到資料庫
  await this.conversationService.addMessage(conversationId, 'user', userQuery);
  await this.conversationService.addMessage(conversationId, 'ai', answerText, { welfareCards });

  // 步驟 8: 將結果返回給前端
  return { conversationId, answer: answerText, welfareCards };
}

}