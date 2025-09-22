import { Logger } from "@nestjs/common";
import axios from "axios";
import * as cheerio from "cheerio";
import { resolveUrl } from "../utils/resolve-url.js";

export class LienchiangCrawlerStrategy {
  private readonly logger = new Logger(LienchiangCrawlerStrategy.name);
  private city = "連江市";

  constructor(private downloadAndExtractText: (url: string, maxPages?: number) => Promise<string>) {}

  /** 統一處理內頁 */
  async crawlDetailPage(url: string) {
    this.logger.debug(`處理內頁: ${url}`);

    let title = "";
    let content = "";

    try {
      if (url.includes("/download/")) {
        ({ title, content } = await this.handleDownload(url));
      } else if (url.includes("/news/")) {
        ({ title, content } = await this.handleNews(url));
      } else if (url.includes("/content/")) {
        ({ title, content } = await this.handleContent(url));
      } else {
        // 其他可能直接就是檔案
        content = await this.downloadAndExtractText(url, 3);
        title = url.split("/").pop() || "檔案";
      }
    } catch (err) {
      this.logger.warn(`抓取內頁失敗: ${url}，原因: ${err.message}`);
      return null;
    }

    if (!content) {
      this.logger.warn(`[跳過] ${url} 無內文`);
      return null;
    }

    return { city: this.city, url, title, date: "", content };
  }

  /** /download/ 處理 */
  private async handleDownload(pageUrl: string) {
    const $ = await this.loadPage(pageUrl);
    const title = $(".DSECOND p").text().trim();
    const fileLink = $(".DTHREE a").attr("href");
    if (!fileLink) return { title, content: "" };

    const absoluteFileUrl = resolveUrl(pageUrl, fileLink);
    const content = await this.downloadAndExtractText(absoluteFileUrl, 3);
    return { title, content };
  }

  /** /news/ 處理 */
  private async handleNews(pageUrl: string) {
    const $ = await this.loadPage(pageUrl);
    const aTag = $(".FROM a").first();
    const title = aTag.attr("title")?.trim() || "無標題";
    const href = aTag.attr("href");
    if (!href) return { title, content: "" };

    const absoluteFileUrl = resolveUrl(pageUrl, href);
    const content = await this.downloadAndExtractText(absoluteFileUrl, 3);
    return { title, content };
  }

  /** /content/ 處理 */
  private async handleContent(url: string) {
    const $ = await this.loadPage(url);
    const title = $("title").text().trim() || $(".FROM").text().slice(0, 30);
    const content = $(".FROM").text().trim();
    return { title, content };
  }

  /** 取得 cheerio */
  private async loadPage(url: string) {
    const res = await axios.get(url, { responseType: "arraybuffer" });
    return cheerio.load(res.data.toString("utf8"));
  }
}
