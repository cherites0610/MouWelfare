const BASE_URL = "https://mou-welfare.com";

export interface ApiError {
    message: string;
}

export interface ResponseType {
    status_code: number
    message: string
    data: any
}


export async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
    try {
        const response = await fetch(`${BASE_URL}${url}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
        });

        if (!response.ok) {
            const error: ApiError = await response.json();
            throw new Error(error.message || 'API request failed');
        }

        return response.json() as Promise<T>;
    } catch (error) {
        throw error instanceof Error ? error : new Error('Unknown error occurred');
    }
}