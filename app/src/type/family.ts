export interface Family {
    id: string,
    name: string,
    members: FamilyMember[]
}

export interface FamilyMember {
    userId: string,
    name: string,
    role: number
    avatar_url?: string;
}

export interface FamilyState {
    familys: Family[];
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    error: string | null;
}

