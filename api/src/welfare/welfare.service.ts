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
import {
  WelfareResponseDTO,
  FamilyMemberDTO,
} from "./dto/output-welfare.dto.js";
import { FindOneDTO } from "./dto/find-one.dto.js";
import { UserFamily } from "../user-family/entities/user-family.entity.js";
import { LightStatus } from "../common/enum/light-status.enum.js";
import { User } from "../user/entities/user.entity.js";
import dayjs from "dayjs";
import { LightStatusResult } from "./interface/light-status-result.interface.js";

@Injectable()
export class WelfareService {
  private readonly AGE_GROUP_IDS = [1, 2, 3];
  private readonly GENDER_GROUP_IDS = [4, 5];
  private readonly INCOME_GROUP_IDS = [6, 7];
  private readonly CORE_IDENTITY_GROUP_IDS = [8, 9, 10, 11];

  private readonly logger = new Logger(WelfareService.name);
  private readonly identitySynonymMapping: { [key: string]: string } = {
    // --- 性別 (Gender) ---
    女生: "女性",
    女孩: "女性",
    女人: "女性",
    男生: "男性",
    男孩: "男性",
    男人: "男性",

    // --- 收入 (Income) ---
    低收: "低收入戶",
    中低收: "中低收入戶",
    清寒: "低收入戶", // "清寒" 通常指低收入戶
    弱勢: "低收入戶", // "弱勢" 較廣泛，但此處對應到最相關的福利身份

    // --- 核心身分 (Core Identities) ---
    身障: "身心障礙者",
    殘障: "身心障礙者",
    殘疾: "身心障礙者",
    障友: "身心障礙者",
    行動不便: "身心障礙者", // 描述性詞彙

    原民: "原住民",
    原住民族: "原住民", // 正式稱呼

    榮譽國民: "榮民", // 完整名稱
    老兵: "榮民", // 口語化稱呼

    外配: "外籍配偶家庭", // 常見簡稱
    新住民: "外籍配偶家庭", // 目前最常用且正式的稱呼

    // // --- 年齡 (Age) ---
    // // 雖然年齡主要由正規表示式處理，但加入這些關鍵字
    // // 可以讓AI在沒有明確歲數時，也能捕捉到使用者的意圖
    // '老人': '65歲以上',
    // '長者': '65歲以上',
    // '長輩': '65歲以上',
    // '銀髮族': '65歲以上',
    // '阿公': '65歲以上',
    // '阿嬤': '65歲以上',

    // '成年人': '20歲-65歲',
    // '青壯年': '20歲-65歲',
    // '上班族': '20歲-65歲',

    // '小孩': '20歲以下',
    // '兒童': '20歲以下',
    // '少年': '20歲以下',
    // '青少年': '20歲以下',
    // '學生': '20歲以下',
  };
  constructor(
    @InjectRepository(Welfare)
    private readonly welfareRepository: Repository<Welfare>,
    private readonly constDataService: ConstDataService,
    private readonly familyService: FamilyService,
    private readonly userService: UserService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
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
      await this.enrichWelfareList(dto, welfares, responseList);
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

    if (dto?.userID) {
      const user = await this.userService.findOneByID(dto.userID);
      const userLightResult = this.getWelfareLight(
        welfare.identities,
        user.identities,
        welfare.location?.name,
        user.location?.name
      );
      console.log(userLightResult);

      response.lightStatus = userLightResult.status;
      response.lightReason = userLightResult.reasons;

      if (dto.familyID && dto.familyID.length > 0) {
        const otherFamilyMembers = await this.getOtherFamilyMembers(
          dto.familyID,
          dto.userID
        );

        if (otherFamilyMembers.length > 0) {
          response.familyMember = this.calculateFamilyLights(
            welfare,
            otherFamilyMembers
          );
        }
      }
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

  private getWelfareLight(
    welfareIdentities: Identity[],
    userIdentities: Identity[] | undefined,
    welfareLocation?: string,
    userLocation?: string
  ): LightStatusResult {
    const reasons: string[] = [];
    const welfareIdentityNames = welfareIdentities.map((i) => i.name);
    console.log(userLocation);

    const locationCheck = this.checkLocation(welfareLocation, userLocation);
    reasons.push(locationCheck.message);
    console.log(locationCheck);

    if (!locationCheck.eligible) {
      // 地區不符，立即回傳紅燈。
      // 此時 userIdentities 可能是 undefined，我們做個處理。
      const userIdentityNames = userIdentities?.map((i) => i.name) ?? [
        "未選擇",
      ];
      return {
        status: LightStatus.NotEligible,
        reasons,
        welfareIdentityNames,
        userIdentityNames,
      };
    }

    // --- 走到這裡，代表「地區」已通過 (或福利無地區要求) ---

    // 🟡 檢查 2: (使用者)是否有提供「身份」？
    // 在地區通過後，我們才檢查使用者是否提供了身份。
    if (
      !userIdentities ||
      userIdentities.length === 0 ||
      userIdentities[0]?.id === 0
    ) {
      // 地區 OK，但沒有身份可供下一步比對。
      reasons.push(
        "🟡 因為您尚未選擇「身份」相關條件，無法進行更精確的身份判斷。"
      );
      return {
        status: LightStatus.NoIdentity,
        reasons,
        welfareIdentityNames,
        userIdentityNames: ["未選擇"],
      };
    }

    // --- 走到這裡，代表「地區」OK 且「使用者」有提供身份 ---

    // 既然已確認有 userIdentities，我們再補上摘要資訊
    const userIdentityNames = userIdentities.map((i) => i.name);
    reasons.unshift(`您的身份: ${userIdentityNames.join("、")}\n`);
    reasons.unshift(
      `福利要求身份: ${welfareIdentityNames.join("、") || "無特殊要求"}`
    );

    // 🟡 檢查 3: (福利)本身是否有「身份」要求？
    if (welfareIdentities.length === 0) {
      reasons.push(
        "🟡 此福利無特殊身份要求，任何人皆可能符合資格，建議您點擊「前往原文網站」詳閱申請細節。"
      );
      return {
        status: LightStatus.NoIdentity,
        reasons,
        welfareIdentityNames,
        userIdentityNames,
      };
    }

    // 🔴 檢查 4: 依序判斷所有身份群組
    const identityChecks: EligibilityCheckResult[] = [
      this.checkIdentityGroup(
        welfareIdentities,
        userIdentities,
        this.AGE_GROUP_IDS,
        "年齡",
        "OR"
      ),
      this.checkIdentityGroup(
        welfareIdentities,
        userIdentities,
        this.GENDER_GROUP_IDS,
        "性別",
        "OR"
      ),
      this.checkIdentityGroup(
        welfareIdentities,
        userIdentities,
        this.INCOME_GROUP_IDS,
        "收入",
        "OR"
      ),
      this.checkIdentityGroup(
        welfareIdentities,
        userIdentities,
        this.CORE_IDENTITY_GROUP_IDS,
        "核心身份",
        "AND"
      ),
    ];

    for (const check of identityChecks) {
      reasons.push(check.message);
      if (!check.eligible) {
        return {
          status: LightStatus.NotEligible,
          reasons,
          welfareIdentityNames,
          userIdentityNames,
        };
      }
    }

    // 🟢 檢查通過: 所有條件均符合
    reasons.push("\n🟢 綜合判斷，您符合所有必要條件！");
    return {
      status: LightStatus.Eligible,
      reasons,
      welfareIdentityNames,
      userIdentityNames,
    };
  }

  private getWelfareLightForProfile(
    // welfareIdentities: Identity[],
    welfare: Welfare,
    user: User // <-- 關鍵不同：接收完整的 User 物件
  ): LightStatusResult {
    this.logger.log(
      `  -> 正在為使用者 [${user.name}] 的真實個人檔案計算燈號...`
    );

    // 1. 準備一個「動態」的身份列表，從使用者已儲存的身份開始
    const dynamicUserIdentities: Identity[] = user.identities
      ? [...user.identities]
      : [];
    const allIdentities = this.constDataService.getIdentities();

    // 2. 根據 user.gender，動態加入「性別身份」
    if (user.gender) {
      const genderIdentity = allIdentities.find((i) => i.name === user.gender);
      // 如果找到了對應的性別身份，且尚未存在於列表中，則加入
      if (
        genderIdentity &&
        !dynamicUserIdentities.some((i) => i.id === genderIdentity.id)
      ) {
        dynamicUserIdentities.push(genderIdentity);
      }
    }

    // 3. 根據 user.birthday，動態計算並加入「年齡身份」
    if (user.birthday) {
      const age = dayjs().diff(user.birthday, "year");
      let ageIdentityId: number | null = null;
      if (age < 20) ageIdentityId = 1;
      else if (age >= 20 && age <= 65) ageIdentityId = 2;
      else ageIdentityId = 3;

      if (ageIdentityId) {
        const ageIdentity = allIdentities.find((i) => i.id === ageIdentityId);
        // 如果找到了對應的年齡身份，且尚未存在於列表中，則加入
        if (
          ageIdentity &&
          !dynamicUserIdentities.some((i) => i.id === ageIdentity.id)
        ) {
          dynamicUserIdentities.push(ageIdentity);
        }
      }
    }

    this.logger.log(
      `     - 為 [${user.name}] 組合後的身份: [${dynamicUserIdentities.map((i) => i.name).join(", ")}]`
    );

    // 4. 最後，呼叫既有的核心判斷引擎，傳入我們剛剛組合好的完整身份列表
    return this.getWelfareLight(
      welfare.identities,
      dynamicUserIdentities,
      welfare.location?.name,
      user.location?.name
    );
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

  async findAllAbnormalWelfare() {
    const welfares = await this.welfareRepository.find({
      relations: ["location", "categories", "identities"],
      where: { isAbnormal: true },
    });

    return welfares.map((welfare) => this.mapWelfareToDTO(welfare));
  }

  private async getOtherFamilyMembers(
    familyID: string,
    userID: string
  ): Promise<UserFamily[]> {
    const family = await this.familyService.findOneByFamilyID(familyID);
    this.logger.log(
      family
        ? ` [Helper] 成功找到家庭: ${family.name}`
        : ` [Helper] ⚠️ 警告：未找到 familyID 為 ${familyID} 的家庭`
    );

    if (!family) {
      return [];
    }

    const otherFamilyMembers = family.userFamilies.filter(
      (uf) => uf.user.id !== userID
    );
    this.logger.log(
      ` [Helper] 找到了 ${otherFamilyMembers.length} 位其他家庭成員`
    );
    return otherFamilyMembers;
  }

  private async enrichWelfareList(
    dto: FindAllDTO,
    welfareList: Welfare[],
    dtoList: WelfareResponseDTO[]
  ) {
    const identities = this.parseFiltersToIdentities(dto);
    const user = await this.userRepository.findOne({
      where: { id: dto.userID },
      relations: { location: true, identities: true },
    });
    const userLocation = user?.location?.name;

    const familyID = dto.families?.[0];
    let otherFamilyMembers: UserFamily[] = [];

    if (familyID) {
      otherFamilyMembers = await this.getOtherFamilyMembers(
        familyID,
        dto.userID!
      );
    }

    for (let i = 0; i < welfareList.length; i++) {
      const welfare = welfareList[i];
      const dtoItem = dtoList[i];

      const userLightResult = this.getWelfareLight(
        welfare.identities,
        identities,
        welfare.location?.name,
        userLocation
      );
      dtoItem.lightStatus = userLightResult.status;
      dtoItem.lightReason = userLightResult.reasons;

      if (otherFamilyMembers.length > 0) {
        dtoItem.familyMember = this.calculateFamilyLights(
          welfare,
          otherFamilyMembers
        );
      }
    }
  }

  private calculateFamilyLights(
    welfare: Welfare,
    otherFamilyMembers: UserFamily[]
  ): FamilyMemberDTO[] {
    const eligibleFamilyMembers: FamilyMemberDTO[] = [];

    for (const familyMember of otherFamilyMembers) {
      const result = this.getWelfareLightForProfile(welfare, familyMember.user);

      const lightEmoji =
        result.status === 1 ? "🟢" : result.status === 2 ? "🟡" : "🔴";
      this.logger.log(`  -> 對 [${familyMember.user.name}] 的審查結果:`);
      this.logger.log(`     - 燈號狀態: ${result.status} (${lightEmoji})`);
      this.logger.log(
        `     - 審查報告:\n       - ${result.reasons.join("\n       - ")}`
      );

      if (
        result.status === LightStatus.Eligible ||
        result.status === LightStatus.NoIdentity
      ) {
        eligibleFamilyMembers.push({
          avatarUrl: familyMember.user.avatarUrl,
          name: familyMember.user.name,
          lightStatus: result.status,
          lightReason: result.reasons,
        });
      }
    }

    this.logger.log(
      `  -> 最終符合資格並準備回傳的成員數量: ${eligibleFamilyMembers.length}`
    );
    return eligibleFamilyMembers;
  }

  async getWelfareLightStatusFromText(
    welfareId: string,
    queryText: string
  ): Promise<LightStatusResult> {
    this.logger.log(`🔍 從文字中計算燈號: "${queryText}"`);

    const welfare = await this.welfareRepository.findOne({
      where: { id: String(welfareId) },
      relations: ["identities", "location"],
    });
    if (!welfare) {
      throw new Error(`找不到福利 (id=${welfareId})`);
    }

    const allIdentities = this.constDataService.getIdentities();
    const foundIdentities = new Map<number, Identity>();

    for (const identity of allIdentities) {
      if (queryText.includes(identity.name)) {
        foundIdentities.set(identity.id, identity);
      }
    }

    for (const synonym in this.identitySynonymMapping) {
      if (queryText.includes(synonym)) {
        const officialName = this.identitySynonymMapping[synonym];
        const correspondingIdentity = allIdentities.find(
          (i) => i.name === officialName
        );
        if (correspondingIdentity) {
          foundIdentities.set(correspondingIdentity.id, correspondingIdentity);
        }
      }
    }

    const allLocations = this.constDataService.getLocations();
    const foundLocation = allLocations.find((loc) =>
      queryText.includes(loc.name)
    );
    const userLocationFromText = foundLocation ? foundLocation.name : undefined;
    const userIdentitiesFromText = Array.from(foundIdentities.values());

    this.logger.log(
      `   ‣ 提取到的身份: [${userIdentitiesFromText.map((i) => i.name).join(", ")}]`
    );

    const ageMatch = queryText.match(/(\d+)\s*歲/);
    if (ageMatch && ageMatch[1]) {
      const age = parseInt(ageMatch[1], 10);
      this.logger.log(`   ‣ 提取到的年齡: ${age} 歲`);

      let ageIdentityId: number | null = null;
      if (age < 20) {
        ageIdentityId = 1;
      } else if (age >= 20 && age <= 65) {
        ageIdentityId = 2;
      } else if (age > 65) {
        ageIdentityId = 3;
      }

      if (ageIdentityId) {
        const ageIdentity = allIdentities.find((i) => i.id === ageIdentityId);
        if (
          ageIdentity &&
          !userIdentitiesFromText.some((i) => i.id === ageIdentityId)
        ) {
          userIdentitiesFromText.push(ageIdentity);
        }
      }
    }

    this.logger.log(
      `   ‣ 最終組合身份: [${userIdentitiesFromText.map((i) => i.name).join(", ")}]`
    );

    return this.getWelfareLight(
      welfare.identities,
      userIdentitiesFromText,
      welfare.location?.name,
      userLocationFromText
    );
  }

  private parseFiltersToIdentities(dto: FindAllDTO): Identity[] {
    this.logger.log(`- 正在為 userID: ${dto.userID} 組合篩選條件以計算燈號...`);

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

    const uniqueIdentityNames = [...new Set(combinedIdentityNames)];
    this.logger.log(
      `  - 組合後的身份名稱: [${uniqueIdentityNames.join(", ")}]`
    );

    const identitiesForLightCalculation = this.constDataService
      .getIdentities()
      .filter((identity) => uniqueIdentityNames.includes(identity.name));

    this.logger.log(
      `  - 轉換後的 Identity 物件數量: ${identitiesForLightCalculation.length}`
    );

    return identitiesForLightCalculation;
  }

  private checkLocation(
    welfareLocation?: string,
    userLocation?: string
  ): EligibilityCheckResult {
    if (!welfareLocation) {
      return {
        eligible: true,
        message: `⚪ 地區：此福利無特定地區要求。`,
      };
    }
    if (welfareLocation === userLocation) {
      return {
        eligible: true,
        message: `✅ 地區：符合要求 (福利與您選擇的地區皆為 [${welfareLocation}])。`,
      };
    }
    const userLocationText = userLocation ? `[${userLocation}]` : "未選擇";

    return {
      eligible: false,
      message: `❌ 地區：不符合 (福利要求: [${welfareLocation}]，您選擇的地區為 ${userLocationText})。`,
    };
  }

  private checkIdentityGroup(
    welfareIdentities: Identity[],
    userIdentities: Identity[],
    groupIds: number[],
    groupName: string,
    logicType: "OR" | "AND"
  ): EligibilityCheckResult {
    const welfareGroupIdentities = welfareIdentities.filter((i) =>
      groupIds.includes(i.id)
    );

    if (welfareGroupIdentities.length === 0) {
      return {
        eligible: true,
        message: `⚪ ${groupName}：無特定要求。`,
      };
    }

    const userGroupIdentities = userIdentities.filter((ui) =>
      groupIds.includes(ui.id)
    );

    const requiredNames = welfareGroupIdentities
      .map((i) => i.name)
      .join(logicType === "OR" ? "或" : "、");

    const userNames = userGroupIdentities.map((ui) => ui.name);
    const userText = userNames.length > 0 ? userNames.join("、") : "未選擇";

    let isEligible = false;
    if (logicType === "OR") {
      isEligible = welfareGroupIdentities.some((wi) =>
        userIdentities.some((ui) => ui.id === wi.id)
      );
    } else {
      isEligible = welfareGroupIdentities.every((wi) =>
        userIdentities.some((ui) => ui.id === wi.id)
      );
    }

    if (isEligible) {
      return {
        eligible: true,
        message: `✅ ${groupName}：符合要求\n 	 (福利要求:[${requiredNames}]，您為[${userText}])。`,
      };
    } else {
      return {
        eligible: false,
        message: `❌ ${groupName}：不符合\n 	 (福利要求:[${requiredNames}]，您為[${userText}])。`,
      };
    }
  }
}

interface EligibilityCheckResult {
  eligible: boolean;
  message: string;
}
