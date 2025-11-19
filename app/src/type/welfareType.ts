import { FamilyMember } from "./family";

export interface Welfare {
  id: number;
  title: string;
  detail: string;
  link: string;
  location: string;
  publicationDate: string;
  applicationCriteria: string[];
  categories: string[];
  forward: string[];
  status: boolean;
  lightStatus: number;
  lightReason: string[];
  summary: string;
  familyMember: WelfareFamilyMember[];
  isFavorited?: boolean;
}

export interface WelfareFamilyMember {
  name: string;
  avatarUrl: string;
  lightStatus: number;
  lightReason: string[];
}

export interface WelfareApiParams {
  locations: string[];
  categories: string[];
  identities: string[];
  familyID?: string;
  userID?: string;
  searchQuery: string;
  page: number;
  pageSize: number;
  age?: string | null;
  gender?: string | null;
  income?: string[];
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPage: number;
}

export interface WelfarePaginatedResp {
  message: string;
  data: {
    data: Welfare[];
    pagination: Pagination;
  };
}

export interface WelfareResp {
  message: string;
  data: Welfare;
}

export interface ComparisonColumn {
  key: string;
  location: string;
  title: string;
  isSource: boolean;
}

export interface ComparisonRow {
  dimension: string;
  values: Record<string, string>;
}

export interface ComparisonResponse {
  columns: ComparisonColumn[];
  rows: ComparisonRow[];
}
