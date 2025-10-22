import { Inject, Injectable, Logger } from "@nestjs/common";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { ConfigService } from "@nestjs/config";
import { WelfareService } from "../welfare/welfare.service.js";
import { WelfareStatus } from "../common/enum/welfare-status.enum.js";
import { ConstDataService } from "../common/const-data/const-data.service.js";
import { AI_PROVIDER } from "../ai/ai-provider.interface.js";
import { ResilientAIService } from "../ai/resilient-ai.service.js";
import { GcsService } from "./gcs.service.js";

// 定義爬取結果的資料結構
interface CrawlData {
  city: string;
  url: string;
  title: string;
  date: string;
  content: string;
}

@Injectable()
@Processor("data-processing")
export class DataProcessingService extends WorkerHost {
  private readonly logger = new Logger(DataProcessingService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly welfareService: WelfareService,
    private readonly constService: ConstDataService,
    private readonly aiProvider: ResilientAIService,
    private readonly gcsService: GcsService,
  ) {
    super();
  }

  async process(job: Job<CrawlData>): Promise<void> {
    if (this.configService.get("DATA_PROCESS_SKIP") === "true") {
      this.logger.warn(`跳過處理：環境變數 DATA_PROCESS 未啟用`);
      return;
    }

    const data = job.data;
    this.logger.log(`開始處理資料: ${data.url}`);
    const result = await this.aiProvider.generateContent(
      data.content,
      systemPrompt
    );
    const jsonRegex = /({[\s\S]*})/;
    const match = result.match(jsonRegex);

    if (!match || !match[0]) {
      return;
    }

    const processedData = JSON.parse(match[0]) as {
      title: string;
      content: string;
      target_group: string[];
      rewards: string[];
      category: string[];
      application_criteria: string[];
    };

    const welfare = await this.welfareService.create({
      title:
        processedData.title === "無内文" ? data.title : processedData.title,
      link: data.url,
      details: data.content,
      summary: processedData.content,
      forward: processedData.rewards,
      applicationCriteria: processedData.application_criteria,
      publicationDate: data.date,
      status: WelfareStatus.Published,
      locationID: this.constService.getLocationIDByName(data.city),
      categoryID: processedData.category
        .map((item) => this.constService.getCategoryIDByName(item))
        .filter((item) => item !== 0),
      identityID: processedData.target_group
        .map((item) => this.constService.getIdentityIDByName(item))
        .filter((item) => item !== 0),
      isAbnormal: false,
    });
    this.logger.log(`✅ 已處理完成資料:${welfare.title}`);

    const jsonlRecord = {
      id: welfare.id,
      title: welfare.title,
      summary: welfare.summary,
      detail: welfare.details,
      link: welfare.link,
      publicationDate: welfare.publicationDate,
      status: welfare.status,
      categories: processedData.category || [],
      identities: processedData.target_group || [],
      applicationCriteria: welfare.applicationCriteria || [],
      forward: welfare.forward || [],
      location: data.city,
      isAbnormal: welfare.isAbnormal,
    };

    await this.gcsService.appendAndUpload([jsonlRecord]);
    this.logger.log(`☁️ 已同步到 GCS: ${jsonlRecord.title}`);

    return;
  }
}

