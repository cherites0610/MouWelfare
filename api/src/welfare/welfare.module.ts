import { Module } from "@nestjs/common";
import { WelfareService } from "./welfare.service.js";
import { WelfareController } from "./welfare.controller.js";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Welfare } from "./entities/welfare.entity.js";
import { FamilyModule } from "../family/family.module.js";
import { UserModule } from "../user/user.module.js";
import { User } from "../user/entities/user.entity.js";
import { AIModule } from "../ai/ai.module.js";

@Module({
  imports: [
    TypeOrmModule.forFeature([Welfare, User]),
    FamilyModule,
    UserModule,
    AIModule,
  ],
  controllers: [WelfareController],
  providers: [WelfareService],
  exports: [WelfareService],
})
export class WelfareModule {}
