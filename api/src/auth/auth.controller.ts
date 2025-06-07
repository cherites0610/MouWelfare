import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignupDTO, SignupSchema } from './dto/sign-up.dto';
import { LoginDTO } from './dto/login.dto';
import { Public } from 'src/common/decorators/public.decorator';
import { SendVerificationCodeDto } from './dto/send-verification-code.dto';
import { VerifyCodeDto } from './dto/verify-code.dto';
import { PerformActionDto } from './dto/perform-action.dto';
import { ResponseDTO } from 'src/common/dto/response.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,

  ) { }

  @Public()
  @Post('signup')
  async signup(@Body() dto: SignupDTO) {
    return await this.authService.signup(dto);
  }

  @Public()
  @Post('login')
  async login(@Body() dto: LoginDTO) {
    return { message: "登錄成功", data: await this.authService.login(dto) }
  }

  @Post('send-verification-code')
  async sendVerificationCode(@Body() dto: SendVerificationCodeDto) {
    await this.authService.sendVerificationCode(dto);
    return new ResponseDTO('驗證碼已發送',"");
  }

  @Post('verify-code')
  async verifyCode(@Body() dto: VerifyCodeDto) {
    return new ResponseDTO("驗證成功",await this.authService.verifyCode(dto));
  }

  @Post('perform-action')
  async performAction(@Body() dto: PerformActionDto) {
    await this.authService.performAction(dto);
    return { message: '操作成功' };
  }
}
