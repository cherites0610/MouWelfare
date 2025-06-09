// src/types/user.ts
export interface User {
    id: string;
    name: string;
    account: string;
    password?: string;
    gender?: string;
    identities?: { name: string, id: string }[];
    birthday?: string;
    location?: { name: string, id: string };
    subscribe: boolean;
    email: string;
    line_id?: string;
    avatarUrl?: string; // 可選字段
}

export interface UserState {
    user: User | null;
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    error: string | null;
}
