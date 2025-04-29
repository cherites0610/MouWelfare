import { Welfare, WelfareApiParams, WelfarePaginatedResp } from "../type/welfareType";
import { apiFetch, ResponseType } from "./api";

export async function fetchWelfareApi(params: WelfareApiParams): Promise<WelfarePaginatedResp> {
    // Build query parameters
    const query = new URLSearchParams();

    if (params.locations && params.locations.length > 0) {
        query.append('locations', params.locations.join(','));
    }
    if (params.categories && params.categories.length > 0) {
        query.append('categories', params.categories.join(','));
    }
    if (params.identities && params.identities.length > 0) {
        query.append('identities', params.identities.join(','));
    }
    if (params.families) {
        query.append('families', params.families);
    }
    if (params.searchQuery) {
        query.append('search', params.searchQuery);
    }
    if (params.page) {
        query.append('page', params.page.toString());
    }
    if (params.pageSize) {
        query.append('pageSize', params.pageSize.toString());
    }

    const url = `/api/welfare${query.toString() ? `?${query.toString()}` : ''}`;

    // Using fetch API (you can replace with axios if preferred)
    const response = await apiFetch<WelfarePaginatedResp>(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });


    return response;
}

export async function fetchWelfareByIDAPI(id: number): Promise<Welfare> {
    return apiFetch<Welfare>(`/api/welfare/${id}`, {
        method: 'GET'
    });
}

export async function addFavoriteAPI(token: string, id: number): Promise<ResponseType> {
    return apiFetch<ResponseType>(`/api/favorite/${id}`, {
        method: 'POST',
        headers: {
            "Authorization": `Bearer ${token}`
        }
    })
}

export async function deleteFavoriteAPI(token: string, id: number): Promise<ResponseType> {
    return apiFetch<ResponseType>(`/api/favorite/${id}`, {
        method: 'DELETE',
        headers: {
            "Authorization": `Bearer ${token}`
        }
    })
}

export async function fetchFavoriteAPI(token: string): Promise<ResponseType> {
    return apiFetch<ResponseType>(`/api/favorite`, {
        method: 'GET',
        headers: {
            "Authorization": `Bearer ${token}`
        }
    })
}
