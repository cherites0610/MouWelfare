import { fqa } from "../type/fqaType";
import { apiFetch } from "./api";

export const fetchFqaApi = async (): Promise<fqa[]> => {
    const result = await apiFetch<fqa[]>(`/api/fqa`, {
        method: 'GET',
    })
    return result
}