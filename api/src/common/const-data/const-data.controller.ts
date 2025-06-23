import { Controller, Get } from "@nestjs/common";
import { ConstDataService } from "./const-data.service";
import { Public } from "../decorators/public.decorator";

@Controller()
export class ConstDataController {
  constructor(private readonly constDataService: ConstDataService) {}

  @Public()
  @Get("fqa")
  findAll() {
    return this.constDataService.getFqaItem();
  }
}
