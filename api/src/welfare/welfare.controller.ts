import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseBoolPipe,
  UnauthorizedException,
  Headers
} from "@nestjs/common";
import { WelfareService } from "./welfare.service.js";
import { CreateWelfareDto } from "./dto/create-welfare.dto.js";
import { UpdateWelfareDto } from "./dto/update-welfare.dto.js";
import { ResponseDTO } from "../common/dto/response.dto.js";
import { Public } from "../common/decorators/public.decorator.js";
import { FindAllDTO } from "./dto/find-all.dto.js";
import { FindOneDTO } from "./dto/find-one.dto.js";
import { ConfigService } from "@nestjs/config";

@Controller("welfare")
export class WelfareController {
  constructor(
    private readonly welfareService: WelfareService,
    private readonly configService: ConfigService
  ) { }

  private validateApiKey(authHeader: string) {
    const secretApiKey = this.configService.get<string>('ADMIN_API_KEY');
    if (!secretApiKey) {
      throw new Error('環境變數 ADMIN_API_KEY 未設定');
    }
    const expectedBearerToken = Buffer.from(secretApiKey).toString('base64');

    // 2. 執行驗證
    if (!authHeader) {
      throw new UnauthorizedException('缺少 Authorization Header');
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new UnauthorizedException('Token 格式不正確，應為 "Bearer <token>"');
    }

    const receivedToken = parts[1];
    if (receivedToken !== expectedBearerToken) {
      throw new UnauthorizedException('無效的 API Key');
    }
  }

  @Post()
  async create(@Body() createWelfareDto: CreateWelfareDto) {
    return new ResponseDTO(
      "創建成功",
      await this.welfareService.create(createWelfareDto),
    );
  }

  @Get()
  @Public()
  async findAll(@Query() dto: FindAllDTO) {
    return new ResponseDTO("查詢成功", await this.welfareService.findAll(dto));
  }

  @Public()
  @Get(":id")
  async findOne(@Param("id") id: string, @Query() dto: FindOneDTO) {
    return new ResponseDTO(
      "查詢成功",
      await this.welfareService.findOne(id, dto),
    );
  }

  @Patch(":id")
  async update(@Param("id") id: string, @Body() updateWelfareDto: UpdateWelfareDto, @Headers('Authorization') authHeader: string) {
    this.validateApiKey(authHeader);
    return new ResponseDTO(
      "更新成功",
      await this.welfareService.update(id, updateWelfareDto)
    )
  }

  @Delete(":id")
  async remove(@Param("id") id: string, @Headers('Authorization') authHeader: string) {
    this.validateApiKey(authHeader);
    return new ResponseDTO(
      await this.welfareService.remove(id) ? "刪除成功" : "刪除失敗",
      ""
    )
  }

  @Public()
  @Get('/admin/abnormal')
  async findAllAbnormalWelfare(@Headers('Authorization') authHeader: string) {
    this.validateApiKey(authHeader);
    return new ResponseDTO(
      "查詢成功",
      await this.welfareService.findAllAbnormalWelfare(),
    );
  }

  @Public()
  @Post('/:id/abnormal/:abnormal')
  async updateWelfareAbnormal(@Param('id') id: string, @Param('abnormal', ParseBoolPipe) isAbnormal: boolean, @Headers('Authorization') authHeader: string) {
    if (isAbnormal === false) {
      this.validateApiKey(authHeader);
    }
    return new ResponseDTO(
      "更新成功",
      await this.welfareService.update(id, { isAbnormal: isAbnormal })
    );
  }
}
