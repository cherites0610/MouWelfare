import { Module } from '@nestjs/common';
import { FamilyService } from './family.service';
import { FamilyController } from './family.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Family } from './entities/family.entity';
import { UserFamilyModule } from 'src/user-family/user-family.module';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    TypeOrmModule.forFeature([Family]),
    UserFamilyModule,
    CacheModule.register()
  ],
  controllers: [FamilyController],
  providers: [FamilyService],
  exports: [FamilyService]
})
export class FamilyModule {}
