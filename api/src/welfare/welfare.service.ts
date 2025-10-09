import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { CreateWelfareDto } from "./dto/create-welfare.dto.js";
import { UpdateWelfareDto } from "./dto/update-welfare.dto.js";
import { InjectRepository } from "@nestjs/typeorm";
import { Welfare } from "./entities/welfare.entity.js";
import { Repository } from "typeorm";
import { ConstDataService } from "../common/const-data/const-data.service.js";
import { FindAllDTO } from "./dto/find-all.dto.js";
import { FamilyService } from "../family/family.service.js";
import { Identity } from "../common/const-data/entities/identity.entity.js";
import { UserService } from "../user/user.service.js";
import { Family } from "../family/entities/family.entity.js";
import { WelfareResponseDTO ,FamilyMemberDTO} from "./dto/output-welfare.dto.js";
import { FindOneDTO } from "./dto/find-one.dto.js";
import { UserFamily } from "../user-family/entities/user-family.entity.js";
import { LightStatus } from "../common/enum/light-status.enum.js";
import { User } from "../user/entities/user.entity.js";
import{LightStatusResult }from "../../../api/src/welfare/interface/light-status-result.interface.js"
@Injectable()
export class WelfareService {
  private readonly logger = new Logger(WelfareService.name);

  constructor(
    @InjectRepository(Welfare)
    private readonly welfareRepository: Repository<Welfare>,
    private readonly constDataService: ConstDataService,
    private readonly familyService: FamilyService,
    private readonly userService: UserService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(createWelfareDto: CreateWelfareDto) {
    const welfare = this.welfareRepository.create(createWelfareDto);
    welfare.identities = [];
    for (const i of createWelfareDto.identityID) {
      welfare.identities.push({
        id: Number(i),
        name: "",
        users: [],
        welfares: [],
      });
    }

    welfare.categories = [];
    for (const i of createWelfareDto.categoryID) {
      welfare.categories.push({
        id: Number(i),
        name: "",
        welfares: [],
      });
    }

    try {
      await this.welfareRepository.save(welfare);
    } catch (err: any) {
      this.logger.debug(err);
    }
    return welfare;
  }

  async findAllLink() {
    const temp = await this.welfareRepository.find({
      select: ["link"],
    });

    return temp.map((item) => item.link);
  }

  async findAll(dto: FindAllDTO) {
    const queryBuilder = this.welfareRepository
      .createQueryBuilder("welfare")
      .leftJoinAndSelect("welfare.categories", "categories")
      .leftJoinAndSelect("welfare.location", "location")
      .leftJoinAndSelect("welfare.identities", "identities");

    if (dto.search) {
      queryBuilder.andWhere("welfare.title LIKE :search", {
        search: `%${dto.search}%`,
      });
    }

    const categoryIds = this.filterByNames(
      dto.categories,
      this.constDataService.getCategories()
    );
    if (categoryIds.length > 0) {
      queryBuilder.andWhere("categories.id IN (:...categoryIds)", {
        categoryIds,
      });
    }

    const locationIds = this.filterByNames(
      dto.locations,
      this.constDataService.getLocations()
    );
    if (locationIds.length > 0) {
      queryBuilder.andWhere("location.id IN (:...locationIds)", {
        locationIds,
      });
    }

    const page = dto.page || 1;
    const pageSize = dto.pageSize || 10;
    queryBuilder.skip((page - 1) * pageSize).take(pageSize);

    const [welfares, total] = await queryBuilder.getManyAndCount();

    const responseList = welfares.map((item) => this.mapWelfareToDTO(item));
    if (dto.userID) {
      // const user = await this.userService.findOneByID(dto.userID);
      // if (user) {
      //   const familyID = dto.families?.[0];
      //   // 2. 將使用者真實的 identities 傳遞下去
      //   await this.appendLightAndFamilyInfo(
      //     welfares,
      //     responseList,
      //     dto.userID,
      //     user.identities, // <-- 使用 user.identities
      //     familyID
      //   );
      // }
      const identityNamesFromFilter = dto.identities || [];
      const identitiesForLightCalculation = this.constDataService.getIdentities().filter(
        (identity) => identityNamesFromFilter.includes(identity.name)
      );
      
      const familyID = dto.families?.[0];

      // 3. 將轉換後的身份物件陣列傳遞給燈號計算函式。
      //    注意：第二個 identities 參數現在是來自篩選條件，而不是 user.identities。
      await this.appendLightAndFamilyInfo(
        welfares,
        responseList,
        dto.userID,
        identitiesForLightCalculation, // <-- 使用來自篩選條件的身份
        familyID
      );
    }

    return {
      data: responseList,
      pagination: {
        page,
        pageSize,
        total,
        totalPage: Math.ceil(total / pageSize),
      },
    };
  }

  async findOne(id: string, dto?: FindOneDTO): Promise<WelfareResponseDTO> {
    this.logger.log(`\n📱 詳細頁面API調用:`);
    this.logger.log(`  - 福利ID: ${id}`);
    this.logger.log(`  - 用戶ID: ${dto?.userID || '未提供'}`);
    this.logger.log(`  - 家庭ID: ${dto?.familyID || '未提供'}`);
    const welfare = await this.welfareRepository.findOne({
      relations: ["location", "categories", "identities"],
      where: { id },
    });

    if (!welfare) {
      this.logger.error(`❌ 未找到福利 ID: ${id}`);
      throw new NotFoundException("未找到福利");
    }

    const response = this.mapWelfareToDTO(welfare);

    if (dto?.userID && dto.familyID && dto.familyID.length > 0) {
      const user = await this.userService.findOneByID(dto.userID);
      await this.appendLightAndFamilyInfo(
        [welfare],
        [response],
        dto.userID,
        user.identities,
        dto.familyID
      );
    }

    return response;
  }

  async update(id: string, updateWelfareDto: UpdateWelfareDto) {
    const foundWelfare = await this.welfareRepository.findOne({
      where: { id },
      relations: ["location", "categories", "identities"],
    });

    if (!foundWelfare) throw new NotFoundException("找不到該福利");

    Object.assign(foundWelfare, updateWelfareDto);
    try {
      await this.welfareRepository.save(foundWelfare);
    } catch (err: any) {
      console.log(err);
    }
    return this.mapWelfareToDTO(foundWelfare);
  }

  async remove(id: string) {
    const result = await this.welfareRepository.delete({ id });
    return result.affected === 1 ? true : false;
  }

  getWelfareLight(
    welfareIdentities: Identity[],
    userIdentities: Identity[] | undefined 
  ): LightStatusResult  {
  const reasons: string[] = [];
  // const welfareIdentityIds = welfareIdentities.map((i) => i.id);
  // const userIdentityIds = userIdentities.map((i) => i.id);
  const welfareIdentityNames = welfareIdentities.map(i => i.name);
  // const userIdentityNames = userIdentities?.map(i => i.name) || ['未設定'];
  
  if (!userIdentities|| userIdentities.length === 0|| userIdentities[0]?.id === 0) {
      reasons.push('🟡 因為您尚未設定個人身份，無法進行精確判斷。');
      return {
        status: LightStatus.NoIdentity,
        reasons,
        welfareIdentityNames,
        userIdentityNames: ['未設定'],
      };

  // 為了方便使用者閱讀，將 ID 轉換為名稱
  }
  const userIdentityIds = userIdentities.map((i) => i.id);
  const userIdentityNames = userIdentities.map(i => i.name);
  reasons.push(`福利要求身份: ${welfareIdentityNames.join('、') || '無特殊要求'}`);
  reasons.push(`您的身份: ${userIdentityNames.join('、')}`);

    // 規則 1：年齡段檢查（1: <20歲, 2: 20-65歲, 3: >65歲）
    const ageGroups = [1, 2, 3];
    let hasAgeRequirement = welfareIdentities.some(i => ageGroups.includes(i.id));
    if (hasAgeRequirement) {
    let ageMatches = welfareIdentities.some(wi => 
      ageGroups.includes(wi.id) && userIdentities.some(ui => ui.id === wi.id)
    );

    if (ageMatches) {
      reasons.push('✅ 年齡段符合。');
    } else {
      const requiredAgeName = welfareIdentities.find(i => ageGroups.includes(i.id))?.name;
      reasons.push(`❌ 年齡段不符合 (要求: ${requiredAgeName})。`);
      return {
        status: LightStatus.NotEligible, // 3
        reasons,
        welfareIdentityNames,
        userIdentityNames,
      };
    }
  }

    const specialIdentities = welfareIdentities.filter(i => i.id >= 4 && i.id <= 11);
  if (specialIdentities.length > 0) {
    reasons.push('正在檢查特殊身份要求...');
    for (const specialIdentity of specialIdentities) {
      if (!userIdentities.some(ui => ui.id === specialIdentity.id)) {
        reasons.push(`❌ 您缺少必要的特殊身份: "${specialIdentity.name}"。`);
        return {
          status: LightStatus.NotEligible, // 3
          reasons,
          welfareIdentityNames,
          userIdentityNames,
        };
      }
    }
    reasons.push('✅ 所有特殊身份均符合。');
  }

    // 所有條件符合
    reasons.push('🟢 綜合判斷，您符合所有必要條件！');
    return {
      status: LightStatus.Eligible, // 1
      reasons,
      welfareIdentityNames,
      userIdentityNames,
    };
  }

  private filterByNames(
    dtoValues: string[] | undefined,
    allData: { id: number; name: string }[]
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
      applicationCriteria: welfare.applicationCriteria,
      publicationDate: welfare.publicationDate
        ? welfare.publicationDate.toISOString().split("T")[0]
        : "",
      status: welfare.status,
      location: welfare.location!.name,
      categories: welfare.categories.map((c) => c.name),
      identities: welfare.identities?.map((i) => i.name) || [],
      lightStatus: undefined,
      familyMember: [],
      isAbnormal: welfare.isAbnormal,
    };
  }

