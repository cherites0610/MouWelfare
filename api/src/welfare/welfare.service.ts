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
      this.logger.log(`- 正在為 userID: ${dto.userID} 組合篩選條件以計算燈號...`);

      // 步驟 1: 收集所有來自前端篩選器的「身份名稱」
      const combinedIdentityNames: string[] = [];

      if (dto.age) {
        combinedIdentityNames.push(dto.age);
      }
      if (dto.gender) {
        combinedIdentityNames.push(dto.gender);
      }
      if (dto.income && dto.income.length > 0) {
        combinedIdentityNames.push(...dto.income);
      }
      if (dto.identities && dto.identities.length > 0) {
        combinedIdentityNames.push(...dto.identities);
      }
      
      // 使用 Set 來去除可能存在的重複項
      const uniqueIdentityNames = [...new Set(combinedIdentityNames)];
      this.logger.log(`  - 組合後的身份名稱: [${uniqueIdentityNames.join(', ')}]`);

      // 步驟 2: 將這些名稱轉換為完整的 Identity 物件陣列
      const identitiesForLightCalculation = this.constDataService.getIdentities().filter(
        (identity) => uniqueIdentityNames.includes(identity.name)
      );

      this.logger.log(`  - 轉換後的 Identity 物件數量: ${identitiesForLightCalculation.length}`);

      // 步驟 3: 將這個「完整」的模擬身份列表傳遞給燈號計算函式
      const familyID = dto.families?.[0]; // 假設 DTO 中有 familyID
      await this.appendLightAndFamilyInfo(
        welfares,
        responseList,
        dto.userID,
        identitiesForLightCalculation, // <-- 傳遞包含了所有篩選條件的完整列表
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
  const welfareIdentityNames = welfareIdentities.map(i => i.name);
  
   if (!userIdentities || userIdentities.length === 0 || userIdentities[0]?.id === 0) {
     reasons.push('🟡 因為您尚未選擇篩選條件，無法進行精確判斷。');
     return {
       status: LightStatus.NoIdentity, // 2
       reasons,
       welfareIdentityNames,
       userIdentityNames: ['未選擇'],
    };
  }
  const userIdentityNames = userIdentities.map(i => i.name);
  // reasons.push(`福利要求身份: ${welfareIdentityNames.join('、') || '無特殊要求'}`);
  // reasons.push(`您的身份: ${userIdentityNames.join('、')}`);

  // 🟡 步驟 2: 檢查福利本身是否沒有任何身份要求 (第二個黃燈條件)
  if (welfareIdentities.length === 0) {
     reasons.push('🟡 此福利無特殊身份要求，任何人皆可能符合資格，建議您點擊「前往原文網站」詳閱申請細節。');
   return {
     status: LightStatus.NoIdentity, // 2
     reasons,
     welfareIdentityNames,
     userIdentityNames,
   };
  }

 // --- 🔴 紅燈判斷：只要一項不符，就直接出局 ---
  const AGE_GROUP_IDS = [1, 2, 3];
  const GENDER_GROUP_IDS = [4, 5];
  const INCOME_GROUP_IDS = [6, 7];
  const CORE_IDENTITY_GROUP_IDS = [8, 9, 10, 11];

  // 🔴 判斷組 1: 年齡
  const welfareAgeIdentities = welfareIdentities.filter(i => AGE_GROUP_IDS.includes(i.id));
  if (welfareAgeIdentities.length > 0) {
    const isAgeEligible = welfareAgeIdentities.some(wi => userIdentities.some(ui => ui.id === wi.id));
    const requiredAgeName = welfareAgeIdentities.map(i => i.name).join('或');
    const userAgeIdentity = userIdentities.find(ui => AGE_GROUP_IDS.includes(ui.id));
    const userAgeName = userAgeIdentity ? userAgeIdentity.name : '未選擇';
    if (isAgeEligible) {
      reasons.push(`✅ 年齡：符合要求\n     (福利要求: ${requiredAgeName}，您為[${userAgeName}])。`);
    } else {
      reasons.push(`❌ 年齡：不符合\n     (福利要求: ${requiredAgeName}，您為[${userAgeName}])。`);
      return { status: LightStatus.NotEligible, reasons, welfareIdentityNames, userIdentityNames };
    }
  } else {
    reasons.push('⚪ 年齡：無特定要求。');
  }

  // 🔴 判斷組 2: 性別
   const welfareGenderIdentities = welfareIdentities.filter(i => GENDER_GROUP_IDS.includes(i.id));
  if (welfareGenderIdentities.length > 0) {
    const isGenderEligible = welfareGenderIdentities.some(wi => userIdentities.some(ui => ui.id === wi.id));
    const requiredGenderName = welfareGenderIdentities.map(i => i.name).join('或');
    const userGenderIdentity = userIdentities.find(ui => GENDER_GROUP_IDS.includes(ui.id));
    const userGenderName = userGenderIdentity ? userGenderIdentity.name : '未選擇';
    if (isGenderEligible) {
      reasons.push(`✅ 性別：符合要求\n     (福利要求: ${requiredGenderName}，您為[${userGenderName}])。`);
    } else {
      reasons.push(`❌ 性別：不符合\n     (福利要求: ${requiredGenderName}，您為[${userGenderName}])。`);
      return { status: LightStatus.NotEligible, reasons, welfareIdentityNames, userIdentityNames };
    }
  } else {
    reasons.push('⚪ 性別：無特定要求。');
  }

  // 🔴 判斷組 3: 收入 (OR 邏輯)
  const welfareIncomeIdentities = welfareIdentities.filter(i => INCOME_GROUP_IDS.includes(i.id));
  if (welfareIncomeIdentities.length > 0) {
    const userHasMatchingIncome = welfareIncomeIdentities.some(wi => userIdentities.some(ui => ui.id === wi.id));
    const userIncomeIdentities = userIdentities.filter(ui => INCOME_GROUP_IDS.includes(ui.id));
    const userIncomeNames = userIncomeIdentities.map(ui => ui.name);
    const requiredIncomeName = welfareIncomeIdentities.map(i => i.name).join('或');
    const userIncomeText = userIncomeNames.length > 0 ? userIncomeNames.join('、') : '未選擇';
    if (userHasMatchingIncome) {
      reasons.push(`✅ 收入：符合要求\n     (福利要求: ${requiredIncomeName}，您為[${userIncomeText}])。`);
    } else {

      reasons.push(`❌ 收入：不符合\n     (福利要求: ${requiredIncomeName}，您為[${userIncomeText}])。`);
      return { status: LightStatus.NotEligible, reasons, welfareIdentityNames, userIdentityNames };
    }
  } else {
    reasons.push('⚪ 收入：無特定要求。');
  }

  // 🔴 判斷組 4: 核心身分 (AND 邏輯)
  const welfareCoreIdentities = welfareIdentities.filter(i => CORE_IDENTITY_GROUP_IDS.includes(i.id));
  if (welfareCoreIdentities.length > 0) {

    // --- 新增的邏輯 ---
    // 1. 先找出使用者擁有哪些核心身份，方便後續顯示
    const userCoreIdentities = userIdentities.filter(ui => CORE_IDENTITY_GROUP_IDS.includes(ui.id));
    const userCoreIdentityNames = userCoreIdentities.map(ui => ui.name);
    const userCoreIdentitiesText = userCoreIdentityNames.length > 0 ? userCoreIdentityNames.join('、') : '無';
    // --- 邏輯結束 ---

    for (const coreIdentity of welfareCoreIdentities) {
      // 檢查使用者是否擁有「這一個」必要身份
      if (!userIdentities.some(ui => ui.id === coreIdentity.id)) {
        reasons.push(`❌ 核心身份：不符合\n     (福利要求: "${coreIdentity.name}"，您為[${userCoreIdentitiesText}])。`);
        return { status: LightStatus.NotEligible, reasons, welfareIdentityNames, userIdentityNames };
      }
    }
    const requiredCoreNames = welfareCoreIdentities.map(i => i.name).join('、');
    reasons.push(`✅ 核心身份：所有要求均符合\n     (福利要求: "${requiredCoreNames}"，您為[${userCoreIdentitiesText}])。`);
  } else {
    reasons.push('⚪ 核心身份：無特定要求。');
  }
// --- 🟢 綠燈判斷 ---
  reasons.push('\n🟢 綜合判斷，您符合所有必要條件！');
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
  async getWelfareLightStatusFromText(welfareId: string, queryText: string): Promise<LightStatusResult> {
    this.logger.log(`🔍 從文字中計算燈號: "${queryText}"`);

    // 1. 獲取福利要求的身份 (與之前相同)
    const welfare = await this.welfareRepository.findOne({
      where: { id: String(welfareId) },
      relations: ['identities'],
    });
    if (!welfare) {
      throw new Error(`找不到福利 (id=${welfareId})`);
    }

    // 2. 從文字中提取使用者提到的身份
    const allIdentities = this.constDataService.getIdentities();
    const userIdentitiesFromText = allIdentities.filter(
      (identity) => queryText.includes(identity.name)
    );
    
    this.logger.log(`   ‣ 提取到的身份: [${userIdentitiesFromText.map(i => i.name).join(', ')}]`);
    // --- ✨ 新增年齡解析邏輯 ---
    const ageMatch = queryText.match(/(\d+)\s*歲/); // 用正規表示式尋找 "數字+歲"
    if (ageMatch && ageMatch[1]) {
      const age = parseInt(ageMatch[1], 10);
      this.logger.log(`   ‣ 提取到的年齡: ${age} 歲`);
      
      let ageIdentityId: number | null = null;
      if (age < 20) {
        ageIdentityId = 1; // <20歲
      } else if (age >= 20 && age <= 65) {
        ageIdentityId = 2; // 20-65歲
      } else if (age > 65) {
        ageIdentityId = 3; // >65歲
      }

      if (ageIdentityId) {
        const ageIdentity = allIdentities.find(i => i.id === ageIdentityId);
        if (ageIdentity && !userIdentitiesFromText.some(i => i.id === ageIdentityId)) {
          // 如果這個年齡身份還沒被加進去，就加進去
          userIdentitiesFromText.push(ageIdentity);
        }
      }
    }
    // --- 年齡解析邏輯結束 ---

    this.logger.log(`   ‣ 最終組合身份: [${userIdentitiesFromText.map(i => i.name).join(', ')}]`);

    // 3. 呼叫既有的核心邏輯進行判斷
    return this.getWelfareLight(welfare.identities, userIdentitiesFromText);
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
      this.logger.log(`  - 用戶沒有選擇身份`);
    }

    // 3. 呼叫既有邏輯判斷
    this.logger.log(`🔄 開始執行燈號計算邏輯...`);

  // 3. 呼叫既有邏輯判斷
  return this.getWelfareLight(welfare.identities, user.identities);
}
}
