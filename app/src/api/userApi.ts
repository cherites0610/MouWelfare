import { User } from "../type/user";
import { apiFetch,ResponseType } from "./api";

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
export async function loginApi(credentials: LoginRequest): Promise<ResponseType> {
    return apiFetch<ResponseType>(`/auth/login`, {
        method: 'POST',
        body: JSON.stringify(credentials),
    });
}

export async function registerApi(userData: RegisterRequest): Promise<ResponseType> {
    return apiFetch<ResponseType>(`/auth/register`, {
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

export async function verifyCodeApi(email: string, code: string): Promise<ResponseType> {
    return apiFetch<ResponseType>("/auth/verify", {
        method: "POST",
        body: JSON.stringify({
            email: email,
            code: code
        })
    })
}

export async function sendVerifyCodeApi(email:string) {
    return apiFetch<ResponseType>(`/auth/send-verify/${email}`, {
        method: "POST",
    })
}

export async function updateAvatarApi(token:string,data:FormData) {
    return apiFetch<ResponseType>("/api/avatar-upload", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`,
        },
        body:data
        
    })
}

export async function getAvatarApi(userID:string) {
    return apiFetch<ResponseType>("/api/get")
}