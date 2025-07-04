import {
  Controller,
  Get,
  Body,
  Patch,
  Delete,
  HttpStatus,
  HttpCode,
  Param,
  Post,
  UseInterceptors,
  UploadedFile,
  Req,
} from "@nestjs/common";
import { UserService } from "./user.service.js";
import { UpdateUserDto } from "./dto/update-user.dto.js";
import { UserID } from "../common/decorators/user-id.decorator.js";
import { ResponseDTO } from "../common/dto/response.dto.js";
import { FileInterceptor } from "@nestjs/platform-express";

@Controller("user")
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get("")
  async findOne(@UserID() id: string) {
    const user = await this.userService.findOneByID(id);
    const dto = new ResponseDTO("用戶資料查詢成功", user);
    return dto;
  }

  @Patch("")
  @HttpCode(HttpStatus.OK)
  async updateUser(@UserID() id: string, @Body() updateUserDto: UpdateUserDto) {
    const user = await this.userService.update(id, updateUserDto);
    return {
      message: "用戶資料更新成功",
      user,
    };
  }

  @Delete(":id")
  remove(@UserID() id: string) {
    return this.userService.remove(id);
  }

  @Post("/welfare/:welfareID")
  async addFavouriteWelfare(
    @UserID() userID: string,
    @Param("welfareID") welfareID: string,
  ) {
    return new ResponseDTO(
      "添加成功",
      await this.userService.addWelfareToUser(userID, welfareID),
    );
  }

  @Post("avatar")
  @UseInterceptors(FileInterceptor("avatar"))
  async uploadAvatar(
    @UploadedFile() file: Express.Multer.File,
    @UserID() userID,
  ) {
    return this.userService.updateAvatar(userID, file);
  }

  @Get("welfare")
  async getFavouriteWelfare(@UserID() userID: string) {
    return new ResponseDTO(
      "查詢成功",
      await this.userService.getFavouriteWelfare(userID),
    );
  }

  @Get("avatar")
  async getAvatar(@UserID() userID) {
    return this.userService.getAvatarUrl(userID);
  }

  @Delete("/welfare/:welfareID")
  async deleteFavouriteWelfare(
    @UserID() userID: string,
    @Param("welfareID") welfareID: string,
  ) {
    return new ResponseDTO(
      "刪除成功",
      await this.userService.removeWelfareFromUser(userID, welfareID),
    );
  }
}
