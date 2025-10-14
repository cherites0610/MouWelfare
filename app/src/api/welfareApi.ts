import { Welfare, WelfareApiParams, WelfarePaginatedResp, WelfareResp } from "../type/welfareType";
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
    if (params.familyID) {
        query.append('families', params.familyID);
    }
    if (params.searchQuery) {
        query.append('search', params.searchQuery);
    }
    if (params.page) {
        query.append('page', params.page.toString());
    }
    if (params.userID) {
        query.append('userID', params.userID);
    }
    if (params.pageSize) {
        query.append('pageSize', params.pageSize.toString());
    }
    if (params.age) {
        query.append('age', params.age);
    }
    if (params.gender) {
        query.append('gender', params.gender);
    }
    if (params.income && params.income.length > 0) {
        query.append('income', params.income.join(','));
    }

    const url = `/welfare${query.toString() ? `?${query.toString()}` : ''}`;

    // Using fetch API (you can replace with axios if preferred)
    const response = await apiFetch<WelfarePaginatedResp>(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });


    return response;
}

export async function fetchWelfareByIDAPI(
    id: string,
    userID?: string,
    familyID?: string
): Promise<WelfareResp> {
    let url = `/welfare/${id}`;

    if (userID && familyID) {
        url += `?userID=${encodeURIComponent(userID)}&familyID=${encodeURIComponent(familyID)}`;
    }

    return apiFetch<WelfareResp>(url, {
        method: 'GET',
    });
}

export async function addFavoriteAPI(token: string, id: number): Promise<ResponseType> {
    return apiFetch<ResponseType>(`/user/welfare/${id}`, {
        method: 'POST',
        headers: {
            "Authorization": `Bearer ${token}`
        }
    })
}

export async function deleteFavoriteAPI(token: string, id: number): Promise<ResponseType> {
    return apiFetch<ResponseType>(`/user/welfare/${id}`, {
        method: 'DELETE',
        headers: {
            "Authorization": `Bearer ${token}`
        }
    })
}

export async function fetchFavoriteAPI(token: string): Promise<ResponseType> {
    return apiFetch<ResponseType>(`/user/welfare`, {
        method: 'GET',
        headers: {
            "Authorization": `Bearer ${token}`
        }
    })
}
