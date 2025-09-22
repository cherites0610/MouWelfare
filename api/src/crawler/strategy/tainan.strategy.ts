import { Logger } from "@nestjs/common";
import axios from "axios";
import * as cheerio from "cheerio";
import { resolveUrl } from "../utils/resolve-url.js";
import { parseDateToISO } from "../utils/parse-date.js";

export class TainanCrawlerStrategy {
  private readonly logger = new Logger(TainanCrawlerStrategy.name);

  constructor(private downloadAndExtractText: (url: string) => Promise<string>) {}

  /** 抓公告主頁列表 */
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

  /** 抓每個主頁裡面的子列表 */
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

  /** 抓每個子頁裡面的最內頁 */
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

/** 抓內文頁 */
async extractData(pageUrl: string, baseUrl: string): Promise<any | null> {
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

  if (!content) {
    const downloadLinks = $(".group-list.file-download-multiple a")
      .map((_, el) => $(el).attr("href"))
      .get()
      .filter(Boolean)
      .map((href) => resolveUrl(baseUrl, href));

    this.logger.log(`📎 附件數量: ${downloadLinks.length}`);

    for (const link of downloadLinks) {
      try {
        const fileText = await this.downloadAndExtractText(link);
        if (fileText) content += fileText.replace(/\s+/g, " ").trim();
      } catch (err) {
        this.logger.warn(`📄 附件解析失敗: ${link}，原因: ${err.message}`);
      }
    }
  }

  this.logger.log(`✅ 完成抓取內文頁: ${pageUrl}, 內容長度: ${content.length}`);

  return { city: "台南市", url: pageUrl, title, date: finalDate, content };
}
}
