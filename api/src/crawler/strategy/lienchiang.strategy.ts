import { Logger } from "@nestjs/common";
import axios from "axios";
import * as cheerio from "cheerio";
import { resolveUrl } from "../utils/resolve-url.js";
import pdfParse from "pdf-parse";
import * as mammoth from "mammoth";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type PageHandler = (url: string) => Promise<Array<{ title: string; content: string }> | null>;

interface CrawlResult {
  city: string;
  url: string;
  title: string;
  date: string;
  content: string;
}

export class LienchiangCrawlerStrategy {
  private readonly logger = new Logger(LienchiangCrawlerStrategy.name);
  private city = "連江市";
  private totalCount = 0;
  private results: any[] = [];

  // /** 輸出路徑 */
  // private outputPath = path.join(__dirname, "../../../output/result.json");

  // constructor() {
  //   // 初始化：確保目錄存在並清空舊檔
  //   const outputDir = path.dirname(this.outputPath);
  //   if (!fs.existsSync(outputDir)) {
  //     fs.mkdirSync(outputDir, { recursive: true });
  //   }
  //   fs.writeFileSync(this.outputPath, "[]", "utf8");
  //   this.logger.log(`📁 輸出檔案: ${this.outputPath}`);
  // }

  /** pattern 對應處理函式 */
  private handlers: Record<string, PageHandler> = {
    "/download/": this.handleDownload.bind(this),
    "/news/": this.handleNews.bind(this),
    "/content/": this.handleContent.bind(this),
  };

  /** 統一處理內頁 - 返回多筆資料並即時存檔 */
  async crawlDetailPage(url: string) {
    this.logger.debug(`處理內頁: ${url}`);

    try {
      // 找出第一個符合的 handler
      const matchedHandlerKey = Object.keys(this.handlers).find((key) => url.includes(key));

      let results: Array<{ title: string; content: string }> | null = null;

      if (matchedHandlerKey) {
        results = await this.handlers[matchedHandlerKey](url);
      } else {
        // 預設 fallback
        const content = await this.extractTextFromFile(url, 3);
        const title = url.split("/").pop() || "檔案";
        results = content ? [{ title, content }] : null;
      }

      if (!results || results.length === 0) {
        return [];
      }

      const crawlResults = results.map(({ title, content }) => ({
        city: this.city,
        url,
        title,
        date: "",
        content,
      }));

      // 顯示爬到的資料
      this.logResults(crawlResults);

      return crawlResults;
    } catch (err: any) {
      this.logger.warn(`[跳過] ${url}，原因: ${err.message}`);
      return [];
    }
  }

  /** 儲存結果到 JSON */
  // private saveToFile() {
  //   try {
  //     fs.writeFileSync(this.outputPath, JSON.stringify(this.results, null, 2), "utf8");
  //   } catch (err: any) {
  //     this.logger.error(`存檔失敗: ${err.message}`);
  //   }
  // }

  /** 顯示爬取結果並存檔 */
  private logResults(results: CrawlResult[]) {
    for (const result of results) {
      this.totalCount++;
      this.results.push(result);
      
      this.logger.log(`\n${"=".repeat(80)}`);
      this.logger.log(`✓ [${this.totalCount}] 標題: ${result.title}`);
      this.logger.log(`  URL: ${result.url}`);
      this.logger.log(`  城市: ${result.city}`);
      this.logger.log(`  內容預覽: ${result.content.slice(0, 200)}${result.content.length > 200 ? "..." : ""}`);
      this.logger.log(`${"=".repeat(80)}\n`);
    }
    
    // 每次都重新寫入完整的 JSON
  //   this.saveToFile();
  //   this.logger.log(`💾 已儲存至 ${this.outputPath} (共 ${this.totalCount} 筆)`);
  }

  /** 取得目前已爬取的筆數 */
  // getTotalCount(): number {
  //   return this.totalCount;
  // }

  /** /download/ 處理 - 每一行是一筆資料 */
  private async handleDownload(pageUrl: string): Promise<Array<{ title: string; content: string }> | null> {
    try {
      const $ = await this.loadPage(pageUrl);
      const results: Array<{ title: string; content: string }> = [];

      // 找到所有資料列（排除表頭）
      const rows = $("li.OHTER, li:not(.OHTER):has(.DSECOND)").filter((_, el) => {
        return $(el).find(".DSECOND p").length > 0;
      });

      this.logger.debug(`[/download/] 找到 ${rows.length} 筆資料`);

      for (let i = 0; i < rows.length; i++) {
        const row = rows.eq(i);
        const title = row.find(".DSECOND p").text().trim();
        const fileLinks = row.find(".DTHREE a");

        if (!title) {
          continue;
        }

        // 找第一個 PDF 或 DOCX 檔案
        let fileUrl = "";
        let fileType = "";

        fileLinks.each((_, link) => {
          const href = $(link).attr("href");
          const titleAttr = $(link).attr("title") || "";

          // 從 title 屬性或 href 判斷檔案類型
          const isPdf = titleAttr.toLowerCase().includes(".pdf") || (href && href.toLowerCase().includes(".pdf"));
          const isDocx =
            titleAttr.toLowerCase().includes(".docx") ||
            titleAttr.toLowerCase().includes(".doc") ||
            (href && (href.toLowerCase().includes(".docx") || href.toLowerCase().includes(".doc")));

          if (href && (isPdf || isDocx)) {
            fileUrl = resolveUrl(pageUrl, href);
            fileType = isPdf ? "PDF" : "DOCX";
            return false; // 找到就停止
          }
        });

        if (!fileUrl) {
          this.logger.debug(`[/download/] 第 ${i + 1} 筆「${title}」沒有 PDF/DOCX，跳過`);
          continue;
        }

        this.logger.debug(`[/download/] 第 ${i + 1} 筆「${title}」找到 ${fileType}: ${fileUrl}`);

        // 加入延遲避免請求過快
        if (i > 0) {
          await this.sleep(1000);
        }

        const content = await this.extractTextFromFile(fileUrl);

        if (!content) {
          this.logger.warn(`[/download/] 第 ${i + 1} 筆「${title}」解析失敗`);
          continue;
        }

        results.push({ title, content });
        this.logger.log(`[/download/] ✓ 第 ${i + 1} 筆「${title}」完成`);
      }

      this.logger.log(`[/download/] 成功處理 ${results.length}/${rows.length} 筆資料`);
      return results.length > 0 ? results : null;
    } catch (err: any) {
      this.logger.warn(`[/download/] ${pageUrl} 失敗: ${err.message}`);
      return null;
    }
  }

