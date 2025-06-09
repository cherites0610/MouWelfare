import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CreateWelfareDto } from './dto/create-welfare.dto';
import { UpdateWelfareDto } from './dto/update-welfare.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Welfare } from './entities/welfare.entity';
import { Repository } from 'typeorm';
import { ConstDataService } from 'src/common/const-data/const-data.service';
import { FindAllDTO } from './dto/find-all.dto';
import { FamilyService } from 'src/family/family.service';
import { Identity } from 'src/common/const-data/entities/identity.entity';
import { UserService } from 'src/user/user.service';
import { Family } from 'src/family/entities/family.entity';
import { WelfareResponseDTO } from './dto/output-welfare.dto';
import { FindOneDTO } from './dto/find-one.dto';
import { UserFamily } from 'src/user-family/entities/user-family.entity';
import { LightStatus } from 'src/common/enum/light-status.enum';

@Injectable()
export class WelfareService {
  private readonly logger = new Logger(WelfareService.name)

  constructor(
    @InjectRepository(Welfare)
    private readonly welfareRepository: Repository<Welfare>,
    private readonly constDataService: ConstDataService,
    private readonly familyService: FamilyService,
    private readonly userService: UserService
  ) { }

  async create(createWelfareDto: CreateWelfareDto) {
    const welfare = this.welfareRepository.create(createWelfareDto)
    welfare.identities = []
    for (let i of createWelfareDto.identityID) {
      welfare.identities.push({
        id: Number(i),
        name: '',
        users: [],
        welfares: []
      })

    }
    await this.welfareRepository.save(welfare)
    return welfare;
  }

  async findAll(dto: FindAllDTO) {
    const queryBuilder = this.welfareRepository.createQueryBuilder('welfare')
      .leftJoinAndSelect('welfare.categories', 'categories')
      .leftJoinAndSelect('welfare.location', 'location')
      .leftJoinAndSelect('welfare.identities', 'identities');

    if (dto.search) {
      queryBuilder.andWhere('welfare.title LIKE :search', {
        search: `%${dto.search}%`,
      });
    }

    const categoryIds = this.filterByNames(dto.categories, this.constDataService.getCategories());
    if (categoryIds.length > 0) {
      queryBuilder.andWhere('categories.id IN (:...categoryIds)', { categoryIds });
    }

    const locationIds = this.filterByNames(dto.locations, this.constDataService.getLocations());
    if (locationIds.length > 0) {
      queryBuilder.andWhere('location.id IN (:...locationIds)', { locationIds });
    }

    const page = dto.page || 1;
    const pageSize = dto.pageSize || 10;
    queryBuilder.skip((page - 1) * pageSize).take(pageSize);

    const [welfares, total] = await queryBuilder.getManyAndCount();

    const responseList = welfares.map((item) => this.mapWelfareToDTO(item));
    if (dto.userID) {
      const familyID = dto.families?.[0];
      let identities = this.constDataService.getIdentities()
      identities = identities.filter((item) => {
        return dto.identities?.includes(item.name)
      })
      await this.appendLightAndFamilyInfo(welfares, responseList, dto.userID, identities, familyID);
    }

    return {
      data: responseList,
      pagination: {
        page,
        pageSize,
        total,
        totalPage: Math.ceil(total / pageSize)
      },
    };
  }

  async findOne(id: string, dto?: FindOneDTO): Promise<WelfareResponseDTO> {
    const welfare = await this.welfareRepository.findOne({
      relations: ['location', 'categories', 'identities'],
      where: { id },
    });

    if (!welfare) {
      throw new NotFoundException('未找到福利');
    }

    const response = this.mapWelfareToDTO(welfare);

    if (dto?.userID) {
      const user = await this.userService.findOneByID(dto.userID)
      await this.appendLightAndFamilyInfo([welfare], [response], dto.userID, user.identities, dto.familyID);
    }

    return response;
  }

