import { Module } from "@nestjs/common";
import { UserService } from "./user.service.js";
import { UserController } from "./user.controller.js";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "./entities/user.entity.js";
import { Location } from "../common/const-data/entities/location.entity.js";
import { Identity } from "../common/const-data/entities/identity.entity.js";
import { Welfare } from "../welfare/entities/welfare.entity.js";

@Module({
  imports: [TypeOrmModule.forFeature([User, Identity, Location, Welfare])],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
