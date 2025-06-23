import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { CreateUserFamilyDto } from "./dto/create-user-family.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { UserFamily } from "./entities/user-family.entity";
import { Repository } from "typeorm";
import { FamilyRole } from "src/common/enum/role.enum";

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

  remove(id: string) {
    return `This action removes a #${id} userFamily`;
  }
}
