import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Repository } from 'typeorm';
import { Location } from './entities/location.entity';
import { Identity } from './entities/identity.entity';
import { Category } from './entities/category.entity';
import { FaqItem } from './entities/faq-item.entity';

@Injectable()
export class ConstDataService implements OnModuleInit {
    private readonly logger = new Logger(ConstDataService.name)
    private locations: Location[] = [];
    private identities: Identity[] = [];
    private categories: Category[] = [];
    private fqaItem: FaqItem[] = [];

    constructor(
        @InjectRepository(Location)
        private readonly locationRepo: Repository<Location>,
        @InjectRepository(Identity)
        private readonly identityRepo: Repository<Identity>,
        @InjectRepository(Category)
        private readonly categoryRepo: Repository<Category>,
        @InjectRepository(FaqItem)
        private readonly fqaItemRepo: Repository<FaqItem>
    ) { }

    async onModuleInit() {
        await this.loadData();
    }

    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async handleCron() {
        await this.loadData();
        this.logger.log("已重新載入常量")
    }

    private async loadData() {
        this.locations = await this.locationRepo.find();
        this.identities = await this.identityRepo.find();
        this.categories = await this.categoryRepo.find();
        this.fqaItem = await this.fqaItemRepo.find({ where: { enabled: true } })
        this.logger.log("已載入常量")
    }

    getLocations() {
        return this.locations;
    }

    getIdentities() {
        return this.identities;
    }

    getCategories() {
        return this.categories;
    }

    getFqaItem() {
        return this.fqaItem;
    }
}
