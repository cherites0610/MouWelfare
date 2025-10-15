import { Injectable, Logger } from "@nestjs/common";
import axios from "axios";
import * as cheerio from "cheerio";
import { loadCityConfigs } from "./config/read-config.js";
import { Queue } from "bullmq";
import fsExtra from "fs-extra";
import { join } from "path";
import { parseDateToISO } from "./utils/parse-date.js";
import { resolveUrl } from "./utils/resolve-url.js";
import mammoth from "mammoth";
import pdfParse from "pdf-parse";
import fetch from "node-fetch";
import { fileTypeFromBuffer } from "file-type";
import textract from "textract";
import { InjectQueue } from "@nestjs/bullmq";
import { WelfareService } from "../welfare/welfare.service.js";
import { dirname } from "path";
import { fileURLToPath } from "url";
import { YilanCrawlerStrategy } from "./strategy/yilan.strategy.js";
import { TainanCrawlerStrategy } from "./strategy/tainan.strategy.js";
import { LienchiangCrawlerStrategy } from "./strategy/lienchiang.strategy.js";
import { appendJson } from "./utils/append-json.js";
import { PingtungCrawlerStrategy } from "./strategy/pingtung.strategy.js";
import * as fs from "fs";
import * as path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

@Injectable()
export class CrawlerService {
  private readonly logger = new Logger(CrawlerService.name);
  private readonly concurrency = 10; // 可調整
  private readonly timeoutMs = 15000;

  constructor(
    @InjectQueue("data-processing") 
    private readonly dataQueue: Queue,
    private readonly welfareService: WelfareService
  ) {}

  async crawlAllCities(): Promise<void> {
    const existingLinks = new Set(await this.welfareService.findAllLink());
    const config = loadCityConfigs();
    const cityTasks = Object.entries(config).map(([cityName, cityConfig]) =>
      this.crawlSingleCity(cityName, cityConfig, existingLinks)
    );

    const allResultsNested = await Promise.all(cityTasks);
    const allResults = allResultsNested.flat();

    const outputDir = join(__dirname, "../../output");
    await fsExtra.ensureDir(outputDir);
    const outputPath = join(outputDir, "results.json");
    await fsExtra.writeFile(outputPath, JSON.stringify(allResults, null, 2), "utf8");
    this.logger.log(`原始資料已輸出至 ${outputPath}`);
    this.logger.log(`所有城市爬取完成`);
  }

  private async crawlSingleCity(cityName: string, config, existingLinks: Set<string>) {
    this.logger.log(`🔍 開始爬取 ${cityName}`);
    const results: any[] = [];

    const dynamicCities = ["taipei", "nantou"];
    const staticCities = ["yilan", "tainan", "matsu","pingtung"];

    if (dynamicCities.includes(cityName)) {
      return await this.crawlDynamicCity(cityName, config, existingLinks);
    }

    if (staticCities.includes(cityName)) {
      return await this.crawlWithStrategy(cityName, config, results, existingLinks);
    }

    return await this.bfsCrawl(cityName, config, existingLinks);
  }

