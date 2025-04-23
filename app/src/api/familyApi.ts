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
}

export const fetchUserFamilyApi = async (token: string):Promise<FamilysResponse[]> => {
    const result = await apiFetch<FamilysResponse[]>(`/api/user/family`, {
        method: 'GET',
        headers: {
            "Authorization": `Bearer ${token}`
        }
    })

    return result
}

export const fetchFmailyApi = async (token: string,familyID: number): Promise<FamilysResponse> => {
    const result = await apiFetch<FamilysResponse>(`/api/family/${familyID}`, {
        method: 'GET',
        headers: {
            "Authorization": `Bearer ${token}`
        }
    })

    return result
}