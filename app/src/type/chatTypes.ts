import { ImageSourcePropType } from "react-native";

export interface Item {
  id: number;
  name: string;
  image: ImageSourcePropType;
}

// 對應後端的 EnrichedWelfareCard
export interface EnrichedWelfareCard {
  id: string;
  title: string;
  summary: string;
  detail?: string;
  forward?: string[];
  link?: string;
  location?: string;
  publicationDate?: string;
  categories?: string[];
  applicationCriteria?: string[];
  lightStatus?: number | undefined; // 1: Green, 2: Yellow, 3: Red
  lightReason?: string[];
}

export interface ChatApiResponse {
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

export interface Message {
  type: "user" | "bot" | "service" | "result" | "loading";
  content?: string;
  items?: Item[];
  resultItems?: EnrichedWelfareCard[]; // 更新這裡的型別
  showAvatar?: boolean;
  relatedQuestions?: string[]; // 新增：可選，用於顯示相關問題建議
}
