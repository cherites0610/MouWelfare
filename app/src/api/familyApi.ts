import AsyncStorage from "@react-native-async-storage/async-storage"
import { apiFetch, ResponseType } from "./api"
import { User } from "../type/user"
import { Family, FamilysResponse } from "../type/family"

export const fetchUserFamilyApi = async (token: string): Promise<FamilysResponse> => {
    const result = await apiFetch<ResponseType>(`/family`, {
        method: 'GET',
        headers: {
            "Authorization": `Bearer ${token}`
        }
    })
    return result
}

export const fetchFmailyApi = async (token: string, familyID: number): Promise<FamilysResponse> => {
    const result = await apiFetch<FamilysResponse>(`/family/${familyID}`, {
        method: 'GET',
        headers: {
            "Authorization": `Bearer ${token}`
        }
    })

    return result
}

export const createFamilyApi = async (token: string, familyName: string): Promise<ResponseType> => {
    const result = await apiFetch<ResponseType>(`/family`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ name: familyName })
    })
    return result
}

export const JoinFamilyApi = async (token: string, code: string): Promise<void> => {
    const result = await apiFetch<void>(`/family/join/${code}`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`
        },
    })

    return result
}

export const getFmailyCodeApi = async (token: string, familyID: string): Promise<ResponseType> => {
    const result = await apiFetch<ResponseType>(`/family/${familyID}/invite`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`
        },
    })

    return result
}

export const exitFamilyApi = async (token: string, familyID: string): Promise<ResponseType> => {
    const result = await apiFetch<ResponseType>(`/family/${familyID}/leave`, {
        method: "DELETE",
        headers: {
            "Authorization": `Bearer ${token}`
        },
    })

    return result
}

export const deleteFamilyApi = async (token: string, familyID: string): Promise<ResponseType> => {
    const result = await apiFetch<ResponseType>(`/family/${familyID}`, {
        method: "DELETE",
        headers: {
            "Authorization": `Bearer ${token}`
        },
    })

    return result
}

export const EditFamilyInfApi = async (token: string, familyID: string, familyName: string): Promise<FamilysResponse> => {
    const result = await apiFetch<ResponseType>(`/family/${familyID}/name/${familyName}`, {
        method: "PATCH",
        headers: {
            "Authorization": `Bearer ${token}`
        }
    })

    return result
}
