import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { UpdateUserDto } from "./dto/update-user.dto.js";
import { InjectRepository } from "@nestjs/typeorm";
import { User } from "./entities/user.entity.js";
import { In, Repository } from "typeorm";
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import * as argon2 from "argon2";
import sharp from "sharp";
import { Location } from "../common/const-data/entities/location.entity.js";
import { Identity } from "../common/const-data/entities/identity.entity.js";
import { Welfare } from "../welfare/entities/welfare.entity.js";
import { v4 as uuidv4 } from "uuid";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class UserService {
  private s3: S3Client;
  private readonly logger = new Logger(UserService.name);
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Location)
    private readonly locationRepository: Repository<Location>,
    @InjectRepository(Identity)
    private readonly identityRepository: Repository<Identity>,
    @InjectRepository(Welfare)
    private readonly welfareRepository: Repository<Welfare>,
    private readonly configService: ConfigService,
  ) {
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    if (!accessKeyId || !secretAccessKey) {
      throw new Error("AWS credentials are not set in environment variables");
    }
    this.s3 = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  async createUser(email: string, password: string) {
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });
    if (existingUser) {
      throw new BadRequestException("電子郵件已被使用");
    }

    const hash = await argon2.hash(password);
    const user = this.userRepository.create({
      email: email,
      password: hash,
      name: email,
    });
    await this.userRepository.save(user);
    this.logger.log(`用戶${user.id}已經創建`);
    user.password = "";
    return user;
  }

  async findOneByID(id: string) {
    const foundUser = await this.userRepository.findOne({
      where: { id: id },
      relations: ["location", "identities", "welfares"],
    });

    if (!foundUser) {
      throw new NotFoundException("未找到用戶");
    }
    return foundUser;
  }

  async findOneByEmail(email: string) {
    const foundUser = await this.userRepository.findOne({
      where: { email: email },
      relations: ["location", "identities", "welfares"],
    });

    if (!foundUser) {
      throw new UnauthorizedException("找不到賬戶號");
    }

    if (foundUser.isVerified) {
      throw new ForbiddenException("尚未驗證賬戶");
    }
    return foundUser;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ["location", "identities"],
    });
    if (!user) {
      throw new NotFoundException("用戶不存在");
    }

    // 驗證 locationId（如果提供）
    if (updateUserDto.location !== undefined) {
      if (updateUserDto.location !== null) {
        const location = await this.locationRepository.findOne({
          where: { name: updateUserDto.location },
        });
        if (!location) {
          throw new BadRequestException("指定的 locationId 不存在");
        }
        user.location = location;
      } else {
        user.location = undefined;
      }
    }

    // 驗證 identities（如果提供）
    if (updateUserDto.identities !== undefined) {
      if (updateUserDto.identities) {
        const identities = await this.identityRepository.find({
          where: { name: In(updateUserDto.identities) },
        });
        if (identities.length !== updateUserDto.identities.length) {
          throw new BadRequestException("一個或多個 identity ID 不存在");
        }
        user.identities = identities;
      } else {
        user.identities = [];
      }
    }

    // 更新其他字段
    Object.assign(user, {
      name: updateUserDto.name ?? user.name,
      birthday: updateUserDto.birthday ?? user.birthday,
      gender: updateUserDto.gender ?? user.gender,
      isVerified: updateUserDto.isVerified ?? user.isVerified,
      isSubscribe: updateUserDto.isSubscribe ?? user.isSubscribe,
      lineID: updateUserDto.lineID ?? user.lineID,
      avatarUrl: updateUserDto.avatarUrl ?? user.avatarUrl,
    });

    await this.userRepository.save(user);
    this.logger.log(`用戶${id}已經更新`);
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      birthday: user.birthday,
      gender: user.gender,
      isVerified: user.isVerified,
      isSubscribe: user.isSubscribe,
      lineID: user.lineID,
      avatarUrl: user.avatarUrl,
      locationId: user.location?.id,
      identities: user.identities?.map((identity) => identity.id),
    };
  }

  async remove(id: string) {
    const foundUser = await this.findOneByID(id);
    const result = await this.userRepository.delete({ id: foundUser.id });
    this.logger.log(`用戶${id}已經刪除`);
    return result.affected === 1 ? true : false;
  }

  async updatePassword(id: string, password: string) {
    const foundUser = await this.findOneByID(id);
    if (!foundUser) {
      throw new NotFoundException("未找到該賬號");
    }

    const hash = await argon2.hash(password);
    foundUser.password = hash;
    await this.userRepository.save(foundUser);
    this.logger.log(`用戶${foundUser.id}已經更改密碼`);
    return true;
  }

  async addWelfareToUser(userID: string, welfareID: string): Promise<void> {
    // 查找用戶
    const user = await this.userRepository.findOne({
      where: { id: userID },
      relations: ["welfares"], // 載入 welfares 關聯
    });
    if (!user) {
      throw new NotFoundException("用戶不存在");
    }

    // 查找福利
    const welfare = await this.welfareRepository.findOne({
      where: { id: welfareID },
    });
    if (!welfare) {
      throw new NotFoundException("福利不存在");
    }

    // 檢查是否已存在該福利
    if (user.welfares?.some((w) => w.id === welfareID)) {
      throw new BadRequestException("用戶已添加該福利");
    }

    // 添加福利到用戶的 welfares 集合
    user.welfares = user.welfares ? [...user.welfares, welfare] : [welfare];

    // 保存更新
    await this.userRepository.save(user);
    this.logger.log(`用戶${userID}已添加喜好福利${welfareID}`);
  }

  async removeWelfareFromUser(
    userID: string,
    welfareID: string,
  ): Promise<void> {
    // 查找用戶
    const user = await this.userRepository.findOne({
      where: { id: userID },
      relations: ["welfares"], // 載入 welfares 關聯
    });
    if (!user) {
      throw new NotFoundException("用戶不存在");
    }

    // 查找福利
    const welfare = await this.welfareRepository.findOne({
      where: { id: welfareID },
    });
    if (!welfare) {
      throw new NotFoundException("福利不存在");
    }

    // 檢查是否已存在該福利
    if (!user.welfares?.some((w) => w.id === welfareID)) {
      throw new BadRequestException("用戶未添加該福利");
    }

    // 從 welfares 集合中移除指定的福利
    user.welfares = user.welfares.filter((w) => w.id !== welfareID);

    // 保存更新
    await this.userRepository.save(user);
    this.logger.log(`用戶${userID}已移除喜好福利${welfareID}`);
  }

  async updateAvatar(userId: string, file: Express.Multer.File) {
    const user = await this.findOneByID(userId);

    // 壓縮圖片，轉為 JPEG（也可保留原格式）
    const compressedBuffer = await sharp(file.buffer)
      .resize(300) // 可調整尺寸，例如寬度 300px
      .jpeg({ quality: 80 }) // 轉 JPEG，壓縮品質 0~100
      .toBuffer();

    const key = `avatars/${uuidv4()}.jpeg`;

    const bucketName =
      this.configService.get<string>("AWS_S3_BUCKET_NAME") || "";

    // 上傳壓縮後圖片
    await this.s3.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: compressedBuffer,
        ACL: "public-read",
        ContentType: "image/jpeg",
      }),
    );

    // 刪除舊圖片（如果存在）
    if (user.avatarUrl) {
      const oldKey = user.avatarUrl.split(`.amazonaws.com/`)[1];
      if (oldKey) {
        await this.s3.send(
          new DeleteObjectCommand({
            Bucket: bucketName,
            Key: oldKey,
          }),
        );
      }
    }

    const avatarUrl = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

    user.avatarUrl = avatarUrl;
    await this.userRepository.save(user);

    return { success: true, avatarUrl };
  }

  async getAvatarUrl(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user || !user.avatarUrl) {
      return `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/default_avatar.png`;
    }

    return { avatarUrl: user.avatarUrl };
  }

  async getFavouriteWelfare(userID: string) {
    const user = await this.findOneByID(userID);
    return user.welfares;
  }
}
