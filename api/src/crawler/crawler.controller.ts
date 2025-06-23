import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from "@nestjs/common";
import { CrawlerService } from "./crawler.service.js";
import { Public } from "../common/decorators/public.decorator.js";

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
