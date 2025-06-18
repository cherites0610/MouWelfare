import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { loadCityConfigs } from './config/read-config';
import { Queue } from 'bullmq';
import { writeFileSync } from 'fs';
import path, { join } from 'path';
import { parseDateToISO } from './utils/parse-date';
import { resolveUrl } from './utils/resolve-url';
import mammoth from 'mammoth';
import pdfParse from 'pdf-parse';
import * as fs from 'fs/promises';
import fetch from 'node-fetch';
import { fileTypeFromBuffer } from 'file-type';
import textract from 'textract';
import { InjectQueue } from '@nestjs/bullmq';
import { WelfareService } from 'src/welfare/welfare.service';

// 定義爬取結果的資料結構
interface CrawlData {
  city: string;
  url: string;
  title: string;
  date: string;
  content: string;
}

@Injectable()
export class CrawlerService {
  private readonly logger = new Logger(CrawlerService.name);
  private readonly concurrency = 10; // 每個城市的並發數限制
  private readonly timeoutMs = 15000; // 單一任務逾時時間

  constructor(
    @InjectQueue('data-processing')
    private readonly dataQueue: Queue,
    private readonly welfareService: WelfareService

  ) { }

  async crawlAllCities(): Promise<void> {
    const existingLinks = new Set(await this.welfareService.findAllLink());
    const config = loadCityConfigs();

    const cityTasks = Object.entries(config).map(([cityName, cityConfig]) =>
      this.crawlSingleCity(cityName, cityConfig, existingLinks),
    );

    const allResultsNested = await Promise.all(cityTasks);
    const allResults = allResultsNested.flat();

    const outputPath = join(__dirname, '../../output/results.json');
    writeFileSync(outputPath, JSON.stringify(allResults, null, 2), 'utf8');
    this.logger.log(`原始資料已輸出至 ${outputPath}`);

    this.logger.log(`所有城市爬取完成`);
    // 將所有結果推送到 BullMQ 隊列
    for (const result of allResults) {
      await this.dataQueue.add('process', result, {
        attempts: 3, // 重試次數
        backoff: { type: 'fixed', delay: 5000 }, // 重試間隔 5 秒
        removeOnComplete: true,
      });
      this.logger.log(`已將資料推送到隊列: ${result.url}`);
    }
    

  }

  private async crawlSingleCity(cityName: string, config, existingLinks: Set<string>): Promise<any[]> {
    this.logger.log(`🔍 開始爬取 ${cityName}`);
    const cityResults = await this.bfsCrawl(cityName, config, existingLinks);
    this.logger.log(`✅ 完成爬取 ${cityName}，共 ${cityResults.length} 筆`);
    return cityResults;
  }

  private async bfsCrawl(cityName: string, config, existingLinks: Set<string>): Promise<any[]> {
    const { baseUrl, city: cityDisplayName } = config;

    const queue: { url: string; level: number }[] = [{ url: config.startUrl, level: 0 }];
    const result: any[] = [];

    while (queue.length) {
      const currentBatch = queue.splice(0, this.concurrency);

      const tasks = currentBatch.map(({ url, level }, index) => async () => {
        const taskId = `${cityName}-${level}-${index}`;
        try {
          this.logger.debug(`[${taskId}] 開始處理 ${url}`);
          const response = await this.withTimeout(axios.get(url), this.timeoutMs);
          const $ = cheerio.load(response.data);

          // 最深層資料擷取
          if ($(config.stopSelector).length > 0) {
            if (existingLinks.has(url)) {
              this.logger.debug(`[跳過] ${url} 已存在於資料庫中`);
              return;
            }

            this.logger.log(`[最深層] ${url}`);
            const rawDate = $(config.extractSelectors.date).text().trim();
            const isoDate = parseDateToISO(rawDate);
            // 解析最深層的文字內容或文件下載
            let content = '';

            const contentElements = $(config.extractSelectors.content);
            if (contentElements.length) {
              content = contentElements
                .map((_, el) => $(el).text().trim().replace(/\s+/g, ' '))
                .get()
                .join(' ')
                .replace(/\s+/g, ' ')
                .trim();
            } else if (config.downloadSelector) {
              const downloadLinks = $(config.downloadSelector)
                .map((_, el) => $(el).attr('href'))
                .get()
                .filter(Boolean);

              for (const link of downloadLinks) {
                const fileUrl = resolveUrl(baseUrl, link);
                try {
                  const text = await this.downloadAndExtractText(fileUrl);
                  if (text) {
                    content += '\n' + text;
                  }
                } catch (e) {
                  this.logger.warn(`📄 解析失敗：${fileUrl}，原因：${e.message}`);
                }
              }
            }

            const data = {
              city: cityDisplayName,
              url,
              title: $(config.extractSelectors.title).text().trim(),
              date: isoDate,
              content: content.length === 0 ? "無内文" : content,
            };

            result.push(data);
            return;
          }

          // 中間層收集下一層 URL
          const levelConfig = config.levels[level];
          if (!levelConfig) return;

          $(levelConfig.selector).each((_, el) => {
            const nextUrlRaw = $(el).attr(levelConfig.getUrlAttr);
            if (nextUrlRaw) {
              const nextUrl = resolveUrl(baseUrl, nextUrlRaw);
              queue.push({ url: nextUrl, level: level + 1 });
            }
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
    concurrencyLimit: number,
  ): Promise<(T | null)[]> {
    const results: (T | null)[] = [];
    const executing: Promise<T | null>[] = [];

    for (let i = 0; i < tasks.length; i++) {
      const p = tasks[i]()
        .then((res) => {
          results.push(res);
          return res;
        })
        .catch(() => null); // 防止某個任務失敗中斷全部

      executing.push(p);
      this.logger.debug(`🌀 目前併發任務數：${executing.length}`);

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
      const timeout = setTimeout(() => {
        reject(new Error(`任務逾時 (${timeoutMs}ms)`));
      }, timeoutMs);

      promise
        .then((result) => {
          clearTimeout(timeout);
          resolve(result);
        })
        .catch((err) => {
          clearTimeout(timeout);
          reject(err);
        });
    });
  }

  private async downloadAndExtractText(url: string): Promise<string> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`無法下載文件: ${url}`);
    this.logger.debug(`下載文件${url}`)

    const buffer = await res.buffer();
    const fileType = await fileTypeFromBuffer(buffer);

    const ext = fileType?.ext || 'bin';
    const tempFilePath = path.join('/tmp', `temp-file.${ext}`);
    await fs.writeFile(tempFilePath, buffer);

    let text = '';
    try {
      if (ext === 'pdf') {
        const data = await pdfParse(buffer);
        const pages = data.text.split('\n\n').slice(0, 3); // 最多三頁
        text = pages.join('\n\n');
      } else if (ext === 'docx') {
        const result = await mammoth.extractRawText({ buffer });
        text = result.value.split('\n').slice(0, 100).join('\n');
      } else if (['odt', 'txt'].includes(ext)) {
        if (!fileType || !fileType.mime) {
          throw new Error(`無法判斷檔案 MIME 類型: ${ext}`);
        }
        text = await new Promise<string>((resolve, reject) => {
          textract.fromBufferWithMime(fileType.mime, buffer, (err, txt) => {
            if (err) return reject(err);
            resolve(txt.split('\n').slice(0, 100).join('\n'));
          });
        });
      } else {
        throw new Error(`不支援的文件格式: ${ext}`);
      }
    } finally {
      // 確保刪除臨時檔
      try {
        await fs.unlink(tempFilePath);
      } catch {
        // 忽略刪除失敗
      }
    }

    return text.trim();
  }
}