  /** 高效 BFS（新增檔案下載支援） */
  private async bfsCrawl(
    cityName: string,
    config,
    existingLinks: Set<string>
  ): Promise<any[]> {
    const { city: cityDisplayName } = config;
    const result: any[] = [];

    const dynamicCities = ["taipei", "nantou"];
    const staticCities = ["yilan", "tainan", "matsu","pingtung"];

    if (dynamicCities.includes(cityName)) {
      return await this.crawlDynamicCity(cityName, config, existingLinks);
    }

    if (staticCities.includes(cityName)) {
      return await this.crawlWithStrategy(cityName, config, result, existingLinks);
    }

    const queue: { url: string; level: number }[] = [];
    if (config.pageCount) {
      for (let p = 1; p <= config.pageCount; p++) {
        const pageUrl = config.startUrl.replace("page=1", `page=${p}`);
        queue.push({ url: pageUrl, level: 0 });
      }
    } else {
      queue.push({ url: config.startUrl, level: 0 });
    }

    const outputDir = join(__dirname, "../../output");
    const htmlDir = join(outputDir, "html");
    await fsExtra.ensureDir(outputDir);
    await fsExtra.ensureDir(htmlDir);

    // ⚠️ 使用 Set 來追蹤待處理的 URL，避免重複加入 queue
    const visitedOrQueued = new Set<string>([config.startUrl]);

    while (queue.length) {
      const currentBatch = queue.splice(0, this.concurrency);
      const tasks = currentBatch.map(({ url, level }, index) => async () => {
        const taskId = `${cityName}-${level}-${index}`;
        try {
          const response = await this.withTimeout(axios.get(url), this.timeoutMs);
          const $ = cheerio.load(response.data);

          const htmlContent = response.data;
          const safeFilename = url.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 100) + ".html";
          const htmlPath = join(htmlDir, safeFilename);
          await fsExtra.writeFile(htmlPath, htmlContent, "utf8");

          const levelConfig = config.levels[level];
          if (levelConfig) {
            // 1. 正常處理鑽取下一層的連結
            $(levelConfig.selector).each((_, el) => {
              const nextUrlRaw = $(el).attr(levelConfig.getUrlAttr);
              if (nextUrlRaw) {
                const nextUrl = resolveUrl(config.baseUrl, nextUrlRaw);
                // 檢查是否已處理過，避免重複
                if (!visitedOrQueued.has(nextUrl)) {
                  visitedOrQueued.add(nextUrl);
                  queue.push({ url: nextUrl, level: level + 1 });
                }
              }
            });

            // 🆕 2. 新增分頁處理邏輯
            if (levelConfig.paginationSelector) {
              const nextLinkEl = $(levelConfig.paginationSelector);
              if (nextLinkEl.length > 0) {
                const nextUrlRaw = nextLinkEl.attr("href"); // 分頁連結通常是 'href'
                if (nextUrlRaw) {
                  const nextUrl = resolveUrl(config.baseUrl, nextUrlRaw);
                  // 檢查是否已處理過，避免重複
                  if (!visitedOrQueued.has(nextUrl)) {
                    this.logger.log(`[${cityName}] 找到下一頁，加入佇列: ${nextUrl}`);
                    visitedOrQueued.add(nextUrl);
                    // ❗❗❗ 關鍵：下一頁的 level 保持不變！
                    queue.push({ url: nextUrl, level: level });
                  }
                }
              }
            }
          }

          if ($(config.stopSelector).length > 0) {
            if (existingLinks.has(url)) {
              this.logger.debug(`[${cityName}] 已存在，略過: ${url}`);
              return;
            }

            const rawDate = $(config.extractSelectors.date).text().trim();
            const isoDate = parseDateToISO(rawDate);

            const contentElements = $(config.extractSelectors.content).clone();
            contentElements.find('#download a').remove();
            let content = contentElements
              .map((_, el) => $(el).text().trim().replace(/\s+/g, " "))
              .get()
              .join(" ")
              .trim();

            if (!content) return;

            // 🆕 檔案下載功能整合
            if (config.downloadData) {
              try {
                const fileContents = await this.downloadFilesFromPage($, config, url);
                if (fileContents.length > 0) {
                  const allFileContent = fileContents.join('');
                  
                  // 如果是台東市，移除「相關檔案」那段文字
                  if (cityDisplayName === "臺東市" && content.includes("相關檔案")) {
                    // 移除「相關檔案：」之後的所有內容（包括檔案名列表）
                    content = content.split("相關檔案")[0].trim();
                  }
                  
                  content += allFileContent;
                  this.logger.log(`[${cityName}] 成功整合 ${fileContents.length} 個檔案內容到: ${url}`);
                }
              } catch (err) {
                this.logger.warn(`[${cityName}] 檔案下載整合失敗: ${url}，錯誤: ${err.message}`);
              }
            }

            const data = {
              city: cityDisplayName,
              url,
              title: $(config.extractSelectors.title).text().trim(),
              date: isoDate,
              content,
            };

            existingLinks.add(url);
            result.push(data);

            // 寫入 results.json (可選)
            const resultsPath = join(outputDir, "results.json");
            await appendJson(resultsPath, data);

            this.logger.log(`[${cityName}] 已抓到資料: ${data.title} (${url})`);
          }
        } catch (err) {
          this.logger.warn(`[${taskId}] 訪問失敗 ${url}，錯誤：${err.message}`);
        }
      });

      await this.runWithConcurrency(tasks, this.concurrency);
    }