  private async appendLightAndFamilyInfo(
    welfareList: Welfare[],
    dtoList: WelfareResponseDTO[],
    userID: string,
    identities: Identity[],
    familyID?: string
  ) {
    for (let i = 0; i < welfareList.length; i++) {
        const welfare = welfareList[i];
        const dto = dtoList[i];
        
        // 計算使用者本人的燈號
        const userLightResult = this.getWelfareLight(welfare.identities, identities);
        dto.lightStatus = userLightResult.status;
        dto.lightReason = userLightResult.reasons;

        // 如果提供了 familyID，則處理家庭成員
        if (familyID) {
            const family = await this.familyService.findOneByFamilyID(familyID);
            if (!family) continue; // 如果找不到家庭，就跳過這個福利的家庭部分

            const otherFamilyMembers = family.userFamilies.filter(
                (uf) => uf.user.id !== userID
            );

            // <-- 修改點 1：為陣列加上明確的類型
            const eligibleFamilyMembers: FamilyMemberDTO[] = [];

            for (const familyMember of otherFamilyMembers) {
                const result = this.getWelfareLight(
                    welfare.identities,
                    familyMember.user.identities
                );
                
                // 我們可以顯示所有綠燈或黃燈的家人
                if (result.status === LightStatus.Eligible || result.status === LightStatus.NoIdentity) {
                    eligibleFamilyMembers.push({
                        avatarUrl: familyMember.user.avatarUrl,
                        name: familyMember.user.name,
                        lightStatus: result.status,
                        lightReason: result.reasons,
                    });
                }
            }
            dto.familyMember = eligibleFamilyMembers;
        }
    }
  }
  async findAllAbnormalWelfare() {
    const welfares = await this.welfareRepository.find({
      relations: ["location", "categories", "identities"],
      where: { isAbnormal: true },
    });

    return welfares.map((welfare) => this.mapWelfareToDTO(welfare));
  }

