import { Logger } from "@nestjs/common";
import axios from "axios";
import * as cheerio from "cheerio";
import { resolveUrl } from "../utils/resolve-url.js";

export class YilanCrawlerStrategy {
  private readonly logger = new Logger(YilanCrawlerStrategy.name);

  constructor(private downloadAndExtractText: (url: string) => Promise<string>) {}

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

  // 只取前 13 個
  const limitedLinks = links.slice(0, 13);

  this.logger.log(`抓到 ${limitedLinks.length} 個公告分類（最多 13 個）`);
  return limitedLinks;
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

  /** 抓每個公告內文 */
async extractData(detailUrl: string, baseUrl: string) {
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
  const content = contentElements
    .map((_, el) => $(el).text().trim().replace(/\s+/g, " "))
    .get()
    .join(" ")
    .trim();

  // 如果沒有內容就跳過
  if (!content) {
    this.logger.warn(`[跳過] ${detailUrl} 無內文`);
    return null;
  }

  return {
    city: "宜蘭市",
    url: detailUrl,
    title: $(".in h3").text().trim(),
    date: isoDate,
    content,
  };
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
