// src/ai/openai.provider.ts
import { Injectable } from "@nestjs/common";
import OpenAI from "openai";
import { ConfigService } from "@nestjs/config";
import { AIProvider } from "./ai-provider.interface.js";

@Injectable()
export class OpenAIProvider implements AIProvider {
  private readonly openai: OpenAI;
  private readonly modelName: string;

  constructor(
    private readonly configService: ConfigService,
    keyPrefix: string
  ) {
    const baseURL = this.configService.get<string>(`${keyPrefix}_AI_BASE_URL`);
    const apiKey = this.configService.get<string>(`${keyPrefix}_AI_API_KEY`);
    this.modelName =
      this.configService.get<string>(`${keyPrefix}_AI_MODEL_NAME`) ??
      "gpt-3.5-turbo";

    this.openai = new OpenAI({
      apiKey,
      baseURL,
    });
  }

  async generateContent(
    userPrompt: string,
    systemPrompt: string
  ): Promise<string> {
    const completion = await this.openai.chat.completions.create({
      model: this.modelName,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });
    console.log("已經消耗Token", completion!.usage!.total_tokens);

    return completion.choices[0].message.content?.trim() || "無法生成內容";
  }
}