    // ✅ 全部資料抓完後，再統一推送到 BullMQ
    for (const data of result) {
      await this.dataQueue.add("process", data, {
        attempts: 3,
        backoff: { type: "fixed", delay: 5000 },
        removeOnComplete: true,
      });
      this.logger.log(`[${cityName}] 資料已新增到 queue: ${data.title} (${data.url})`);
    }

    return result;
  }

  /** 🆕 從頁面下載並提取檔案內容（取前三段、限2000字） */
  private async downloadFilesFromPage($: cheerio.CheerioAPI, config: any, pageUrl: string): Promise<string[]> {
    const fileContents: string[] = [];
    
    try {
      const downloadLinks: string[] = [];
      $(config.downloadData).find('a').each((index, el) => {
        if (index >= 2) return false; // 只取前2個檔案
        const href = $(el).attr('href');
        if (href) {
          const fullUrl = resolveUrl(config.baseUrl, href);
          downloadLinks.push(fullUrl);
        }
      });

      if (downloadLinks.length === 0) {
        return fileContents;
      }

      this.logger.log(`[共用爬蟲] 找到 ${downloadLinks.length} 個下載連結: ${downloadLinks.join(', ')}`);

      // 並行下載檔案並提取內容
      const downloadPromises = downloadLinks.map(async (downloadUrl) => {
        try {
          const fileContent = await this.downloadAndExtractText(downloadUrl);
          return fileContent ? `${fileContent}` : '';
        } catch (err) {
          this.logger.warn(`[共用爬蟲] 下載檔案失敗: ${downloadUrl}，錯誤: ${err.message}`);
          return '';
        }
      });

      const results = await Promise.all(downloadPromises);
      const merged = results.filter(content => content.length > 0).join('\n\n');

      // 🧩 改良：以「真實句號」為主的段落擷取
      if (merged) {
        let paragraphs: string[] = [];

        // 先以自然語句（句號、問號、驚嘆號）分割
        const sentences = merged
          .split(/(?<=[。！？.!?])\s*/)
          .map(s => s.trim())
          .filter(s => s.length > 10);

        let buffer = "";
        for (const sentence of sentences) {
          buffer += sentence;
          // 每段約 300–500 字，視情況自然切割
          if (buffer.length > 350) {
            paragraphs.push(buffer.trim());
            buffer = "";
          }
          // 最多組成三段
          if (paragraphs.length >= 3) break;
        }
        if (buffer && paragraphs.length < 3) paragraphs.push(buffer.trim());

        // 如果前面沒切出三段，就補上原始的內容分隔邏輯（保底）
        if (paragraphs.length === 0) {
          paragraphs = merged.split(/\n\s*\n+/).map(p => p.trim()).filter(p => p.length > 20);
        }

        // 限制總長 <= 4000字
        let total = 0;
        const selected: string[] = [];
        for (const para of paragraphs) {
          if (selected.length >= 3) break;
          if (total + para.length > 4000) break;
          selected.push(para);
          total += para.length;
        }

        // 補句號（若最後一段沒句號結尾）
        if (selected.length > 0) {
          const i = selected.length - 1;
          const last = selected[i];
          if (!/[。！？.!?]$/.test(last)) selected[i] = last + "。";
        }

        fileContents.push(selected.join('\n\n'));
        this.logger.log(`[共用爬蟲] 已擷取 ${selected.length} 段內容，總字數 ${total}。`);
      }

    } catch (err) {
      this.logger.warn(`[共用爬蟲] 檔案下載過程發生錯誤: ${pageUrl}，錯誤: ${err.message}`);
    }

    return fileContents;
  }

  /** 🔧 修正：動態爬蟲（傳遞配置參數） */
  private async crawlDynamicCity(
    cityName: string,
    config,
    existingLinks: Set<string>
  ): Promise<any[]> {
    this.logger.log(`🚀 開始動態爬取 ${cityName}`);
    const result: any[] = [];

    try {
      // 🔧 修正：傳遞完整的配置給 Python API
      const requestData = {
        url: config.startUrl,
        city: cityName,
        config: config  // 🆕 傳遞配置參數
      };

      this.logger.log(`[${cityName}] 發送請求到 Python API: ${JSON.stringify(requestData)}`);

      const response = await axios.post(
        "http://localhost:8001/crawl",
        requestData,
        { timeout: 900000 } // 給 15 分鐘
      );

      this.logger.log(`[${cityName}] Python API 回應: ${JSON.stringify(response.data)}`);

      const dataList = response.data?.data;
      if (!Array.isArray(dataList) || dataList.length === 0) {
        this.logger.warn(`[${cityName}] Python API 沒有回傳有效資料`);
        this.logger.warn(`[${cityName}] API 回應內容: ${JSON.stringify(response.data)}`);
        return result;
      }

      for (const data of dataList) {
        if (!data.url) continue;
        if (existingLinks.has(data.url)) {
          this.logger.debug(`[${cityName}] 已存在，略過: ${data.url}`);
          continue;
        }

        result.push(data);
        existingLinks.add(data.url);
        this.logger.log(`[${cityName}] 抓到資料: ${data.title || data.url}`);
      }

      // 🔧 修正：動態爬蟲也採用統一推送模式
      this.logger.log(`[${cityName}] 🚀 動態爬取完成，開始推送 ${result.length} 筆資料到 Redis`);
      
      for (const data of result) {
        try {
          await this.dataQueue.add("process", data, {
            attempts: 3,
            backoff: { type: "fixed", delay: 5000 },
            removeOnComplete: true,
          });
          this.logger.log(`[${cityName}] 資料已新增到 queue: ${data.title || data.url}`);
        } catch (err) {
          this.logger.error(`[${cityName}] Redis 推送失敗: ${data.title || data.url}，錯誤: ${err.message}`);
        }
      }

      this.logger.log(`[${cityName}] ✅ 動態推送完成`);
      
    } catch (err) {
      this.logger.error(`[${cityName}] 動態爬蟲失敗: ${err.message}`);
      this.logger.error(`[${cityName}] 錯誤詳情: ${err.stack}`);
    }

    return result;
  }

  /** strategy 爬蟲 */
  private async crawlWithStrategy(
    cityName: string,
    config,
    result: any[],
    existingLinks: Set<string>
  ): Promise<any[]> {
    const strategyMap: Record<string, any> = {
      yilan: YilanCrawlerStrategy,
      tainan: TainanCrawlerStrategy,
      matsu: LienchiangCrawlerStrategy,
      pingtung: PingtungCrawlerStrategy,
    };

    const StrategyClass = strategyMap[cityName];
    if (!StrategyClass) return [];

    // 將 dataQueue 傳遞給 strategy
    const strategy = new StrategyClass(
      this.downloadAndExtractText.bind(this),
      this.dataQueue // 傳遞 dataQueue
    );

    if (cityName === "matsu") {
      const baseUrl = "https://www.matsu.gov.tw/chhtml/download/371030000A0001/";
      const startPage = 5972;
      const endPage = 5981;

      const pageLinks: string[] = [];
      for (let i = startPage; i <= endPage; i++) {
        pageLinks.push(`${baseUrl}${i}`);
      }

      this.logger.log(`[${cityName}] 共要抓取 ${pageLinks.length} 個固定頁面`);

      const allData: typeof result = [];

      // 先抓完所有頁面的資料，不過濾 existingLinks
      for (const pageUrl of pageLinks) {
        try {
          const data = await strategy.crawlDetailPage(pageUrl);
          if (!data || data.length === 0) continue;

          allData.push(...data); // 先全部放入 allData
        } catch (err) {
          this.logger.warn(`[${cityName}] 內文抓取失敗: ${pageUrl}，${err.message}`);
        }
      }

      this.logger.log(`[${cityName}] 共抓取到 ${allData.length} 筆資料，開始推送 BullMQ`);

      // 推送時再過濾已存在的資料
      for (const d of allData) {
        if (existingLinks.has(d.url)) {
          this.logger.log(`[${cityName}] 已存在資料庫，略過: ${d.url}`);
          continue;
        }

        result.push(d);

        const resultsPath = join(__dirname, "../../output", "results.json");
        await appendJson(resultsPath, d);

        await this.dataQueue.add("process", d, {
          attempts: 3,
          backoff: { type: "fixed", delay: 5000 },
          removeOnComplete: true,
        });
        this.logger.log(`[${cityName}] 推送到 BullMQ: ${d.title}`);
      }

      return result;
    }

    // 使用 strategy 的 crawlWithStrategy 方法（會自動推送到 BullMQ）
    return (await strategy.crawlWithStrategy?.(cityName, config, result, existingLinks)) || result;
  }

  private async runWithConcurrency<T>(
    tasks: (() => Promise<T>)[],
    concurrencyLimit: number
  ): Promise<(T | null)[]> {
    const results: (T | null)[] = [];
    const executing: Promise<T | null>[] = [];

    for (let i = 0; i < tasks.length; i++) {
      const p = tasks[i]()
        .then((res) => {
          results.push(res);
          return res;
        })
        .catch(() => null);

      executing.push(p);

      if (executing.length >= concurrencyLimit) {
        await Promise.race(executing);
        executing.splice(0, 1);
      }
    }

    await Promise.all(executing);
    return results;
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error(`任務逾時 (${timeoutMs}ms)`)), timeoutMs);
      promise.then(res => { clearTimeout(timeout); resolve(res); }).catch(err => { clearTimeout(timeout); reject(err); });
    });
  }

  /** 非阻塞下載檔案解析 - 擷取前三段完整文字 */
  private async downloadAndExtractText(url: string): Promise<string> {
    const res = await fetch(url);
    if (!res.ok) return "";

    const buffer = await res.buffer();
    const fileType = await fileTypeFromBuffer(buffer);
    const ext = fileType?.ext || "bin";

    let text = "";
    try {
      if (ext === "pdf") {
        const data = await pdfParse(buffer);
        text = this.extractFirstThreeParagraphs(data.text);
      } else if (ext === "docx") {
        const result = await mammoth.extractRawText({ buffer });
        text = this.extractFirstThreeParagraphs(result.value);
      } else if (["odt", "txt"].includes(ext) || !fileType?.mime) {
        text = await new Promise<string>((resolve, reject) => {
          const mime = fileType?.mime || "application/octet-stream";
          textract.fromBufferWithMime(mime, buffer, (err, txt) => {
            if (err) return reject(err);
            resolve(this.extractFirstThreeParagraphs(txt));
          });
        });
      }
    } catch (err) {
      this.logger.warn(`📄 解析文件失敗: ${url}，原因: ${err.message}`);
    }
    return text.trim();
  }

  /** 🆕 擷取前三段完整文字 */
  private extractFirstThreeParagraphs(text: string): string {
    if (!text) return "";
    
    // 將文字按段落分割（支援多種換行格式）
    const paragraphs = text
      .split(/\n\s*\n|\r\n\s*\r\n/) // 以空行分段
      .map(p => p.trim())
      .filter(p => p.length > 0); // 過濾空段落
    
    // 如果沒有明顯的段落分隔，嘗試按單個換行分割
    if (paragraphs.length < 2) {
      const lines = text
        .split(/\n|\r\n/)
        .map(line => line.trim())
        .filter(line => line.length > 20); // 過濾太短的行（可能是標題或空行）
      
      return lines.slice(0, 3).join('\n');
    }
    
    // 取前三段
    return paragraphs.slice(0, 3).join('\n\n');
  }
}
