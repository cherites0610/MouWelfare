import { BadRequestException, ForbiddenException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CreateFamilyDto } from './dto/create-family.dto';
import { Cache } from 'cache-manager';
import { UserFamilyService } from 'src/user-family/user-family.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Family } from './entities/family.entity';
import { Repository } from 'typeorm';
import { FamilyRole } from 'src/common/enum/role.enum';

@Injectable()
export class FamilyService {
  private readonly logger = new Logger(FamilyService.name)

  constructor(
    @Inject('CACHE_MANAGER') 
    private readonly cacheManager: Cache,
    private readonly userFamilyService: UserFamilyService,
    @InjectRepository(Family)
    private readonly familyRepository: Repository<Family>
  ) { }

  async create(userID: string, createFamilyDto: CreateFamilyDto) {
    const family = this.familyRepository.create(createFamilyDto)
    await this.familyRepository.save(family)
    await this.userFamilyService.create({
      userID: userID,
      familyID: family.id,
      role: FamilyRole.Creator
    })
    this.logger.log(`創建家庭${family.id}`)
    return family
  }

  async findAllByUserID(userID: string) {
    const userFamilys = await this.familyRepository.find({
      relations: ['userFamilies', 'userFamilies.user'],
      where: { userFamilies: { user: { id: userID } } }
    });

    const families = await Promise.all(
      userFamilys.map(item => this.findOneByFamilyID(item.id))
    );

    // 過濾掉 null 或 undefined 的情況（如果可能有）
    return families.filter(Boolean);
  }
  async findOneByFamilyID(id: string) {
    const family = await this.familyRepository.findOne({
      relations: ['userFamilies', 'userFamilies.user'],
      where: { id: id }
    })

    return family
  }

  async updateName(userID: string, familyID: string, name: string) {
    const family = await this.findOneByFamilyID(familyID)
    if (!family) {
      throw new NotFoundException("未找到該家庭")
    }

    const userFmaily = family.userFamilies.find((item) => item.user.id === userID)
    if (!userFmaily) {
      throw new NotFoundException("家庭中沒有該用戶")
    }

    if (!(userFmaily.role == FamilyRole.Admin || userFmaily.role == FamilyRole.Creator)) {
      throw new ForbiddenException("權限不足以更改家庭名字")
    }

    family.name = name
    await this.familyRepository.save(family)
    this.logger.log(`已經更改${family.id}名字`)
    return family
  }

  async updateRole(setterUserID: string, familyID: string, targetUserID: string, role: FamilyRole) {
    if (setterUserID == targetUserID) {
      throw new BadRequestException("不可調整自己的權限")
    }

    const family = await this.findOneByFamilyID(familyID)
    if (!family) {
      throw new NotFoundException("未找到該家庭")
    }

    const setterUserFmaily = family.userFamilies.find((item) => item.user.id === setterUserID)
    if (!setterUserFmaily) {
      throw new NotFoundException("家庭中沒有該用戶")
    }

    if (!(setterUserFmaily.role == FamilyRole.Creator)) {
      throw new ForbiddenException("權限不足以更改家庭成員權限")
    }

    const targetUserFmaily = family.userFamilies.find((item) => item.user.id === targetUserID)
    if (!targetUserFmaily) {
      throw new NotFoundException("家庭中沒有該用戶")
    }

    await this.userFamilyService.updata(targetUserFmaily.id, targetUserID, familyID, role)
    this.logger.log(`已經更新用戶${targetUserID}在家庭${familyID}中的權限`)

  }

  async remove(userID: string, id: string) {
    const userFamily = await this.userFamilyService.findOneByUserID(userID)
    if (userFamily.role != FamilyRole.Creator) {
      throw new ForbiddenException("只能由創建者刪除")
    }

    const result = await this.familyRepository.delete({ id: id })
    this.logger.log(`已經刪除家庭id`)
    return result.affected == 1 ? true : false
  }

  async generateInviteCode(userID: string, familyID: string): Promise<string> {
    const family = await this.findOneByFamilyID(familyID);
    if (!family) {
      throw new NotFoundException('未找到該家庭');
    }

    const userFamily = family.userFamilies.find((item) => item.user.id === userID);
    if (!userFamily) {
      throw new NotFoundException('家庭中沒有該用戶');
    }

    // 生成 6 位數字邀請碼
    let code: string = '';
    let isUnique = false;
    const maxAttempts = 10;

    for (let i = 0; i < maxAttempts; i++) {
      code = Math.floor(100000 + Math.random() * 900000).toString();
      const existing = await this.cacheManager.get(`invite:${code}`);
      if (!existing) {
        isUnique = true;
        break;
      }
    }

    if (!isUnique || !code) {
      throw new BadRequestException('無法生成唯一邀請碼，請稍後重試');
    }

    // 儲存邀請碼到 Redis
    await this.cacheManager.set(`invite:${code}`, familyID, (5 * 60 * 60));
    this.logger.log(`生成家庭邀請碼${code}，家庭：${familyID}`);
    return code;
  }

  async joinFamilyByInviteCode(userID: string, code: string): Promise<Family> {
    const familyID = await this.cacheManager.get<string>(`invite:${code}`);
    if (!familyID) {
      throw new BadRequestException('無效或過期的邀請碼');
    }

    const family = await this.findOneByFamilyID(familyID as string);
    if (!family) {
      throw new NotFoundException('未找到該家庭');
    }

    // 檢查用戶是否已在家庭中
    const existingUserFamily = family.userFamilies.find((item) => item.user.id === userID);
    if (existingUserFamily) {
      throw new BadRequestException('用戶已在該家庭中');
    }

    // 將用戶加入家庭，默認角色為 Member
    await this.userFamilyService.create({
      userID,
      familyID,
      role: FamilyRole.Member,
    });

    // 刪除已使用的邀請碼
    await this.cacheManager.del(`invite:${code}`);
    this.logger.log(`用戶${userID}已加入家庭${familyID}使用邀請碼${code}`);
    return family;
  }
}
