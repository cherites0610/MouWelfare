// src/ai/ai.module.ts
import { Module, Provider } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AIProvider } from "./ai-provider.interface.js";
import { OpenAIProvider } from "./openai.provider.js";
import { ResilientAIService } from "./resilient-ai.service.js";

// 1. 為每個 Provider 建立唯一的 Injection Token
export const OPENAI_AI_PROVIDER = "OPENAI_AI_PROVIDER";
export const GEMINI_AI_PROVIDER = "GEMINI_AI_PROVIDER";
export const QWEN_AI_PROVIDER = "QWEN_AI_PROVIDER";

// 2. 建立一個工廠函數來簡化 Provider 的創建
const createAIProvider = (token: string, keyPrefix: string): Provider => ({
  provide: token,
  useFactory: (configService: ConfigService) => {
    return new OpenAIProvider(configService, keyPrefix);
  },
  inject: [ConfigService],
});

// 3. 在 Module 中註冊所有 Provider
@Module({
  providers: [
    createAIProvider(OPENAI_AI_PROVIDER, "OPENAI"),
    createAIProvider(GEMINI_AI_PROVIDER, "GEMINI"),
    createAIProvider(QWEN_AI_PROVIDER, "QWEN"),

    {
      provide: ResilientAIService,
      useFactory: (
        configService: ConfigService,
        openai: AIProvider,
        gemini: AIProvider,
        qwen: AIProvider
      ) => {
        const priority = configService
          .get<string>("AI_PROVIDER_PRIORITY", "OPENAI,GEMINI,QWEN")
          .split(",");

        const providerMap = {
          OPENAI: openai,
          GEMINI: gemini,
          QWEN: qwen,
        };

        const orderedProviders = priority
          .map((key) => providerMap[key.trim()])
          .filter(Boolean);

        return new ResilientAIService(orderedProviders);
      },
      inject: [
        ConfigService,
        { token: OPENAI_AI_PROVIDER, optional: true },
        { token: GEMINI_AI_PROVIDER, optional: true },
        { token: QWEN_AI_PROVIDER, optional: true },
      ],
    },
  ],
  exports: [ResilientAIService],
})
export class AIModule {}
