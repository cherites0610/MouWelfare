import { Controller, Get } from "@nestjs/common";
import { ConstDataService } from "./const-data.service.js";
import { Public } from "../decorators/public.decorator.js";

@Controller()
export class ConstDataController {
  constructor(private readonly constDataService: ConstDataService) {}

  @Public()
  @Get("fqa")
  findAll() {
    return this.constDataService.getFqaItem();
  }
}
