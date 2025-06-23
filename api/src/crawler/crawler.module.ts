import { Module } from "@nestjs/common";
import { CrawlerService } from "./crawler.service.js";
import { CrawlerController } from "./crawler.controller.js";
import { HttpModule } from "@nestjs/axios";
import { BullModule } from "@nestjs/bullmq";
import { DataProcessingService } from "./data-processing.service.js";
import { WelfareModule } from "../welfare/welfare.module.js";
import { WelfareService } from "../welfare/welfare.service.js";

@Module({
  imports: [
    HttpModule,
    BullModule.registerQueue({
      name: "data-processing",
    }),
    WelfareModule,
  ],
  controllers: [CrawlerController],
  providers: [CrawlerService, DataProcessingService],
})
export class CrawlerModule {}
