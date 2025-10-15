import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { CreateUserFamilyDto } from "./dto/create-user-family.dto.js";
import { InjectRepository } from "@nestjs/typeorm";
import { UserFamily } from "./entities/user-family.entity.js";
import { Repository } from "typeorm";
import { FamilyRole } from "../common/enum/role.enum.js";

@Injectable()
export class UserFamilyService {
  private readonly logger = new Logger(UserFamilyService.name);

  constructor(
    @InjectRepository(UserFamily)
    private readonly userFamilyRepository: Repository<UserFamily>,
  ) {}

  async create(createUserFamilyDto: CreateUserFamilyDto) {
    const userFamily = this.userFamilyRepository.create({
      role: createUserFamilyDto.role,
      family: { id: createUserFamilyDto.familyID },
      user: { id: createUserFamilyDto.userID },
    });
    await this.userFamilyRepository.save(userFamily);
    return userFamily;
  }

  async findOneByUserID(userID: string) {
    const userFamily = await this.userFamilyRepository.findOneBy({
      user: { id: userID },
    });
    if (!userFamily) {
      throw new NotFoundException("該用戶不在該家庭");
    }
    return userFamily;
  }

  async updata(id: string, userID: string, familyID: string, role: FamilyRole) {
    const userFamily = this.userFamilyRepository.create({
      id: id,
      user: { id: userID },
      family: { id: familyID },
      role: role,
    });
    await this.userFamilyRepository.save(userFamily);
    this.logger.log(`更新了家庭成員${id}的權限`);
    return userFamily;
  }

  async remove(id: string): Promise<boolean> {
    this.logger.log(`正在從 user_family 資料表中刪除 ID 為 ${id} 的記錄...`);
    
    // 使用 TypeORM 的 delete 方法來刪除
    const result = await this.userFamilyRepository.delete({ id });

    // 檢查是否真的有一行記錄被刪除
    if (result.affected === 0) {
        this.logger.warn(`嘗試刪除 UserFamily 記錄 ${id} 失敗，可能該記錄不存在。`);
        return false;
    }

    this.logger.log(`成功刪除 UserFamily 記錄 ${id}。`);
    return true;
  }
}
