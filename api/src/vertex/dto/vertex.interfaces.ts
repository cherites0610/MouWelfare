export interface WelfareCard {
  id: string;
  title: string;
  summary: string;
  detail?: string;
  forward?: string;
  link?: string;
  location?: string;
  publicationDate?: string;
  categories?: string[];
  applicationCriteria?: string;
}

export interface EnrichedWelfareCard extends WelfareCard {
  lightStatus?: "green" | "yellow" | "red" | undefined;
  lightReason?: string[];
}

export interface UserProfile {
  age?: number;
  city?: string;
  identity?: string;
  income?: string;
}

export interface AiAnswerResponse {
  conversationId: number;
  answer: string;
  welfareCards: EnrichedWelfareCard[];
  relatedQuestions: string[];
  sessionName?: string;
  queryId?: string;
  isNewConversation: boolean;
  detectedIdentities: string[];
  detectedLocation?: string;
}

export interface ComparisonRow {
  dimension: string;
  values: Record<string, string>;
}

export interface ComparisonColumn {
  key: string; // 對應到 row.values 的 key (即 welfareId)
  location: string; // 主要顯示：例如 "桃園市"
  title: string; // 次要顯示：例如 "獨居老人藥事服務"
  isSource: boolean; // 標記是否為使用者原本查詢的那筆 (可讓前端高亮顯示)
}

export interface ComparisonTableResponse {
  columns: ComparisonColumn[];
  rows: ComparisonRow[];
}
