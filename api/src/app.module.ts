import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { UserModule } from './user/user.module';
import { WelfareModule } from './welfare/welfare.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User } from './user/entities/user.entity';
import { ConstDataService } from './common/const-data/const-data.service';
import { ScheduleModule } from '@nestjs/schedule';
import { ConstantsModule } from './common/const-data/constants.module';
import { AuthModule } from './auth/auth.module';
import { APP_PIPE } from '@nestjs/core';
import { ZodValidationPipe } from 'nestjs-zod';
import { FamilyModule } from './family/family.module';
import { UserFamilyModule } from './user-family/user-family.module';
import { NotificationModule } from './notification/notification.module';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-store';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { CrawlerModule } from './crawler/crawler.module';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: `.env.${process.env.NODE_ENV || 'develop'}`,
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      useFactory: async (configService) => ({
        type: 'mysql',
        host: configService.get('DB_HOST'),
        port: configService.get('DB_PORT'),
        username: configService.get('DB_USER'),
        password: configService.get('DB_PASS'),
        database: configService.get('DB_NAME'),
        // dropSchema: true,
        autoLoadEntities: true,
        synchronize: configService.get('DB_SYNCHRONIZE')
      }),
      inject: [ConfigService],
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'), // 靜態檔案的根目錄
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        store: redisStore,
        host: configService.get<string>('REDIS_HOST', 'localhost'),
        port: configService.get<number>('REDIS_PORT', 6379),
        username: configService.get<string>('REDIS_USERNAME'),
        password: configService.get<string>('REDIS_PASSWORD'),
        ttl: 24 * 60 * 60, // 預設 TTL 為 24 小時（秒）
      }),
      inject: [ConfigService],
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
          username: configService.get<string>('REDIS_USERNAME'),
          password: configService.get<string>('REDIS_PASSWORD'),
        }
      }),
      inject: [ConfigService]
    }),
    ScheduleModule.forRoot(),
    ConstantsModule,
    UserModule,
    WelfareModule,
    AuthModule,
    FamilyModule,
    UserFamilyModule,
    NotificationModule,
    CrawlerModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe,
    },
  ],
})
export class AppModule { }