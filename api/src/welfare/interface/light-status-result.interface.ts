// common/interfaces/light-status-result.interface.ts
export interface LightStatusResult {
  status: number;         // 最終的燈號狀態 (1, 2, or 3)
  reasons: string[];      // 判斷過程的文字說明陣列
  welfareIdentityNames: string[]; // 福利要求的身份名稱
  userIdentityNames: string[];    // 使用者擁有的身份名稱
}