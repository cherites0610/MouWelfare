import { User } from "./user";

export interface FamilysResponse {
    data: Family[],
    message:string,
}

export interface Family {
    id: string,
    name: string,
    userFamilies: FamilyMember[]
}

export interface FamilyMember {
    id: string
    role: number,
    user: User
}

export interface FamilyState {
    familys: Family[];
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    error: string | null;
}

