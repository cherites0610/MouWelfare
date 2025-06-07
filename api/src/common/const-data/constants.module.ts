import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConstDataService } from './const-data.service';
import { Location } from './entities/location.entity';
import { Identity } from './entities/identity.entity';
import { Category } from './entities/category.entity';
import { FaqItem } from './entities/faq-item.entity';
import { ConstDataController } from './const-data.controller';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Location, Identity, Category, FaqItem])],
  controllers: [ConstDataController],
  providers: [ConstDataService],
  exports: [ConstDataService],
})
export class ConstantsModule { }
