import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from "@nestjs/common";
import { AuthService } from "./auth.service.js";
import { SignupDTO, SignupSchema } from "./dto/sign-up.dto.js";
import { LoginDTO } from "./dto/login.dto.js";
import { Public } from "../common/decorators/public.decorator.js";
import { SendVerificationCodeDto } from "./dto/send-verification-code.dto.js";
import { VerifyCodeDto } from "./dto/verify-code.dto.js";
import { PerformActionDto } from "./dto/perform-action.dto.js";
import { ResponseDTO } from "../common/dto/response.dto.js";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post("signup")
  async signup(@Body() dto: SignupDTO) {
    return new ResponseDTO("注冊成功", await this.authService.signup(dto));
  }

  @Public()
  @Post("login")
  async login(@Body() dto: LoginDTO) {
    return { message: "登錄成功", data: await this.authService.login(dto) };
  }

  @Public()
  @Post("send-verification-code")
  async sendVerificationCode(@Body() dto: SendVerificationCodeDto) {
    await this.authService.sendVerificationCode(dto);
    return new ResponseDTO("驗證碼已發送", "");
  }

  @Public()
  @Post("verify-code")
  async verifyCode(@Body() dto: VerifyCodeDto) {
    return new ResponseDTO("驗證成功", await this.authService.verifyCode(dto));
  }

  @Public()
  @Post("perform-action")
  async performAction(@Body() dto: PerformActionDto) {
    await this.authService.performAction(dto);
    return { message: "操作成功" };
  }
}
