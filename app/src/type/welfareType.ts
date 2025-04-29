export interface Welfare {
    id: number;
    title: string;
    detail: string;
    url: string;
    location: string;
    publication_date: string;
    identities: string[];
    categories: string[];
    forward: string[];
    status: boolean;
    light_status: number;
    family_member: welfareFamilyMember[]
}

export interface welfareFamilyMember {
    avatar_url: string,
    light_status: number,
    name: string,
}

export interface WelfareApiParams {
    locations: string[];
    categories: string[];
    identities: string[];
    families: string;
    searchQuery: string;
    page: number;
    pageSize: number;
}
export interface Pagination {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
}

export interface WelfarePaginatedResp {
    data: Welfare[];
    pagination: Pagination;
}
