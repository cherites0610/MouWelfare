// src/ai/resilient-ai.service.ts
import { Injectable, Logger } from "@nestjs/common";
import CircuitBreaker from "opossum";
import { AIProvider } from "./ai-provider.interface.js";

@Injectable()
export class ResilientAIService {
  private readonly logger = new Logger(ResilientAIService.name);
  private readonly providers: AIProvider[];
  private readonly primaryProvider: AIProvider;
  private breaker: CircuitBreaker;

  constructor(orderedProviders: AIProvider[]) {
    if (!orderedProviders || orderedProviders.length === 0) {
      throw new Error("AI Providers 陣列不得為空！");
    }
    this.providers = orderedProviders;
    this.primaryProvider = this.providers[0];

    const options: CircuitBreaker.Options = {
      timeout: 60000,
      errorThresholdPercentage: 50,
      resetTimeout: 300000, // 5 分鐘
    };

    // ✨ 斷路器只包裹主要 Provider
    this.breaker = new CircuitBreaker(
      (userPrompt: string, systemPrompt: string) =>
        this.primaryProvider.generateContent(userPrompt, systemPrompt),
      options
    );

    this.breaker.on("open", () =>
      this.logger.error(`[AI CircuitBreaker] 斷路器開啟！主要服務已熔斷。`)
    );
    this.breaker.on("close", () =>
      this.logger.log(`[AI CircuitBreaker] 斷路器關閉。主要服務已恢復。`)
    );
  }

  public async generateContent(
    userPrompt: string,
    systemPrompt: string
  ): Promise<string> {
    let lastError: Error | null = null;

    for (let i = 0; i < this.providers.length; i++) {
      const provider = this.providers[i];
      const isPrimary = i === 0;

      try {
        if (isPrimary) {
          this.logger.log("嘗試使用主要 Provider...");
          return await this.breaker.fire(userPrompt, systemPrompt);
        } else {
          this.logger.warn(
            `主要 Provider 失敗，嘗試使用備援 Provider #${i}...`
          );
          return await provider.generateContent(userPrompt, systemPrompt);
        }
      } catch (error) {
        lastError = error;
        this.logger.error(
          `Provider #${i} (${isPrimary ? "Primary" : "Fallback"}) 執行失敗: ${error.message}`
        );
        if (isPrimary && this.breaker.opened) {
          this.logger.error("失敗原因是斷路器處於開啟狀態。");
        }
      }
    }

    // 如果所有 Provider 都失敗了，拋出最後一個錯誤
    this.logger.error("所有 AI Provider 都已嘗試失敗。");
    throw new Error(`所有備援均告失敗: ${lastError?.message || "未知錯誤"}`);
  }
}