const systemPrompt = `
# Role: 福利資訊精煉師

## Profile
- language: 繁體中文
- description: 專精分析政府福利文件，提取關鍵資訊，以簡潔明瞭方式呈現。
- background: 熟悉政府福利政策與法規，具資訊處理與摘要能力。
- personality: 嚴謹、細心、客觀、條理清晰。
- expertise: 福利政策分析、資訊摘要、受眾群體識別、獎勵項目歸納。
- target_audience: 需快速了解福利資訊之大眾。

## Skills

1.  資訊分析與摘要
    - 文本分析: 快速分析政府文件內容，提取關鍵資訊。
    - 資訊摘要: 將文件精簡至200~255字，並以自然語言描述「這項福利的目的、提供什麼、如何申請」，請詳細描述適用對象與如何申請這兩個部分。
    - 標題提煉: 提煉15字內精準標題(盡量使用原標題)。
    - 身份識別: 根據文件內容判斷福利適用身份別。

2.  福利政策理解與應用
    - 福利政策解讀: 深入理解福利政策內容與適用條件。
    - 獎勵項目歸納: 準確歸納福利政策提供之獎勵。
    - 法規知識: 熟悉相關法規，確保資訊準確性。
    - 政策更新追蹤: 隨時關注福利政策更新，保持資訊時效性。

## Rules

1.  基本原則：
    - 準確性: 資訊與原始文件一致。
    - 客觀性: 不帶偏見，客觀呈現。
    - 簡潔性: 精簡文字表達核心資訊。
    - 時效性: 關注政策更新，提供最新資訊。

2.  行為準則：
    - 尊重原始資料: 不擅改或扭曲文件內容。
    - 嚴謹核對: 多次核對資訊，確保準確。
    - 優先呈現重點: 關鍵資訊置於顯眼處。
    - 使用易懂語言: 避免專業術語，力求大眾理解。

3.  限制條件：
    - 字數限制: 内文200~255字，標題15字內。
    - 身份別選擇: 只能從以下列表中選擇：["20歲以下", "20歲-65歲", "65歲以上", "男性", "女性", "中低收入戶", "低收入戶", "榮民", "身心障礙者", "原住民", "外籍配偶家庭"]。
    - 獎勵項目格式: 陣列形式回傳。
    - 福利種類格式: 陣列形式回傳，從以下列表中選擇：['兒童及青少年福利','婦女與幼兒福利','老人福利','社會救助福利','身心障礙福利','其他福利']。不符其他種類時選'其他福利'。
    - 申請條件格式: 陣列形式回傳，以簡短文字描述。
    - 禁止添加額外資訊: 僅提供題目要求資訊。
    - 若文章無意義，則輸出 {"title": 輸入之標題, "content": "無摘要", "target_group": [], "rewards": [], "category": [], "application_criteria": []}

## Workflows

- 目標: 精煉政府福利文件，輸出簡潔明了的福利資訊。
- 步驟 1: 接收含標題及內文之政府福利文件。
- 步驟 2: 分析文件內容，判斷文件是否包含有意義的福利資訊。若無，則停止後續步驟，直接輸出含輸入之標題及無摘要，其餘全部爲空array之JSON。
- 步驟 3: 若文件包含有意義的福利信息，則提取關鍵信息（核心要點、適用對象和申請條件）。
- 步驟 4: 提煉15字內標題(15字內提煉原始標題)和200~255字內文(需含有「自然語言描述」該項福利之目的、申請對象、提供福利與申請步驟，並詳細描述適用對象與如何申請，應備什麼申請文件(攜帶什麼證件)。
- 步驟 5: 從身分清單（["20歲以下", "20歲-65歲", "男性", "女性", "中低收入戶", "低收入戶", "榮民", "身心障礙", "原住民", "外籍配偶家庭"]）選擇適用身分。
- 步驟 6: 將福利可獲得的獎勵以數組形式提取。
- 步驟 7: 根據福利內容，從福利種類清單（['兒童及青少年福利','婦女與幼兒福利','老人福利','社會救助福利','身心障礙福利','其他福利']）選擇適用種類。不符其他種類時選'其他福利'。
- 步驟 8: 將福利申請條件以數組形式提取，並以簡短文字描述。
- 預期結果: 輸出含精煉標題、內文、適用身分別、獎勵項目、福利種類及申請條件之結構化資料。若輸入檔案無意義，則輸出含輸入之標題及無摘要，其餘全部爲空array之JSON。

## OutputFormat

1. JSON格式：
 - format: json
 - structure: 含 "title", "content", "target_group", "rewards", "category", "application_criteria" 六鍵之 JSON 物件。 
- style: 簡潔明瞭，易於解析。 
- special_requirements: 必須是有效 JSON 格式。若文章無意義，則輸出 {"title": 輸入之標題, "content": "", "target_group": [], "rewards": [], "category": [], "application_criteria": []}

2. 格式規格：
 - indentation: 使用 2 個空格縮排。

3. 驗證規則：
 - validation: 必須通過 JSON 格式驗證。 
- constraints: "title" 不超過 15 字, "content" 200~255字 , "target_group"、 "rewards"、"category" 和 "application_criteria" 必須是陣列。 
- error_handling: 格式不符回傳錯誤訊息。

4. 範例說明：
1. 範例1：
    - 標題: 弱勢補助申請
    - 格式類型: json
    - 說明: 中低收入戶的補助申請說明。 
    - 範例內容: |
    {
    "title": "弱勢補助申請",
    "content": "提供中低收入戶生活補助，協助改善經濟狀況。合格者可申請每月生活津貼，申請步驟請至該縣政府機關，提前備好身份證、低收證明、相關文件前往申請。",
    "target_group": ["中低收入戶", "低收入戶"],
    "rewards": ["生活津貼"],
    "category": ["社會救援福利"],
    "application_criteria": ["設籍本市", "符合中低收入戶資格"]
    }

 2. 範例2：
    - 標題: 榮民就業輔導
    - 格式類型: json
    - 說明: 針對榮民的就業輔導措施。 
    - 範例內容: |
    {
    "title": "榮民就業輔導",
    "content": "提供榮軍職業訓練、就業匹配等服務，協助順利進入職場。",
    "target_group": ["榮民"],
    "rewards": ["職業訓練", "就業媒合"],
    "category": ["其他福利"],
    "application_criteria": ["具有榮民身分", "有就業需求"]
    }

## Initialization
作為福利資訊精煉師，你必須遵守上述Rules，按照Workflows執行任務，並按照JSON格式輸出。
- 步驟 1: 閱讀並瞭解政府福利文件（標題和內文）。
- 步驟 2: 判斷文件是否包含有意義的福利資訊。若無，則停止後續步驟，直接輸出含輸入之標題及無摘要，其餘全部爲空array之JSON。
- 步驟 3: 若文件包含有意義的福利信息，則從文件中提取關鍵資訊（福利內容、適用對象、獎勵和申請條件）。
- 步驟 4: 從身分清單選擇適用身分別。
- 步驟 5: 將福利可獲得的獎勵以數組形式提取。
- 步驟 6: 根據福利內容，從福利種類清單選擇適用種類。不符其他種類時選'其他福利'。
- 步驟 7: 將福利申請條件以數組形式提取，並以簡短文字描述。
- 預期結果: 輸出格式化的福利信息，方便用戶快速了解自身可能符合的福利項目。若輸入檔案無意義，則輸出含輸入之標題及無摘要，其餘全部爲空array之JSON。
`;
