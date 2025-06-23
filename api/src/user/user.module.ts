import { Module } from "@nestjs/common";
import { UserService } from "./user.service";
import { UserController } from "./user.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "./entities/user.entity";
import { Identity } from "src/common/const-data/entities/identity.entity";
import { Location } from "src/common/const-data/entities/location.entity";
import { Welfare } from "src/welfare/entities/welfare.entity";

@Module({
  imports: [TypeOrmModule.forFeature([User, Identity, Location, Welfare])],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
