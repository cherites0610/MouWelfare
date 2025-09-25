import { Module } from "@nestjs/common";
import { CrawlerService } from "./crawler.service.js";
import { CrawlerController } from "./crawler.controller.js";
import { HttpModule } from "@nestjs/axios";
import { BullModule } from "@nestjs/bullmq";
import { DataProcessingService } from "./data-processing.service.js";
import { WelfareModule } from "../welfare/welfare.module.js";
import { WelfareService } from "../welfare/welfare.service.js";
import { AIModule } from "../ai/ai.module.js";
import { GcsService } from "./gcs.service.js";

@Module({
  imports: [
    HttpModule,
    BullModule.registerQueue({
      name: "data-processing",
    }),
    WelfareModule,
    AIModule,
  ],
  controllers: [CrawlerController],
  providers: [CrawlerService, DataProcessingService,GcsService],
})
export class CrawlerModule {}