  async getWelfareLightStatus(welfareId: string, userId: string): Promise<LightStatusResult> {
    this.logger.log(`=== 開始計算燈號 ===`);
    this.logger.log(`福利ID: ${welfareId}, 用戶ID: ${userId}`);

  // 1. 找 welfare 的身份陣列
  const welfare = await this.welfareRepository.findOne({
    where: { id: String(welfareId) },
    relations: ['identities'],
  });
  if (!welfare) {
    this.logger.error(`❌ 找不到 welfare (id=${welfareId})`);
    throw new Error(`找不到 welfare (id=${welfareId})`);
  }
  this.logger.log(`📋 福利信息:`);
  this.logger.log(`  - 福利標題: ${welfare.title}`);
  this.logger.log(`  - 福利身份數量: ${welfare.identities?.length || 0}`);

  if (welfare.identities && welfare.identities.length > 0) {
      this.logger.log(`  - 福利身份詳細:`);
      welfare.identities.forEach((identity, index) => {
        this.logger.log(`    ${index + 1}. ID=${identity.id}, Name="${identity.name}"`);
      });
    } else {
      this.logger.log(`  - 福利沒有身份要求`);
    }
  // 2. 找 user 的身份陣列
  const user = await this.userRepository.findOne({
    where: { id: String(userId) },
    relations: ['identities'],
  });
  if (!user) {
    this.logger.error(`❌ 找不到 user (id=${userId})`);
    throw new Error(`找不到 user (id=${userId})`);
  }
  this.logger.log(`👤 用戶信息:`);
    this.logger.log(`  - 用戶姓名: ${user.name}`);
    this.logger.log(`  - 用戶郵箱: ${user.email}`);
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    this.logger.log(`  - 用戶生日: ${user.birthday}`);
     // 計算年齡
    if (user.birthday) {
      const age = new Date().getFullYear() - new Date(user.birthday).getFullYear();
      this.logger.log(`  - 計算年齡: ${age} 歲`);
      
      if (age < 0 || age > 150) {
        this.logger.warn(`  ⚠️  異常年齡: ${age} 歲`);
      }
    }
    
    this.logger.log(`  - 用戶身份數量: ${user.identities?.length || 0}`);
    
    if (user.identities && user.identities.length > 0) {
      this.logger.log(`  - 用戶身份詳細:`);
      user.identities.forEach((identity, index) => {
        this.logger.log(`    ${index + 1}. ID=${identity.id}, Name="${identity.name}"`);
      });
      
      // 🔥 分析身份類型
      const ageIdentities = user.identities.filter(i => [1, 2, 3].includes(i.id));
      const specialIdentities = user.identities.filter(i => i.id >= 4 && i.id <= 11);
      
      this.logger.log(`  - 年齡段身份 (ID 1-3): ${ageIdentities.length} 個`);
      ageIdentities.forEach(identity => {
        this.logger.log(`    * ID=${identity.id}, Name="${identity.name}"`);
      });
      
      this.logger.log(`  - 特定身份 (ID 4-11): ${specialIdentities.length} 個`);
      specialIdentities.forEach(identity => {
        this.logger.log(`    * ID=${identity.id}, Name="${identity.name}"`);
      });
      
    } else {
      this.logger.log(`  - 用戶沒有設定身份`);
    }

    // 3. 呼叫既有邏輯判斷
    this.logger.log(`🔄 開始執行燈號計算邏輯...`);

  // 3. 呼叫既有邏輯判斷
  return this.getWelfareLight(welfare.identities, user.identities);
}
}
