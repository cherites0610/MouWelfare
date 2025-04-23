import { Welfare } from "../type/welfareType";
import { apiFetch } from "./api";

export async function fetchWelfareApi(): Promise<Welfare[]> {
    return apiFetch<Welfare[]>(`/api/welfare`, {
        method: 'GET'
    });
}

export async function fetchWelfareByIDAPI(id: number): Promise<Welfare> {
    return apiFetch<Welfare>(`/api/welfare/${id}`, {
        method: 'GET'
    });
}

