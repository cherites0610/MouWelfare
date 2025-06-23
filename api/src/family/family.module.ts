import { Module } from "@nestjs/common";
import { FamilyService } from "./family.service.js";
import { FamilyController } from "./family.controller.js";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Family } from "./entities/family.entity.js";
import { UserFamilyModule } from "../user-family/user-family.module.js";
import { CacheModule } from "@nestjs/cache-manager";

@Module({
  imports: [
    TypeOrmModule.forFeature([Family]),
    UserFamilyModule,
    CacheModule.register(),
  ],
  controllers: [FamilyController],
  providers: [FamilyService],
  exports: [FamilyService],
})
export class FamilyModule {}
