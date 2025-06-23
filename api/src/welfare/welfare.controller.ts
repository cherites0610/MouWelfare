import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from "@nestjs/common";
import { WelfareService } from "./welfare.service.js";
import { CreateWelfareDto } from "./dto/create-welfare.dto.js";
import { UpdateWelfareDto } from "./dto/update-welfare.dto.js";
import { ResponseDTO } from "../common/dto/response.dto.js";
import { Public } from "../common/decorators/public.decorator.js";
import { FindAllDTO } from "./dto/find-all.dto.js";
import { FindOneDTO } from "./dto/find-one.dto.js";

@Controller("welfare")
export class WelfareController {
  constructor(private readonly welfareService: WelfareService) {}

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
  update(@Param("id") id: string, @Body() updateWelfareDto: UpdateWelfareDto) {
    return this.welfareService.update(+id, updateWelfareDto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.welfareService.remove(+id);
  }
}
