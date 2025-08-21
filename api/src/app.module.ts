import { Module } from "@nestjs/common";
import { AppController } from "./app.controller.js";
import { UserModule } from "./user/user.module.js";
import { WelfareModule } from "./welfare/welfare.module.js";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { ConstantsModule } from "./common/const-data/constants.module.js";
import { AuthModule } from "./auth/auth.module.js";
import { APP_PIPE } from "@nestjs/core";
import { ZodValidationPipe } from "nestjs-zod";
import { FamilyModule } from "./family/family.module.js";
import { UserFamilyModule } from "./user-family/user-family.module.js";
import { NotificationModule } from "./notification/notification.module.js";
import { CacheModule } from "@nestjs/cache-manager";
import { redisStore } from "cache-manager-redis-store";
import { ServeStaticModule } from "@nestjs/serve-static";
import { join } from "path";
import { CrawlerModule } from "./crawler/crawler.module.js";
import { BullModule } from "@nestjs/bullmq";
import { dirname } from "path";
import { fileURLToPath } from "url";
import { VertexModule } from './vertex/vertex.module.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env.develop',
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      useFactory: (configService) => ({
        type: "mysql",
        host: configService.get("DB_HOST"),
        port: configService.get("DB_PORT"),
        username: configService.get("DB_USER"),
        password: configService.get("DB_PASSWORD"),
        database: configService.get("DB_NAME"),
        // dropSchema: true,
        autoLoadEntities: true,
        synchronize: configService.get("DB_SYNCHRONIZE"),
      }),
      inject: [ConfigService],
    }),

    ServeStaticModule.forRootAsync({
      useFactory: async () => [
        {
          rootPath: join(__dirname, "..", "public"),
        },
      ],
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        store: redisStore,
        host: configService.get<string>("REDIS_HOST", "localhost"),
        port: configService.get<number>("REDIS_PORT", 6379),
        username: configService.get<string>("REDIS_USERNAME"),
        password: configService.get<string>("REDIS_PASSWORD"),
        ttl: 24 * 60 * 60, // 預設 TTL 為 24 小時（秒）
      }),
      inject: [ConfigService],
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>("REDIS_HOST", "localhost"),
          port: configService.get<number>("REDIS_PORT", 6379),
          username: configService.get<string>("REDIS_USERNAME"),
          password: configService.get<string>("REDIS_PASSWORD"),
        },
      }),
      inject: [ConfigService],
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
    VertexModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe,
    },
  ],
})
export class AppModule {}
