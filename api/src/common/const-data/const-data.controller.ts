import { Controller, Get } from '@nestjs/common';
import { ConstDataService } from './const-data.service';

@Controller()
export class ConstDataController {
    constructor(private readonly constDataService: ConstDataService) { }

    @Get('fqa')
    findAll() {
        return this.constDataService.getFqaItem();
    }

}
