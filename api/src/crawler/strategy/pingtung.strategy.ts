import { fileURLToPath } from "url";
import { dirname, join } from "path";
import fsExtra from "fs-extra";
import { Logger } from "@nestjs/common";
import axios from "axios";
import * as cheerio from "cheerio";
import { resolveUrl } from "../utils/resolve-url.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class PingtungCrawlerStrategy {
  private readonly logger = new Logger(PingtungCrawlerStrategy.name);
  private city = "屏東縣";
  private outputDir = join(__dirname, "../../output");
  private outputPath = join(this.outputDir, "results.json");

  constructor(
    private downloadAndExtractText: (url: string) => Promise<string>,
    private dataQueue: any
  ) {}

  private async appendToResultFile(data: any) {
    try {
      await fsExtra.ensureDir(this.outputDir);
      if (!(await fsExtra.pathExists(this.outputPath))) {
        await fsExtra.writeJson(this.outputPath, [], { spaces: 2 });
      }
      const fileData = await fsExtra.readJson(this.outputPath);
      fileData.push(data);
      await fsExtra.writeJson(this.outputPath, fileData, { spaces: 2 });
    } catch (err) {
      this.logger.error(`❌ 寫入 results.json 失敗: ${err.message}`);
    }
  }

  // 新增：直接獲取 HTML 的方法
  private async fetchHtml(url: string): Promise<string | null> {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        timeout: 10000,
      });
      return response.data;
    } catch (err) {
      this.logger.error(`❌ 獲取 HTML 失敗 ${url}: ${err.message}`);
      return null;
    }
  }

  async crawlWithStrategy(cityName: string, config, result: any[], existingLinks: Set<string>) {
    this.logger.log(`🚀 開始爬取 ${cityName}`);

    const startUrl = config.startUrl;
    const res = await axios.get(startUrl);
    const $ = cheerio.load(res.data);

    const categoryLinks: string[] = $(config.levels[0].selector)
      .map((_, el) => {
        const href = $(el).attr(config.levels[0].getUrlAttr);
        return href ? resolveUrl(config.baseUrl, href) : null;
      })
      .get()
      .filter((x): x is string => !!x);

    this.logger.log(`📋 找到 ${categoryLinks.length} 個分類`);

    for (const categoryUrl of categoryLinks) {
      const gtype = new URL(categoryUrl).searchParams.get("gtype");
      if (!gtype) continue;

      const queryUrl = `https://socmap.pthg.gov.tw/pt1w/sa100/query?mobile=&gtype=${gtype}`;
      this.logger.log(`📂 分類 ${gtype}: ${queryUrl}`);

      try {
        const listRes = await axios.get(queryUrl, {
          headers: { "X-Requested-With": "XMLHttpRequest" },
        });

        let listLinks: string[] = [];

        if (typeof listRes.data === 'object' && !listRes.data.includes) {
          const items = listRes.data.data || listRes.data.list || listRes.data;
          listLinks = items
            .map(item => {
              const url = item.url || item.link || item.href;
              return url ? resolveUrl(config.baseUrl, url) : null;
            })
            .filter((x): x is string => !!x);
        } else {
          const $$ = cheerio.load(listRes.data);
          listLinks = $$(config.levels[1].selector)
            .map((_, el) => {
              const href = $$(el).attr(config.levels[1].getUrlAttr);
              return href ? resolveUrl(config.baseUrl, href) : null;
            })
            .get()
            .filter((x): x is string => !!x);
        }

        this.logger.log(`📄 找到 ${listLinks.length} 個項目連結`);

        for (const itemUrl of listLinks) {
          if (existingLinks.has(itemUrl)) {
            this.logger.log(`⏭️ 跳過已處理: ${itemUrl}`);
            continue;
          }

          // ✅ 關鍵修改：直接獲取 HTML 而不是用 downloadAndExtractText
          const html = await this.fetchHtml(itemUrl);

          if (!html) {
            this.logger.warn(`⚠️ 無法獲取 HTML，略過: ${itemUrl}`);
            continue;
          }

          const $$$ = cheerio.load(html);
          
          // 使用 config 中的選擇器
          const title = $$$(config.extractSelectors.title).text().trim();
          const content = $$$(config.extractSelectors.content).text().trim();

          // Debug: 如果沒抓到內容，輸出 HTML 結構
          if (!title && !content) {
            this.logger.warn(`⚠️ 標題與內容皆空: ${itemUrl}`);
            this.logger.debug(`HTML 片段: ${html.substring(0, 500)}`);
            
            // 嘗試其他可能的選擇器
            const alternativeContent = $$$('.mainContent').text().trim();
            if (alternativeContent) {
              this.logger.log(`✅ 使用替代選擇器找到內容`);
            }
          }

          const data = {
            city: this.city,
            url: itemUrl,
            title: title || '無標題',
            date: "",
            content: content || $$$(config.stopSelector).text().trim(),
          };

          result.push(data);
          existingLinks.add(itemUrl);

          await this.appendToResultFile(data);

          await this.dataQueue.add("process", data, {
            attempts: 3,
            backoff: { type: "fixed", delay: 5000 },
            removeOnComplete: true,
          });

          this.logger.log(`✅ 已處理: ${data.title}`);

          // 避免請求過快
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (err: any) {
        this.logger.error(`❌ 抓取 ${queryUrl} 失敗: ${err.message}`);
      }
    }

    return result;
  }
}