  update(id: number, updateWelfareDto: UpdateWelfareDto) {
    return `This action updates a #${id} welfare`;
  }

  remove(id: number) {
    return `This action removes a #${id} welfare`;
  }

  getWelfareLight(welfareIdentities: Identity[], userIdentities: Identity[]): number {
    if (!userIdentities) {
      return LightStatus.NoIdentity
    }

    let welfareIdentitiesIDs = welfareIdentities.map((item) => item.id)
    let userIdentitiesIDs = userIdentities.map((item) => item.id)
    const contains = (arr: number[], val: number): boolean => {
      return arr.includes(val);
    };

    // 規則 0：identities 為空或首元素為 0
    if (userIdentitiesIDs.length === 0 || userIdentitiesIDs[0] === 0) {
      return LightStatus.NoIdentity;
    }

    // 規則 1：年齡段檢查（1: <20歲, 2: 20-65歲, 3: >65歲）
    const ageGroups = [1, 2, 3];
    let hasAgeRequirement = false;
    let ageMatches = false;

    for (const age of ageGroups) {
      if (contains(welfareIdentitiesIDs, age)) {
        hasAgeRequirement = true;
        if (contains(userIdentitiesIDs, age)) {
          ageMatches = true;
        }
      }
    }

    if (hasAgeRequirement && !ageMatches) {
      return LightStatus.NotEligible;
    }

    // 規則 2 & 3：檢查 4 到 11 的任意值
    for (let i = 4; i <= 11; i++) {
      if (contains(welfareIdentitiesIDs, i) && !contains(userIdentitiesIDs, i)) {
        return LightStatus.NotEligible;
      }
    }

    // 所有條件符合
    return LightStatus.Eligible;
  }

  private filterByNames(
    dtoValues: string[] | undefined,
    allData: { id: number; name: string }[],
  ): number[] {
    if (!dtoValues || dtoValues.length === 0) return [];
    return allData
      .filter((item) => dtoValues.includes(item.name))
      .map((item) => item.id);
  }

  private mapWelfareToDTO(welfare: Welfare): WelfareResponseDTO {
    return {
      id: welfare.id,
      title: welfare.title,
      detail: welfare.details,
      summary: welfare.summary,
      link: welfare.link,
      forward: welfare.forward,
      publicationDate: welfare.publicationDate
        ? welfare.publicationDate.toISOString().split('T')[0]
        : '',
      status: welfare.status,
      location: welfare.location!.name,
      categories: welfare.categories.map((c) => c.name),
      lightStatus: undefined,
      familyMember: [],
    };
  }

  private async appendLightAndFamilyInfo(
    welfareList: Welfare[],
    dtoList: WelfareResponseDTO[],
    userID: string,
    identities: Identity[],
    familyID?: string
  ) {
    const user = await this.userService.findOneByID(userID);
    let family: Family | null = null;
    let otherFamilyMembers: UserFamily[] = [];

    if (familyID) {
      family = await this.familyService.findOneByFamilyID(familyID);
      if (!family) throw new NotFoundException('未找到該家庭');

      const isMember = family.userFamilies.some((uf) => uf.user.id === user.id);
      if (!isMember) throw new NotFoundException('用戶不在家庭中');

      otherFamilyMembers = family.userFamilies.filter((uf) => uf.user.id !== user.id);
    }


    for (let i = 0; i < welfareList.length; i++) {
      const welfare = welfareList[i];
      const dto = dtoList[i];
      dto.lightStatus = welfare.identities.length == 0 ? 2 : this.getWelfareLight(welfare.identities, identities);

      // ✅ 如果有家庭，額外加上 familyMember 陣列
      if (family) {
        dto.familyMember = otherFamilyMembers.map((uf) => ({
          avatarUrl: uf.user.avatarUrl,
          lightStatus: this.getWelfareLight(welfare.identities, uf.user.identities),
          name: uf.user.name,
        }));
      }
    }
  }
}
