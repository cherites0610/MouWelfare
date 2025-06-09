import { User } from "../type/user";
import { apiFetch, ResponseType } from "./api";

export interface LoginRequest {
    email: string;
    password: string;
}

export interface LoginResponse {
    message: string,
    data: { accessToken: string }
}

export interface GetProfileRespones {
    message: string,
    data: User
}

export interface RegisterRequest {
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
    return apiFetch<ResponseType>(`/auth/signup`, {
        method: 'POST',
        body: JSON.stringify(userData),
    });
}

export async function fetchApi(token: string): Promise<GetProfileRespones> {
    return apiFetch<GetProfileRespones>(`/user`, {
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

export async function verifyCodeApi(email: string, code: string, action: "changePassword" | "verifyAccount"): Promise<ResponseType> {
    return apiFetch<ResponseType>("/auth/verify-code", {
        method: "POST",
        body: JSON.stringify({
            email: email,
            code: code,
            action: action
        })
    })
}

export async function sendVerifyCodeApi(email: string, action: "changePassword" | "verifyAccount") {
    return apiFetch<ResponseType>(`/auth/send-verification-code/`, {
        method: "POST",
        body: JSON.stringify({
            email: email,
            action: action
        })
    })
}

export async function performAction(token: string, action: "changePassword" | "verifyAccount", newPassword?: string) {
    return apiFetch<ResponseType>(`/auth/perform-action/`, {
        method: "POST",
        body: JSON.stringify({
            token: token,
            action: action,
            newPassword: newPassword
        })
    })
}

export async function updateAvatarApi(token: string, data: FormData) {
    return apiFetch<ResponseType>("/user/avatar", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`,
        },
        body: data

    })
}

export async function getAvatarApi(userID: string) {
    return apiFetch<ResponseType>("/api/get")
}

export async function updatePasswordAPI(email: string, password: string) {
    return apiFetch<ResponseType>("/auth/password", {
        method: "PUT",
        body: JSON.stringify({
            email: email,
            password: password
        })

    })
}

export async function updateProfileAPI(token: string, profile: Partial<User>) {
    return apiFetch<ResponseType>("/user", {
        method: "PATCH",
        headers: {
            "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
            ...profile,
            birthday: profile.birthday ? new Date(profile.birthday).toISOString() : undefined,
            name: profile.name,
            location: profile.location?.name,
            identities: profile.identities?.map((item) => item.name),
            gender: profile.gender ?? ""
        })
    })
}