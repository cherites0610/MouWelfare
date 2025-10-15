import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from "@nestjs/common";
import { FamilyService } from "./family.service.js";
import { CreateFamilyDto } from "./dto/create-family.dto.js";
import { UserID } from "../common/decorators/user-id.decorator.js";
import { ResponseDTO } from "../common/dto/response.dto.js";
import { FamilyRole } from "../common/enum/role.enum.js";

@Controller("family")
export class FamilyController {
  constructor(private readonly familyService: FamilyService) {}

  @Post()
  async create(
    @UserID() userID: string,
    @Body() createFamilyDto: CreateFamilyDto,
  ) {
    return new ResponseDTO(
      "創建家庭成功",
      await this.familyService.create(userID, createFamilyDto),
    );
  }

  @Get()
  async findAllByUserID(@UserID() userID: string) {
    return new ResponseDTO(
      "查詢成功",
      await this.familyService.findAllByUserID(userID),
    );
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    return new ResponseDTO(
      "查詢成功",
      await this.familyService.findOneByFamilyID(id),
    );
  }

  @Patch(":id/name/:name")
  async updateName(
    @UserID() userID: string,
    @Param("id") id: string,
    @Param("name") name: string,
  ) {
    return new ResponseDTO(
      "更改成功",
      await this.familyService.updateName(userID, id, name),
    );
  }

  @Patch(":id/user/:userID/role/:role")
  async updateRole(
    @UserID() setterUserID: string,
    @Param("id") familyId: string,
    @Param("userID") targetUserID: string,
    @Param("role") role: FamilyRole,
  ) {
    return new ResponseDTO(
      "更改成功",
      await this.familyService.updateRole(
        setterUserID,
        familyId,
        targetUserID,
        role,
      ),
    );
  }

  @Delete(":id")
  async remove(@UserID() userID: string, @Param("id") id: string) {
    return new ResponseDTO(
      "刪除成功",
      await this.familyService.remove(userID, id),
    );
  }

  @Post(":familyID/invite")
  async generateInviteCode(
    @Param("familyID") familyID: string,
    @UserID() userID: string,
  ) {
    return new ResponseDTO(
      "生成成功",
      await this.familyService.generateInviteCode(userID, familyID),
    );
  }

  @Delete(":familyID/leave")
  async leaveFamily(
    @UserID() userID: string,
    @Param("familyID") familyID: string,
  ) {
    return new ResponseDTO(
      "退出家庭成功",
      await this.familyService.leaveFamily(userID, familyID),
    );
  }

  @Post("join/:code")
  async joinFamilyByInviteCode(
    @UserID() userID: string,
    @Param("code") code: string,
  ) {
    return new ResponseDTO(
      "進入成功",
      await this.familyService.joinFamilyByInviteCode(userID, code),
    );
  }

}
