import { Logger } from "@nestjs/common";
import axios from "axios";
import { Queue } from "bullmq";
import * as cheerio from "cheerio";
import { resolveUrl } from "../utils/resolve-url.js";

export class YilanCrawlerStrategy {
  private readonly logger = new Logger(YilanCrawlerStrategy.name);

  constructor(private downloadAndExtractText: (url: string) => Promise<string>,
  private dataQueue: Queue,
  ) {}

  /** 抓公告主頁列表 */
  async crawlListPage(startUrl: string, baseUrl: string): Promise<string[]> {
    this.logger.log(`抓取宜蘭公告主頁: ${startUrl}`);
    const res = await axios.get(startUrl);
    const $ = cheerio.load(res.data);

    const links: string[] = [];
    $(".group.base-section .group-list .in .ct .in ul li a").each((_, el) => {
      const href = $(el).attr("href");
      if (href) links.push(resolveUrl(baseUrl, href));
    });

    return links;
  }

  /** 抓每個公告分類內的公告列表 */
  async crawlSubPages(listUrl: string, baseUrl: string): Promise<string[]> {
    this.logger.log(`抓取分類頁: ${listUrl}`);
    const res = await axios.get(listUrl);
    const $ = cheerio.load(res.data);

    const links: string[] = [];
    $(".area-table .in .ct .in a").each((_, el) => {
      const href = $(el).attr("href");
      if (href) links.push(resolveUrl(baseUrl, href));
    });

    this.logger.log(`抓到 ${links.length} 個公告頁`);
    return links;
  }

  /** 抓每個公告內文（🆕 新增檔案下載功能） */
  async extractData(detailUrl: string, baseUrl: string, config?: any) {
    this.logger.log(`抓取公告內文: ${detailUrl}`);
    const res = await axios.get(detailUrl);
    const $ = cheerio.load(res.data);

    // 抓上版日期並轉西元
    const rawDate = $(".group.page-footer .list-text.detail .in ul li")
      .text()
      .trim();
    const match = rawDate.match(/\d{3}-\d{2}-\d{2}/);
    const isoDate = match ? this.rocDateToISO(match[0]) : null;

    // 內文
    const contentElements = $(".div").clone();
    let content = contentElements
      .map((_, el) => $(el).text().trim().replace(/\s+/g, " "))
      .get()
      .join(" ")
      .trim();

    // 🆕 檔案下載功能
    if (config?.downloadData) {
      try {
        const fileContents = await this.downloadFilesFromPage($, config, baseUrl, detailUrl);
        if (fileContents.length > 0) {
          const allFileContent = fileContents.join('');
          content += allFileContent;
          this.logger.log(`[宜蘭] 成功整合 ${fileContents.length} 個檔案內容到: ${detailUrl}`);
        }
      } catch (err) {
        this.logger.warn(`[宜蘭] 檔案下載整合失敗: ${detailUrl}，錯誤: ${err.message}`);
      }
    }

    return {
      city: "宜蘭縣",
      url: detailUrl,
      title: $(".in h3").text().trim(),
      date: isoDate,
      content,
    };
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
        this.logger.debug(`[宜蘭] 沒有找到下載連結: ${pageUrl}`);
        return fileContents;
      }

      this.logger.log(`[宜蘭] 找到 ${downloadLinks.length} 個下載連結: ${downloadLinks.join(', ')}`);

      // 並行下載前三個檔案並提取內容
      const downloadPromises = downloadLinks.map(async (downloadUrl, index) => {
        try {
          this.logger.debug(`[宜蘭] 開始下載檔案 ${index + 1}: ${downloadUrl}`);
          const fileContent = await this.downloadAndExtractText(downloadUrl);
          if (fileContent) {
            this.logger.log(`[宜蘭] 成功提取檔案內容 ${index + 1}: ${downloadUrl.split('/').pop()}`);
            return `\n\n--- 附件 ${index + 1} 內容 ---\n${fileContent}`;
          }
          return '';
        } catch (err) {
          this.logger.warn(`[宜蘭] 下載檔案失敗: ${downloadUrl}，錯誤: ${err.message}`);
          return '';
        }
      });

      const results = await Promise.all(downloadPromises);
      fileContents.push(...results.filter(content => content.length > 0));
      
    } catch (err) {
      this.logger.warn(`[宜蘭] 檔案下載過程發生錯誤: ${pageUrl}，錯誤: ${err.message}`);
    }

    return fileContents;
  }

  /** 🆕 完整的爬蟲流程（整合檔案下載） */
  async crawlWithStrategy(
  cityName: string,
  config,
  result: any[],
  existingLinks: Set<string>
): Promise<any[]> {
  const newData: any[] = [];

  // 1️⃣ 抓公告主頁 → 所有分類頁
  const categoryLinks = await this.crawlListPage(config.startUrl, config.baseUrl);
  this.logger.log(`[${cityName}] 找到 ${categoryLinks.length} 個分類頁`);

  for (const categoryUrl of categoryLinks) {
    try {
      // 2️⃣ 抓分類頁 → 所有公告連結
      const announcementLinks = await this.crawlSubPages(categoryUrl, config.baseUrl);
      this.logger.log(`[${cityName}] ${categoryUrl} 抓到 ${announcementLinks.length} 個公告`);

      for (const detailUrl of announcementLinks) {
        try {
          if (existingLinks.has(detailUrl)) {
            this.logger.debug(`[${cityName}] 已存在，跳過: ${detailUrl}`);
            continue;
          }

          // 3️⃣ 抓公告內文
          const data = await this.extractData(detailUrl, config.baseUrl, config);
          if (!data || !data.content) continue;

          result.push(data);
          newData.push(data); // 先放到暫存陣列
          existingLinks.add(detailUrl);

          this.logger.log(`[${cityName}] 成功抓取: ${data.title}`);
        } catch (err) {
          this.logger.warn(`[${cityName}] 公告抓取失敗: ${detailUrl}，錯誤: ${err.message}`);
        }
      }
    } catch (err) {
      this.logger.warn(`[${cityName}] 分類頁處理失敗: ${categoryUrl}，錯誤: ${err.message}`);
    }
  }

  // 4️⃣ 全部抓完後再推送到 BullMQ
  if (newData.length > 0) {
    await this.dataQueue.addBulk(
      newData.map((data) => ({
        name: "process",
        data,
        opts: {
          attempts: 3,
          backoff: { type: "fixed", delay: 5000 },
          removeOnComplete: true,
        },
      }))
    );
    this.logger.log(`[${cityName}] 已批次推送 ${newData.length} 筆資料到 BullMQ`);
  } else {
    this.logger.log(`[${cityName}] 沒有新資料需要推送`);
  }

  return result;
}

  /** 民國轉西元 */
  private rocDateToISO(rocDate: string): string | null {
    const match = rocDate.match(/^(\d{3})-(\d{2})-(\d{2})$/);
    if (!match) return null;
    const year = parseInt(match[1], 10) + 1911;
    const month = match[2];
    const day = match[3];
    return `${year}-${month}-${day}`;
  }
}
