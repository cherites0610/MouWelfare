// src/types/user.ts
export interface User {
    id: string;
    name: string;
    account: string;
    password?: string;
    gender?: string;
    identities?: string[];
    birthday?: string;
    location?: string;
    subscribe: boolean;
    email: string;
    line_id?: string;
    avatar_url?: string; // 可選字段
}

export interface UserState {
    user: User | null;
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    error: string | null;
}
