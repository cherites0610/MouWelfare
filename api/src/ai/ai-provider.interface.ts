export interface AIProvider {
  // ✨ 修改點：增加 systemPrompt 參數
  generateContent(userPrompt: string, systemPrompt: string): Promise<string>;
}

export const AI_PROVIDER = "AI_PROVIDER";
