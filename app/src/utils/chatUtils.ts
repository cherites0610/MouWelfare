import { COLORS } from "@/src/utils/colors";
import { User } from "../../src/type/user";
import {
  categorySynonyms,
  sortedCategories,
  sortedLocations,
} from "../constants/chatData";

export const getLightColor = (status: number | undefined) => {
  switch (status) {
    case 1:
      return COLORS.light_green;
    case 2:
      return COLORS.light_yellow;
    case 3:
      return COLORS.light_red;
    default:
      return COLORS.light_yellow;
  }
};

export const getLightText = (status: number | undefined) => {
  switch (status) {
    case 1:
      return "符合領取資格!";
    case 2:
      return "不一定符合領取資格!";
    case 3:
      return "不符合領取資格!";
    default:
      return "不一定符合領取資格!";
  }
};

export const generateUserProfilePrompt = (user: User | null): string => {
  if (!user) return "";
  const profileParts: string[] = [];

  if (user.location?.name) {
    profileParts.push(`${user.location.name}`);
  }
  if (user.identities && user.identities.length > 0) {
    const identityNames = user.identities.map((id) => id.name).join("、");
    profileParts.push(`身分為 ${identityNames}`);
  }
  if (user.birthday) {
    const birthDate = new Date(user.birthday);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    profileParts.push(`目前年齡大約 ${age} 歲`);
  }
  if (user.gender) {
    profileParts.push(`性別為 ${user.gender}`);
  }
  if (profileParts.length === 0) return "";

  return `我的個人背景資料是：${profileParts.join("，")}。`;
};

export const extractCategoriesFromText = (text: string): string[] => {
  if (!text) return [];
  const foundCategories: string[] = [];

  for (const keyword of sortedCategories) {
    if (text.includes(keyword)) {
      if (categorySynonyms[keyword]) {
        foundCategories.push(...categorySynonyms[keyword]);
      } else {
        foundCategories.push(keyword);
      }
    }
  }
  return Array.from(new Set(foundCategories));
};

export const extractLocationFromText = (text: string): string | undefined => {
  if (!text) return undefined;
  for (const loc of sortedLocations) {
    if (text.includes(loc) || text.includes(loc.slice(0, -1))) {
      return loc;
    }
  }
  return undefined;
};
