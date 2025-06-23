import { Module } from "@nestjs/common";
import { WelfareService } from "./welfare.service";
import { WelfareController } from "./welfare.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Welfare } from "./entities/welfare.entity";
import { FamilyModule } from "src/family/family.module";
import { UserModule } from "src/user/user.module";

@Module({
  imports: [TypeOrmModule.forFeature([Welfare]), FamilyModule, UserModule],
  controllers: [WelfareController],
  providers: [WelfareService],
  exports: [WelfareService],
})
export class WelfareModule {}
