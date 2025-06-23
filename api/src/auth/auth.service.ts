import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { SignupDTO } from "./dto/sign-up.dto";
import { LoginDTO } from "./dto/login.dto";
import * as argon2 from "argon2";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import * as crypto from "crypto";
import { UserService } from "src/user/user.service";
import { JwtService } from "@nestjs/jwt";
import { NotificationService } from "src/notification/notification.service";
import { VerificationCode } from "./entity/verification-code.entity";
import { SendNotificationDto } from "src/notification/dto/notification.dto";
import { SendVerificationCodeDto } from "./dto/send-verification-code.dto";
import { VerifyCodeDto } from "./dto/verify-code.dto";
import { PerformActionDto } from "./dto/perform-action.dto";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";
import { v4 as uuidv4 } from "uuid";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly notificationService: NotificationService,
    @InjectRepository(VerificationCode)
    private readonly verificationCodeRepository: Repository<VerificationCode>,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  async signup(dto: SignupDTO) {
    const user = await this.userService.createUser(dto.email, dto.password);
    return user;
  }

  async login(dto: LoginDTO) {
    const user = await this.userService.findOneByEmail(dto.email);

    if (await argon2.verify(user.password, dto.password)) {
      const payload = { sub: user.id };
      return { accessToken: await this.jwtService.signAsync(payload) };
    } else {
      throw new UnauthorizedException("密碼錯誤");
    }
  }

  async sendVerificationCode(dto: SendVerificationCodeDto): Promise<void> {
    const user = await this.userService.findOneByEmail(dto.email);
    if (!user) {
      throw new BadRequestException("用戶不存在");
    }

    // 生成 6 位隨機驗證碼
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const hashedCode = crypto.createHash("sha256").update(code).digest("hex");

    const cooldownKey = `verify:cooldown:${dto.email}:${dto.action}`;
    const isCooling = await this.cacheManager.get(cooldownKey);
    if (isCooling) throw new BadRequestException("請稍後再試");

    // 發送 Email 通知
    const notificationDto: SendNotificationDto = {
      recipient: dto.email,
      subject: "您的驗證碼",
      message: `您的驗證碼是：${code}，請在 5 分鐘內使用。`,
    };
    await this.notificationService.sendNotification("email", notificationDto);

    // 儲存驗證碼
    const verificationCode = this.verificationCodeRepository.create({
      userId: user.id,
      code: hashedCode,
      action: dto.action,
      expiresAt,
    });
    await this.verificationCodeRepository.save(verificationCode);

    await this.cacheManager.set(cooldownKey, true, 60); // 冷卻 60 秒
    this.logger.log(
      `Verification code sent to ${dto.email} for action ${dto.action}`,
    );
  }

  async verifyCode(dto: VerifyCodeDto): Promise<string> {
    const user = await this.userService.findOneByEmail(dto.email);
    if (!user) throw new BadRequestException("無效的驗證碼");

    const retryKey = `verify:attempts:${dto.email}:${dto.action}`;
    const retryCount = +((await this.cacheManager.get(retryKey)) || 0);
    if (retryCount >= 5)
      throw new BadRequestException("驗證失敗次數過多，請重新請求驗證碼");

    const hashedCode = crypto
      .createHash("sha256")
      .update(dto.code)
      .digest("hex");

    const verificationCode = await this.verificationCodeRepository.findOne({
      where: { code: hashedCode, action: dto.action, userId: user.id },
      relations: ["user"],
    });

    if (!verificationCode || verificationCode.user.email !== dto.email) {
      throw new BadRequestException("無效的驗證碼");
    }

    if (new Date() > verificationCode.expiresAt) {
      throw new BadRequestException("驗證碼已過期");
    }

    const jti = uuidv4();
    const payload = {
      sub: user.id,
      action: dto.action,
      jti,
    };
    const token = await this.jwtService.signAsync(payload, { expiresIn: "5m" });

    await this.cacheManager.set(`jwt:jti:${jti}`, true, 300); // 有效期 5 分鐘
    await this.verificationCodeRepository.delete(verificationCode.id);
    await this.cacheManager.del(retryKey); // 驗證成功重置錯誤次數

    this.logger.log(`Verification code verified for ${dto.email}`);
    return token;
  }

  async performAction(dto: PerformActionDto): Promise<void> {
    let payload;
    try {
      payload = await this.jwtService.verifyAsync(dto.token);
    } catch (error) {
      throw new UnauthorizedException("無效或過期的 token");
    }

    const used = await this.cacheManager.get(`jwt:jti:${payload.jti}`);
    if (!used) throw new UnauthorizedException("此 token 已無效或已被使用");

    await this.cacheManager.del(`jwt:jti:${payload.jti}`);

    if (payload.action !== dto.action) {
      throw new BadRequestException("Token 與操作類型不匹配");
    }

    const user = await this.userService.findOneByID(payload.sub);
    if (!user) {
      throw new BadRequestException("用戶不存在");
    }

    switch (dto.action) {
      case "changePassword":
        if (!dto.newPassword) {
          throw new BadRequestException("新密碼為必填");
        }

        await this.userService.updatePassword(user.id, dto.newPassword);
        this.logger.log(`Password changed for user ${user.email}`);
        break;
      case "verifyAccount":
        await this.userService.update(user.id, {
          isVerified: true,
        });
        this.logger.log(`Account verified for user ${user.email}`);
        break;
      default:
        throw new BadRequestException("無效的操作類型");
    }
  }
}
