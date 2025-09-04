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
    private readonly keyFile: string;


    constructor(
        private readonly configService: ConfigService,
        private readonly conversationService: ConversationService,
    ) {
        const keyFile = this.configService.get<string>('GOOGLE_APPLICATION_CREDENTIALS');
        if (!keyFile) {
            throw new Error('GCP credentials are not configured.');
        }
        this.keyFile = keyFile;

        this.projectId = this.configService.get<string>('PROJECT_ID') ?? "";
        this.collectionId = this.configService.get<string>('COLLECTION_ID') ?? "";
        this.engineId = this.configService.get<string>('ENGINE_ID') ?? "";

        const credentials = this.loadCredentials();
        this.searchClient = new SearchServiceClient({ credentials });
    }

    /** 處理服務帳戶金鑰 */
    private loadCredentials() {
        if (!this.keyFile || !fs.existsSync(this.keyFile)) {
        throw new Error(`服務帳戶金鑰檔案未找到於: ${this.keyFile}`);
        }
        const keyPath = path.resolve(this.keyFile);
        const raw = fs.readFileSync(keyPath, 'utf8');
        return JSON.parse(raw);
    }

    private async getAccessToken(): Promise<string> {
        const auth = new google.auth.GoogleAuth({
        keyFile: path.resolve(this.keyFile),
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
        });

        const client = await auth.getClient();
        const tokenResponse = await client.getAccessToken();
        if (!tokenResponse || !tokenResponse.token) {
        throw new Error('無法取得 access token');
        }
        return tokenResponse.token;
    }

    // /** 呼叫 Answer API (AI對話) */
    /** 呼叫 Answer API (AI對話) */
    private async callAnswerApi(userQuery: string,contentText: string) {
        // const historyText = this.conversationHistory
        // .map(h => `User: ${h.user}\nAI: ${h.ai}`)
        // .join('\n');

        const combinedPrompt = `以下是我們之前的對話：\n${contentText}\n\n這是我的新問題：${userQuery}`;

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
                        1. 回答內容必須嚴格基於所提供的資料庫。
                        2. 清楚說明福利的名稱和相關內容，並以專業、熱心的口吻回答。
                        3. 每個回答的字數必須維持在 200 字以內，並力求簡潔明瞭。
                        4. 當使用者提供的資料不明確或不夠完整時，在回應的最後持續追問更多資訊，例如「請問您是哪個縣市的居民呢？」或「您方便提供更具體的資料嗎？」等，以幫助使用者找到適合自己的福利。
                        5. 如果資料庫中找不到使用者提問的資訊，請禮貌地告知使用者目前無法提供相關資訊，並避免編造或猜測答案。`
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
        }));
    }


    /** 主函式 回傳 AI 答案 + 福利資訊 */
    async getAiAnswer(userQuery: string, userId: string, conversationId?: number) {
    // 步驟 1: 確保我們有一個有效的 conversationId
    if (!conversationId) {
        const newConversation = await this.conversationService.createConversation(userId, '未命名對話');
        conversationId = newConversation.id;
    }

    // 步驟 2: 從資料庫中獲取【只屬於這個 conversationId 的】歷史紀錄
    const historyFromDb = await this.conversationService.getRecentMessages(conversationId, 5);

    // 步驟 3: 將資料庫的歷史紀錄轉換成純文字的上下文
    //         這是之前在 callAnswerApi 中做的，現在移到這裡來
    const contextText = historyFromDb
        .map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${m.content}`)
        .reverse() // 從舊到新排序
        .join('\n');

    // 步驟 4: 將【動態生成】的上下文傳遞給底層的 API 呼叫函式
    const { answerText } = await this.callAnswerApi(userQuery, contextText);
    const welfareCards = await this.callSearchApi(userQuery);

    // 步驟 5: 將新的問答儲存到【正確的】conversationId 中
    await this.conversationService.addMessage(conversationId, 'user', userQuery);
    await this.conversationService.addMessage(conversationId, 'ai', answerText, { welfareCards });

    return { conversationId, answer: answerText, welfareCards };
    }
}