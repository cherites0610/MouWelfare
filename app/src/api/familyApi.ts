import AsyncStorage from "@react-native-async-storage/async-storage"
import { apiFetch } from "./api"

export interface FamilysResponse {
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

export const fetchUserFamilyApi = async (token: string): Promise<FamilysResponse[]> => {
    const result = await apiFetch<FamilysResponse[]>(`/api/user/family`, {
        method: 'GET',
        headers: {
            "Authorization": `Bearer ${token}`
        }
    })

    return result
}

export const fetchFmailyApi = async (token: string, familyID: number): Promise<FamilysResponse> => {
    const result = await apiFetch<FamilysResponse>(`/api/family/${familyID}`, {
        method: 'GET',
        headers: {
            "Authorization": `Bearer ${token}`
        }
    })

    return result
}

export const createFamilyApi = async (token: string, familyName: string): Promise<FamilysResponse> => {
    const result = await apiFetch<FamilysResponse>(`/api/family`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ name: familyName })
    })
    return result
}

export const JoinFamilyApi = async (token:string,code: string): Promise<void> => {
    const result = await apiFetch<void>(`/api/family/${code}`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`
        },
    })

    return result
}

export const getFmailyCodeApi = async (token: string,familyID: string): Promise<string> => {
    const result = await apiFetch<string>(`/api/family/${familyID}/code`, {
        method: "GET",
        headers: {
            "Authorization": `Bearer ${token}`
        },
    })

    return result
}