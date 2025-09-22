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
import * as fs from "fs";
import * as path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

@Injectable()
export class CrawlerService {
  private readonly logger = new Logger(CrawlerService.name);
  private readonly concurrency = 10;
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
    await fsExtra.writeFile(
      outputPath,
      JSON.stringify(allResults, null, 2),
      "utf8"
    );
    this.logger.log(`原始資料已輸出至 ${outputPath}`);

    this.logger.log(`所有城市爬取完成`);
    for (const result of allResults) {
      await this.dataQueue.add("process", result, {
        attempts: 3,
        backoff: { type: "fixed", delay: 5000 },
        removeOnComplete: true,
      });
      this.logger.log(`已將資料推送到隊列: ${result.url}`);
    }
  }

  private async crawlSingleCity(
    cityName: string,
    config,
    existingLinks: Set<string>
  ): Promise<any[]> {
    this.logger.log(`🔍 開始爬取 ${cityName}`);
    const cityResults = await this.bfsCrawl(cityName, config, existingLinks);
    this.logger.log(`✅ 完成爬取 ${cityName}，共 ${cityResults.length} 筆`);
    return cityResults;
  }

  // 靜態爬蟲策略
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
    };

    const StrategyClass = strategyMap[cityName];
    if (!StrategyClass) return [];

    const strategy = new StrategyClass(this.downloadAndExtractText.bind(this));

    if (cityName === "matsu") {
      // matsu 特殊流程
      const res = await axios.get(config.startUrl);
      const $ = cheerio.load(res.data);
      const categoryLinks = $(config.levels[0].selector)
        .map((_, el) => $(el).attr(config.levels[0].getUrlAttr))
        .get()
        .filter(Boolean)
        .map((l) => resolveUrl(config.baseUrl, l));

      this.logger.log(`[${cityName}] 大分類抓到 ${categoryLinks.length} 個`);

      for (const catUrl of categoryLinks) {
        const resCat = await axios.get(catUrl);
        const $cat = cheerio.load(resCat.data);
        const links = $cat("a")
          .map((_, el) => $(el).attr("href"))
          .get()
          .filter(Boolean)
          .map((l) => resolveUrl(catUrl, l));

        for (const detailUrl of links) {
          try {
            const data = await strategy.crawlDetailPage(detailUrl);
            if (!data || !data.content) continue;
            if (existingLinks.has(data.url)) continue;

            result.push(data);
            const resultsPath = join(__dirname, "../../output", "results.json");
            await appendJson(resultsPath, data);

            await this.dataQueue.add("process", data, {
              attempts: 3,
              backoff: { type: "fixed", delay: 5000 },
              removeOnComplete: true,
            });
            this.logger.log(`[${cityName}] 抓到資料: ${data.title}`);
          } catch (err) {
            this.logger.warn(`[${cityName}] 內文抓取失敗: ${detailUrl}，${err.message}`);
          }
        }
      }

      return result; // matsu 特殊流程完成後直接 return
    }

    // 其他城市使用 strategy
    return (await strategy.crawlWithStrategy?.(cityName, config, result, existingLinks)) || result;
  }

  //動態爬蟲
  private async crawlDynamicCity(
    cityName: string,
    config,
    existingLinks: Set<string>
  ): Promise<any[]> {
    this.logger.log(`🚀 開始動態爬取 ${cityName}`);
    const result: any[] = [];

    try {
      const response = await axios.post(
        "http://localhost:8001/crawl",
        { url: config.startUrl, city: cityName },
        { timeout: 600000 } // 給 10 分鐘
      );

      const dataList = response.data?.data;
      if (!Array.isArray(dataList) || dataList.length === 0) {
        this.logger.warn(`[${cityName}] Python API 沒有回傳有效資料`);
        return result;
      }

      for (const data of dataList) {
        if (!data.url) continue;
        if (existingLinks.has(data.url)) {
          this.logger.debug(`[${cityName}] 已存在，略過: ${data.url}`);
          continue;
        }

        result.push(data);

        // ⚠️ 動態爬蟲不寫 results.json，只推到 BullMQ
        await this.dataQueue.add("process", data, {
          attempts: 3,
          backoff: { type: "fixed", delay: 5000 },
          removeOnComplete: true,
        });

        this.logger.log(`[${cityName}] 已新增到 queue: ${data.url}`);
      }
    } catch (err) {
      this.logger.warn(`[${cityName}] 動態爬蟲失敗: ${err.message}`);
    }

    return result;
  }

  private async bfsCrawl(
    cityName: string,
    config,
    existingLinks: Set<string>
  ): Promise<any[]> {
    const { city: cityDisplayName } = config;
    const result: any[] = [];

    const dynamicCities = ["taipei", "nantou"];
    const staticCities = ["yilan", "tainan", "matsu"];

    if (dynamicCities.includes(cityName)) {
      return await this.crawlDynamicCity(cityName, config, existingLinks);
    }

    if (staticCities.includes(cityName)) {
      return await this.crawlWithStrategy(cityName, config, result, existingLinks);
    }

    // 其他城市 BFS
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

          if ($(config.stopSelector).length > 0) {
            if (existingLinks.has(url)) return;

            const rawDate = $(config.extractSelectors.date).text().trim();
            const isoDate = parseDateToISO(rawDate);

            let content = "";
            const contentElements = $(config.extractSelectors.content).clone();
            contentElements.find('#download a').remove();
            content = contentElements
              .map((_, el) => $(el).text().trim().replace(/\s+/g, " "))
              .get()
              .join(" ")
              .trim();

            if (config.downloadSelector) {
              const downloadLinks = $(config.downloadSelector)
                .map((_, el) => $(el).attr("href"))
                .get()
                .filter(Boolean);

              for (const link of downloadLinks) {
                const fileUrl = resolveUrl(config.baseUrl, link);
                try {
                  const fileText = await this.downloadAndExtractText(fileUrl);
                  if (fileText) content += "\n" + fileText;
                } catch {}
              }
            }

            const trimmedContent = content.trim();
            if (!trimmedContent) return;

            const data = {
              city: cityDisplayName,
              url,
              title: $(config.extractSelectors.title).text().trim(),
              date: isoDate,
              content: trimmedContent,
            };

            result.push(data);
            const resultsPath = join(outputDir, "results.json");
            await appendJson(resultsPath, data);
          }

          const levelConfig = config.levels[level];
          if (!levelConfig) return;

          $(levelConfig.selector).each((_, el) => {
            const nextUrlRaw = $(el).attr(levelConfig.getUrlAttr);
            if (nextUrlRaw) queue.push({ url: resolveUrl(config.baseUrl, nextUrlRaw), level: level + 1 });
          });
        } catch (err) {
          this.logger.warn(`[${taskId}] 訪問失敗 ${url}，錯誤：${err.message}`);
        }
      });

      await this.runWithConcurrency(tasks, this.concurrency);
    }

    return result;
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

  private async downloadAndExtractText(url: string): Promise<string> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`無法下載文件: ${url}`);

    const buffer = await res.buffer();
    const fileType = await fileTypeFromBuffer(buffer);
    const ext = fileType?.ext || "bin";

    let text = "";
    try {
      if (ext === "pdf") {
        const data = await pdfParse(buffer);
        text = data.text.split("\n\n").slice(0, 3).join("\n\n");
      } else if (ext === "docx") {
        const result = await mammoth.extractRawText({ buffer });
        text = result.value.split("\n").slice(0, 100).join("\n");
      } else if (["odt", "txt"].includes(ext) || !fileType?.mime) {
        text = await new Promise<string>((resolve, reject) => {
          const mime = fileType?.mime || "application/octet-stream";
          textract.fromBufferWithMime(mime, buffer, (err, txt) => {
            if (err) return reject(err);
            resolve(txt.split("\n").slice(0, 100).join("\n"));
          });
        });
      } else throw new Error(`不支援的文件格式: ${ext}`);
    } catch (err) {
      this.logger.warn(`📄 解析文件失敗: ${url}，原因: ${err.message}`);
    }

    return text.trim();
  }
}
