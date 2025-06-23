import { Injectable, Logger } from "@nestjs/common";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { GoogleGenAI } from "@google/genai";
import { RateLimiter } from "./utils/rate-limiter.js";
import { ConfigService } from "@nestjs/config";
import { join } from "path";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { WelfareService } from "../welfare/welfare.service.js";
import { WelfareStatus } from "../common/enum/welfare-status.enum.js";
import { ConstDataService } from "../common/const-data/const-data.service.js";

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
  private readonly ai;
  private aiRateLimiter = new RateLimiter(9);
  private modelName = "gemini-2.5-flash";

  constructor(
    private readonly configService: ConfigService,
    private readonly welfareService: WelfareService,
    private readonly constService: ConstDataService,
  ) {
    super();
    // 從 ConfigService 獲取 API key
    const apiKey = this.configService.get<string>("GEMINI_API_KEY");
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined in configuration");
    }
    this.ai = new GoogleGenAI({ apiKey });
  }

  async process(job: Job<CrawlData>): Promise<void> {
    if (this.configService.get("DATA_PROCESS_SKIP") === "true") {
      this.logger.warn(`跳過處理：環境變數 DATA_PROCESS 未啟用`);
      return;
    }

    let summaryText: string;
    let categories: string[];
    let identities: string[];

    const data = job.data;
    this.logger.log(`開始處理資料: ${data.url}`);

    try {
      summaryText = await this.retryWithDelay(() => this.summary(data.content));
      this.logger.log(`${data.title}的摘要為${summaryText}`);
      categories = await this.retryWithDelay(() => this.category(summaryText));
      this.logger.log(`${data.title}的分類為${categories}`);
      identities = await this.retryWithDelay(() => this.identity(summaryText));
      this.logger.log(`${data.title}的身份別為${identities}`);

      // 3️⃣ 封裝處理後資料
      const processedData: Omit<CrawlData, "content"> & {
        details: string;
        summary: string;
        category: string[];
        content?: string;
        identity: string[];
      } = {
        ...data,
        details: data.content,
        summary: summaryText,
        category: categories,
        identity: identities,
      };
      delete processedData.content;

      const outputDir = join(__dirname, "../../output");
      if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
      }

      const outputPath = join(outputDir, "results-finish.json");

      let existingData: any[] = [];
      if (existsSync(outputPath)) {
        try {
          const fileContent = readFileSync(outputPath, "utf8");
          existingData = JSON.parse(fileContent);
        } catch (e) {
          this.logger.warn(`⚠️ 讀取現有檔案失敗，將重新建立: ${e.message}`);
        }
      }

      existingData.push(processedData);

      await this.welfareService.create({
        title: processedData.title,
        link: processedData.url,
        details: processedData.details,
        summary: processedData.summary,
        forward: "獲得十萬元",
        publicationDate: processedData.date,
        status: WelfareStatus.Published,
        locationID: this.constService.getLocationIDByName(processedData.city),
        categoryID: processedData.category.map((item) =>
          this.constService.getCategoryIDByName(item),
        ),
        identityID: processedData.identity.map((item) =>
          this.constService.getIdentityIDByName(item),
        ),
      });

      writeFileSync(outputPath, JSON.stringify(existingData, null, 2), "utf8");
      this.logger.log(`✅ 已寫入處理後資料至 ${outputPath}`);
    } catch (err) {
      this.logger.error(`處理資料失敗: ${data.url}，錯誤: ${err.message}`);
      throw err;
    }
  }

  // 處理summary
  private async summary(content: string): Promise<string> {
    if (content.length === 0) {
      return "無摘要";
    }

    await this.aiRateLimiter.limit(); // 限流器等待

    const response = await this.ai.models.generateContent({
      model: this.modelName,
      contents: `
            你是一個專業的文章總結工具。請閱讀以下文章內容，並以簡潔、客觀的方式總結其核心內容。輸出僅包含總結文字，不包含任何問候語（如「你好」）、解釋、或多餘詞句。總結應控制在50-150字，涵蓋文章主要觀點和結論。請直接提供總結內容。

            文章內容：

            -總結內容控制在100字以內
            -專注於文本的主要觀點
            -保持簡潔明瞭
            -不要捏造內容
            -若文本内容無意義，則可以回復無摘要

            文本内容:
            
            ${content}

        `,
    });

    return response.text?.trim().replace(/[\n\r]/g, "") || "無法生成AI摘要";
  }

  // 處理category
  private async category(content: string): Promise<string[]> {
    if (content.length === 0) {
      return ["其他福利"];
    }

    await this.aiRateLimiter.limit(); // 限流器等待

    const response = await this.ai.models.generateContent({
      model: this.modelName,
      contents: `
            你是一個多標籤分類工具。請閱讀以下文章內容，並從以下特定標籤集中選擇適用的標籤：

            主題：兒童及青少年福利、婦女與幼兒福利、老人福利、社會救助福利、身心障礙福利
            輸出僅包含選中的標籤，以「|」符號分隔，不包含任何問候語、解釋或多餘文字。每個標籤必須來自上述標籤集，最多輸出5個標籤。若無適用標籤，輸出「其他福利」。

            文章內容：

            ${content}

        `,
    });

    const temp = [
      "兒童及青少年福利",
      "婦女與幼兒福利",
      "老人福利",
      "社會救助福利",
      "身心障礙福利",
    ];
    if (response.text) {
      const category = (response.text as string)
        .split("|")
        .map((c) => c.replace(/\s+/g, "").replace(/\n/g, "").trim())
        .filter((c) => temp.includes(c)); // ✅ 僅保留白名單中的元素

      if (category.length === 0) {
        return ["其他福利"];
      }

      return category;
    }

    return ["其他福利"];
  }

  // 處理identity
  private async identity(content: string): Promise<string[]> {
    if (content.length === 0) {
      return [];
    }

    await this.aiRateLimiter.limit(); // 限流器等待

    const response = await this.ai.models.generateContent({
      model: this.modelName,
      contents: `
            你是一個多標籤分類工具。請閱讀以下福利資訊文章內容，並從以下特定標籤集中選擇所有符合文章所述身份的標籤：

            年齡：20歲以下、20歲-65歲、65歲以上
            性別：男性、女性
            收入狀況：中低收入戶、低收入戶
            特殊身份：榮民、身心障礙者、原住民、外籍配偶家庭
            輸出僅包含選中的標籤，以「|」符號分隔，不包含任何問候語、解釋或多餘文字。每個標籤必須來自上述標籤集，可包含多個同類型標籤（例如多個年齡層或特殊身份），最多輸出8個標籤。若無適用標籤，輸出「無」。僅根據文章明確提到的資訊判斷，避免推測。
            文章內容：

            ${content}
        `,
    });

    const temp = [
      "20歲以下",
      "20歲-65歲",
      "65歲以上",
      "男性",
      "女性",
      "中低收入戶",
      "低收入戶",
      "榮民",
      "身心障礙者",
      "原住民",
      "外籍配偶家庭",
    ];

    if (response.text) {
      const identity = (response.text as string)
        .split("|")
        .map((c) =>
          c.replace(/\s+/g, "").replace(/\n/g, "").replace(/\r/g, "").trim(),
        ) // 清理字串
        .filter((c) => c.length > 0 && c !== "無") // ❌ 排除空字串與 "無"
        .filter((c) => temp.includes(c)); // ✅ 僅保留白名單中的元素

      return identity.length > 0 ? identity : [];
    }

    return [];
  }

  async retryWithDelay<T>(
    fn: () => Promise<T>,
    delayMs: number = 5 * 60 * 1000, // 5 分鐘
    maxRetries: number = 1,
  ): Promise<T> {
    let attempt = 0;
    while (attempt <= maxRetries) {
      try {
        return await fn();
      } catch (err) {
        attempt++;
        if (attempt > maxRetries) {
          throw err;
        }
        this.logger.warn(
          `功能失敗，${delayMs / 1000} 秒後重試：${err.message}`,
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
    throw new Error("重試失敗"); // 保險用
  }
}
