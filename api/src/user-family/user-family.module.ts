import { Module } from "@nestjs/common";
import { UserFamilyService } from "./user-family.service.js";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UserFamily } from "./entities/user-family.entity.js";
import { User } from "../user/entities/user.entity.js";
import { Family } from "../family/entities/family.entity.js";

@Module({
  imports: [TypeOrmModule.forFeature([UserFamily, User, Family])],
  providers: [UserFamilyService],
  exports: [UserFamilyService],
})
export class UserFamilyModule {}
