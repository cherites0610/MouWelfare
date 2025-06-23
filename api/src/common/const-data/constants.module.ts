import { Global, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConstDataService } from "./const-data.service.js";
import { Location } from "./entities/location.entity.js";
import { Identity } from "./entities/identity.entity.js";
import { Category } from "./entities/category.entity.js";
import { FaqItem } from "./entities/faq-item.entity.js";
import { ConstDataController } from "./const-data.controller.js";

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Location, Identity, Category, FaqItem])],
  controllers: [ConstDataController],
  providers: [ConstDataService],
  exports: [ConstDataService],
})
export class ConstantsModule {}
