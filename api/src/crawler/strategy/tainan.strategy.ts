import { Logger } from "@nestjs/common";
import axios from "axios";
import * as cheerio from "cheerio";
import { resolveUrl } from "../utils/resolve-url.js";
import { parseDateToISO } from "../utils/parse-date.js";
import { appendJson } from "../utils/append-json.js";
import { join } from "path";
import { dirname } from "path";
import { fileURLToPath } from "url";
import { Queue } from "bullmq";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class TainanCrawlerStrategy {
  private readonly logger = new Logger(TainanCrawlerStrategy.name);

  constructor(
    private downloadAndExtractText: (url: string) => Promise<string>,

    private dataQueue: Queue,
  ) {}

  /** 第一層：抓公告主頁列表 */
  async crawlListPage(startUrl: string, baseUrl: string): Promise<string[]> {
    this.logger.log(`🔍 開始抓主頁列表: ${startUrl}`);
    const res = await axios.get(startUrl);
    const $ = cheerio.load(res.data);

    const links = $(".group.base-extend .list-text.link .in .ct .in ul[data-child=10] > li:nth-child(n+6):nth-child(-n+10) a")
      .map((_, el) => $(el).attr("href"))
      .get()
      .filter(Boolean)
      .map((href) => resolveUrl(baseUrl, href));

    this.logger.log(`📄 主頁列表抓取完成，共 ${links.length} 筆`);
    return links;
  }

  /** 第二層：抓每個主頁裡面的子列表 */
  async crawlSubPages(mainUrl: string, baseUrl: string): Promise<string[]> {
    this.logger.log(`🔍 開始抓子頁列表: ${mainUrl}`);
    const res = await axios.get(mainUrl);
    const $ = cheerio.load(res.data);

    const links = $(".group-list.content .list-text.content-list ul li a")
      .map((_, el) => $(el).attr("href"))
      .get()
      .filter(Boolean)
      .map((href) => resolveUrl(baseUrl, href));

    this.logger.log(`📄 子頁列表抓取完成，共 ${links.length} 筆`);
    return links;
  }

  /** 第三層：抓每個子頁裡面的最內頁 */
  async crawlDetailPages(subPageUrl: string, baseUrl: string): Promise<string[]> {
    this.logger.log(`🔍 開始抓最內頁列表: ${subPageUrl}`);
    const res = await axios.get(subPageUrl);
    const $ = cheerio.load(res.data);

    const links = $(".area-table a")
      .map((_, el) => $(el).attr("href"))
      .get()
      .filter(Boolean)
      .map((href) => resolveUrl(baseUrl, href));

    this.logger.log(`📄 最內頁抓取完成，共 ${links.length} 筆`);
    return links;
  }

  /** 第四層：抓內文頁（加入檔案下載功能） */
  async extractData(pageUrl: string, baseUrl: string, config?: any): Promise<any | null> {
    this.logger.log(`🔍 開始抓內文頁: ${pageUrl}`);
    const res = await axios.get(pageUrl);
    const $ = cheerio.load(res.data);

    const liTexts = $(".list-text.detail .in ul li").map((_, el) => $(el).text().trim()).get();
    const publishDateRaw = liTexts.find(t => t.includes("上版日期")) || "";
    const modifyDateRaw = liTexts.find(t => t.includes("修改時間")) || "";
    const publishDate = parseDateToISO(publishDateRaw);
    const modifyDate = parseDateToISO(modifyDateRaw);
    const finalDate = modifyDate || publishDate;

    let title = $(".in h3").text().trim();
    title = title.replace(/^\d+\.\s*/, "");
    this.logger.log(`📝 標題: ${title}, 日期: ${finalDate}`);

    let content = $(".essay .p").map((_, el) => $(el).text().trim())
      .get()
      .join(" ")
      .trim();

    // 🆕 檔案下載功能
    if (config?.downloadData) {
      try {
        const fileContents = await this.downloadFilesFromPage($, config, baseUrl, pageUrl);
        if (fileContents.length > 0) {
          const allFileContent = fileContents.join('');
          content += allFileContent;
          this.logger.log(`成功整合 ${fileContents.length} 個檔案內容到: ${pageUrl}`);
        }
      } catch (err) {
        this.logger.warn(`檔案下載整合失敗: ${pageUrl}，錯誤: ${err.message}`);
      }
    }

    this.logger.log(`✅ 完成抓取內文頁: ${pageUrl}, 內容長度: ${content.length}`);

    return { city: "臺南市", url: pageUrl, title, date: finalDate, content };
  }

  /** 🆕 從頁面下載並提取檔案內容 */
  private async downloadFilesFromPage(
    $: cheerio.CheerioAPI, 
    config: any, 
    baseUrl: string, 
    pageUrl: string
  ): Promise<string[]> {
    const fileContents: string[] = [];
    
    try {
      const downloadLinks: string[] = [];
      $(config.downloadData).find('a').each((index, el) => {
        if (index >= 3) return false; // 只取前三個檔案
        const href = $(el).attr('href');
        if (href) {
          const fullUrl = resolveUrl(baseUrl, href);
          downloadLinks.push(fullUrl);
        }
      });

      if (downloadLinks.length === 0) {
        return fileContents;
      }

      this.logger.log(`找到 ${downloadLinks.length} 個下載連結: ${downloadLinks.join(', ')}`);

      // 並行下載前三個檔案並提取內容
      const downloadPromises = downloadLinks.map(async (downloadUrl, index) => {
        try {
          const fileContent = await this.downloadAndExtractText(downloadUrl);
          if (fileContent) {
            return `\n\n--- 附件 ${index + 1} 內容 ---\n${fileContent}`;
          }
          return '';
        } catch (err) {
          this.logger.warn(`下載檔案失敗: ${downloadUrl}，錯誤: ${err.message}`);
          return '';
        }
      });

      const results = await Promise.all(downloadPromises);
      fileContents.push(...results.filter(content => content.length > 0));
      
    } catch (err) {
      this.logger.warn(`檔案下載過程發生錯誤: ${pageUrl}，錯誤: ${err.message}`);
    }

    return fileContents;
  }

  /** 🆕 完整的三層爬蟲流程 */
  async crawlWithStrategy(
    cityName: string, 
    config: any, 
    result: any[], 
    existingLinks: Set<string>
  ): Promise<any[]> {
    this.logger.log(`[${cityName}] 🚀 開始使用三層策略爬取`);
    
    try {
      // 第一層：獲取主分類連結
      const mainLinks = await this.crawlListPage(config.startUrl, config.baseUrl);
      this.logger.log(`[${cityName}] 找到 ${mainLinks.length} 個主分類連結`);

      let processedCount = 0;

      // 第二層：遍歷每個主分類
      for (const mainUrl of mainLinks) {
        try {
          // 獲取子分類連結
          const subLinks = await this.crawlSubPages(mainUrl, config.baseUrl);
          
          // 第三層：遍歷每個子分類
          for (const subUrl of subLinks) {
            try {
              // 獲取詳細頁面連結
              const detailLinks = await this.crawlDetailPages(subUrl, config.baseUrl);
              
              // 第四層：抓取每個詳細頁面的內容
              for (const detailUrl of detailLinks) {
                if (existingLinks.has(detailUrl)) {
                  this.logger.debug(`[${cityName}] 已存在，略過: ${detailUrl}`);
                  continue;
                }

                try {
                  // 提取詳細內容（包含檔案下載）
                  const data = await this.extractData(detailUrl, config.baseUrl, config);
                  
                  if (data && data.content) {
                    result.push(data);
                    existingLinks.add(detailUrl);
                    processedCount++;

                    // 寫入 JSON
                    const resultsPath = join(__dirname, "../../../output", "results.json");
                    await appendJson(resultsPath, data);

                    // ✅ 推送到 BullMQ
                    if (this.dataQueue) {
                      await this.dataQueue.add("process", data, {
                        attempts: 3,
                        backoff: { type: "fixed", delay: 5000 },
                        removeOnComplete: true,
                      });
                      this.logger.log(`[${cityName}] 推送到 BullMQ: ${data.title}`);
                    }

                    this.logger.log(`[${cityName}] 抓到資料 (${processedCount}): ${data.title}`);
                  }
                } catch (err) {
                  this.logger.warn(`[${cityName}] 詳細頁面抓取失敗: ${detailUrl}，錯誤: ${err.message}`);
                }
              }
            } catch (err) {
              this.logger.warn(`[${cityName}] 子分類頁面處理失敗: ${subUrl}，錯誤: ${err.message}`);
            }
          }
        } catch (err) {
          this.logger.warn(`[${cityName}] 主分類頁面處理失敗: ${mainUrl}，錯誤: ${err.message}`);
        }
      }
      
      this.logger.log(`[${cityName}] ✅ 三層策略爬取完成，處理了 ${processedCount} 筆資料`);
    } catch (err) {
      this.logger.error(`[${cityName}] 三層策略爬蟲過程發生錯誤: ${err.message}`);
    }

    return result;
  }
}
