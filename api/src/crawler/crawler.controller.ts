import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from "@nestjs/common";
import { CrawlerService } from "./crawler.service";
import { Public } from "src/common/decorators/public.decorator";

@Controller("crawler")
export class CrawlerController {
  constructor(private readonly crawlerService: CrawlerService) {}

  @Public()
  @Get("run")
  async run() {
    await this.crawlerService.crawlAllCities();
    return { message: "爬蟲執行完畢，請查看 output/results.json" };
  }
}