  /** /news/ 處理 - 返回單筆資料陣列 */
  private async handleNews(pageUrl: string): Promise<Array<{ title: string; content: string }> | null> {
    try {
      const $ = await this.loadPage(pageUrl);
      const aTag = $(".FROM a").first();
      const title = aTag.attr("title")?.trim();
      const href = aTag.attr("href");

      if (!title || !href) {
        this.logger.debug(`[/news/] ${pageUrl} 缺少標題或連結`);
        return null;
      }

      // 從 title 或 href 判斷檔案類型
      const titleLower = title.toLowerCase();
      const hrefLower = href.toLowerCase();
      const isPdf = titleLower.includes(".pdf") || hrefLower.includes(".pdf");
      const isDocx = titleLower.includes(".docx") || titleLower.includes(".doc") || hrefLower.includes(".docx") || hrefLower.includes(".doc");

      if (!isPdf && !isDocx) {
        this.logger.debug(`[/news/] ${pageUrl} 非 PDF/DOCX`);
        return null;
      }

      const absoluteFileUrl = resolveUrl(pageUrl, href);
      const content = await this.extractTextFromFile(absoluteFileUrl);

      if (!content) {
        this.logger.warn(`[/news/] ${pageUrl} 解析失敗`);
        return null;
      }

      return [{ title, content }];
    } catch (err: any) {
      this.logger.warn(`[/news/] ${pageUrl} 失敗: ${err.message}`);
      return null;
    }
  }

  /** /content/ 處理 - 返回單筆資料陣列 */
  private async handleContent(url: string): Promise<Array<{ title: string; content: string }> | null> {
    try {
      const $ = await this.loadPage(url);
      const title = $("title").text().trim() || $(".FROM").text().slice(0, 30).trim();
      const content = $(".FROM").text().trim();

      if (!title || !content) {
        this.logger.debug(`[/content/] ${url} 缺少標題或內容`);
        return null;
      }

      return [{ title, content }];
    } catch (err: any) {
      this.logger.warn(`[/content/] ${url} 失敗: ${err.message}`);
      return null;
    }
  }

  /** 解析檔案並擷取文字 */
  private async extractTextFromFile(url: string, maxPages: number = 3): Promise<string> {
  const maxRetries = 3;
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 30000,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Referer: url,
        },
      });

      const buffer = Buffer.from(response.data);
      const contentType = response.headers["content-type"] || "";

      let text = "";

      // PDF
      if (contentType.includes("pdf") || buffer.slice(0, 4).toString() === "%PDF") {
        let pageCount = 0;
        const data = await pdfParse(buffer, {
          pagerender: (pageData) => {
            pageCount++;
            if (pageCount > maxPages) return ""; // 超過 maxPages 就不要解析
            return pageData.getTextContent().then((textContent) => {
              return textContent.items.map((item) => item.str).join(" ");
            });
          },
        });
        text = data.text;
      }
      // DOCX
      else if (contentType.includes("wordprocessingml") || buffer.slice(0, 2).toString("hex") === "504b") {
        const result = await mammoth.extractRawText({ buffer });
        // Word 沒有頁數概念 → 取前 30 段代替
        text = result.value
          .split(/\n+/)
          .map((p) => p.trim())
          .filter((p) => p.length > 0)
          .slice(0, maxPages * 10) // 假設 1 頁約 10 段
          .join("\n\n");
      }
      // HTML
      else if (contentType.includes("text/html")) {
        const html = buffer.toString("utf8");
        const $ = cheerio.load(html);
        const paragraphs = $("body")
          .text()
          .split(/\n+/)
          .map((p) => p.trim())
          .filter((p) => p.length > 0)
          .slice(0, maxPages * 10); // 頁面近似處理
        text = paragraphs.join("\n\n");
      }

      return text;
    } catch (err: any) {
      lastError = err;
      if (attempt < maxRetries) {
        this.logger.debug(`下載失敗 (${attempt}/${maxRetries})，1秒後重試: ${url}`);
        await this.sleep(1000);
      }
    }
  }

  this.logger.error(`檔案解析失敗 (已重試 ${maxRetries} 次): ${url}，原因: ${lastError?.message}`);
  return "";
}

  /** 延遲函式 */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /** 取得 cheerio */
  private async loadPage(url: string) {
    const res = await axios.get(url, { responseType: "arraybuffer" });
    return cheerio.load(res.data.toString("utf8"));
  }
}