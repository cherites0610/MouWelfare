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
import { WelfareResponseDTO } from "./dto/output-welfare.dto.js";
import { FindOneDTO } from "./dto/find-one.dto.js";
import { UserFamily } from "../user-family/entities/user-family.entity.js";
import { LightStatus } from "../common/enum/light-status.enum.js";

@Injectable()
export class WelfareService {
  private readonly logger = new Logger(WelfareService.name);

  constructor(
    @InjectRepository(Welfare)
    private readonly welfareRepository: Repository<Welfare>,
    private readonly constDataService: ConstDataService,
    private readonly familyService: FamilyService,
    private readonly userService: UserService,
  ) { }

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
      this.constDataService.getCategories(),
    );
    if (categoryIds.length > 0) {
      queryBuilder.andWhere("categories.id IN (:...categoryIds)", {
        categoryIds,
      });
    }

    const locationIds = this.filterByNames(
      dto.locations,
      this.constDataService.getLocations(),
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
      const familyID = dto.families?.[0];
      let identities = this.constDataService.getIdentities();
      identities = identities.filter((item) => {
        return dto.identities?.includes(item.name);
      });
      await this.appendLightAndFamilyInfo(
        welfares,
        responseList,
        dto.userID,
        identities,
        familyID,
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
        dto.familyID,
      );
    }

    return response;
  }

  async update(id: string, updateWelfareDto: UpdateWelfareDto) {
    const foundWelfare = await this.welfareRepository.findOne({
      where: { id },
      relations: ["location", "categories", "identities"]
    })

    if (!foundWelfare) throw new NotFoundException('找不到該福利')

    Object.assign(foundWelfare, updateWelfareDto)
    try {

      await this.welfareRepository.save(foundWelfare)
    } catch (err:any) {
      console.log(err);
      
    }
    return this.mapWelfareToDTO(foundWelfare);
  }

  async remove(id: string) {
    const result = await this.welfareRepository.delete({ id })
    return result.affected === 1 ? true : false
  }

  getWelfareLight(
    welfareIdentities: Identity[],
    userIdentities: Identity[],
  ): number {
    if (!userIdentities) {
      return LightStatus.NoIdentity;
    }

    const welfareIdentitiesIDs = welfareIdentities.map((item) => item.id);
    const userIdentitiesIDs = userIdentities.map((item) => item.id);
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
      if (
        contains(welfareIdentitiesIDs, i) &&
        !contains(userIdentitiesIDs, i)
      ) {
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
        ? welfare.publicationDate.toISOString().split("T")[0]
        : "",
      status: welfare.status,
      location: welfare.location!.name,
      categories: welfare.categories.map((c) => c.name),
      lightStatus: undefined,
      familyMember: [],
      isAbnormal: welfare.isAbnormal
    };
  }

  private async appendLightAndFamilyInfo(
    welfareList: Welfare[],
    dtoList: WelfareResponseDTO[],
    userID: string,
    identities: Identity[],
    familyID?: string,
  ) {
    const user = await this.userService.findOneByID(userID);
    let family: Family | null = null;
    let otherFamilyMembers: UserFamily[] = [];

    if (familyID) {
      family = await this.familyService.findOneByFamilyID(familyID);
      if (!family) throw new NotFoundException("未找到該家庭");

      const isMember = family.userFamilies.some((uf) => uf.user.id === user.id);
      if (!isMember) throw new NotFoundException("用戶不在家庭中");

      otherFamilyMembers = family.userFamilies.filter(
        (uf) => uf.user.id !== user.id,
      );
    }

    for (let i = 0; i < welfareList.length; i++) {
      const welfare = welfareList[i];
      const dto = dtoList[i];
      dto.lightStatus =
        welfare.identities.length == 0
          ? 2
          : this.getWelfareLight(welfare.identities, identities);

      if (family) {
        dto.familyMember = otherFamilyMembers.map((uf) => ({
          avatarUrl: uf.user.avatarUrl,
          lightStatus: this.getWelfareLight(
            welfare.identities,
            uf.user.identities,
          ),
          name: uf.user.name,
        }));
      }
    }
  }

  async findAllAbnormalWelfare() {
    const welfares = await this.welfareRepository.find({
      relations: ["location", "categories", "identities"],
      where: { isAbnormal: true }
    })

    return welfares.map((welfare) => this.mapWelfareToDTO(welfare))
  }
}
