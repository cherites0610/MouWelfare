export interface Filiter {
    locations: string[];
    categories: string[];
    family: string;
    identities: string[];
    searchQuery: string;
    age: string | null;      // 新增
   gender: string | null;   // 新增
   income: string[];        // 新增
}