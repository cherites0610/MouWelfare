import { User } from "../type/user";
import { apiFetch } from "./api";

export interface LoginRequest {
    account: string;
    password: string;
}

export interface LoginResponse {
    token: string;
    user: User;
}

export interface RegisterRequest {
    account: string;
    email: string;
    password: string;
}

// 保留 login 和 register
export async function loginApi(credentials: LoginRequest): Promise<LoginResponse> {
    return apiFetch<LoginResponse>(`/auth/login`, {
        method: 'POST',
        body: JSON.stringify(credentials),
    });
}

export async function registerApi(userData: RegisterRequest): Promise<User> {
    return apiFetch<User>(`/auth/register`, {
        method: 'POST',
        body: JSON.stringify(userData),
    });
}

export async function fetchApi(token: string): Promise<LoginResponse> {
    return apiFetch<LoginResponse>(`/api/profile`, {
        method: 'GET',
        headers: {
            "Authorization": `Bearer ${token}`
        }
    });
}

export async function getLineLoginUrl(token: string): Promise<string> {
    return apiFetch<string>(`/api/lineLoginUrl`, {
        method: 'GET',
        headers: {
            "Authorization": `Bearer ${token}`
        }
    });
}
