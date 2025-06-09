import { fqa } from "../type/fqaType";
import { apiFetch } from "./api";

export const fetchFqaApi = async (): Promise<fqa[]> => {
    const result = await apiFetch<fqa[]>(`/fqa`, {
        method: 'GET',
    })
    return result
}