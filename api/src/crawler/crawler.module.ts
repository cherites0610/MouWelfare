import { Module } from '@nestjs/common';
import { CrawlerService } from './crawler.service';
import { CrawlerController } from './crawler.controller';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bullmq';
import { DataProcessingService } from './data-processing.service';
import { WelfareModule } from 'src/welfare/welfare.module';
import { WelfareService } from 'src/welfare/welfare.service';

@Module({
  imports: [
    HttpModule,
    BullModule.registerQueue({
      name: 'data-processing',
    }),
    WelfareModule
  ],
  controllers: [CrawlerController],
  providers: [CrawlerService, DataProcessingService],
})
export class CrawlerModule { }
