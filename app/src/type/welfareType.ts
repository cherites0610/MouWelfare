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
    summary: string;
    familyMember: WelfareFamilyMember[]
}

export interface WelfareFamilyMember {
    name: string,
    avatarUrl: string,
    lightStatus: number
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
}

export interface Pagination {
    page: number;
    pageSize: number;
    total: number;
    totalPage: number;
}

export interface WelfarePaginatedResp {
    message: string,
    data: {
        data: Welfare[],
        pagination: Pagination,
    }
}

export interface WelfareResp {
    message: string,
    data: Welfare
}
