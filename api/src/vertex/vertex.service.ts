import { Injectable } from '@nestjs/common';
import { SearchServiceClient } from '@google-cloud/discoveryengine';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class VertexService {
    private readonly client: SearchServiceClient;
    private readonly servingConfig: string;
    private readonly projectId: string;
    private readonly location: string;


    constructor(
        private readonly configService: ConfigService
    ) {
        const gcpSaKeyBase64 = this.configService.get<string>('GCP_API_KEY');

        if (!gcpSaKeyBase64) {
            throw new Error('GCP credentials are not configured.');
        }

        const decodedKey = Buffer.from(gcpSaKeyBase64, 'base64').toString('utf8');

        const credentials = JSON.parse(decodedKey);

        this.client = new SearchServiceClient({
            credentials,
        });

        this.projectId = this.configService.get<string>('GCP_PROJECT_ID') ?? "";
        this.location = this.configService.get<string>('GCP_LOCATION') ?? "";
        const dataStoreId = this.configService.get<string>('DATA_STORE_ID');

        this.servingConfig = `projects/${this.projectId}/locations/${this.location}/collections/default_collection/dataStores/${dataStoreId}/servingConfigs/default_serving_config`;
    }

    async search(query: string, conversationId?: string) {
        const currentConversationId = conversationId || uuidv4();

        const conversationPath = `projects/${this.projectId}/locations/${this.location}/collections/default_collection/conversations/${currentConversationId}`;

        const request = {
            servingConfig: this.servingConfig,
            query: query,
            conversation: conversationPath,
            queryParams: {},
            safeSearch: true,
        };
        console.log('Sending request to Vertex AI Search:', JSON.stringify(request, null, 2));

        const [responses, response, text] = await this.client.search(request);
        console.log(response);

        return {
            responses, response, text
        }

        // 7. 從回應中擷取需要的資訊並回傳
        // Vertex AI 會在回應中提供摘要 (summary)，這是最適合直接顯示給使用者的答案。
        // 同時，我們回傳 `conversationId`，讓前端可以在下次請求時帶上，以維持對話上下文。
        // return {
        //     answer: response.summary?.summaryText || '無法找到相關答案。',
        //     conversationId: currentConversationId,
        //     results: response.results, // 你也可以回傳原始的搜尋結果
        // };
    }
}
