const BASE_URL = "http://172.20.10.6:3000";

export interface ApiError {
    message: string;
}

export interface ResponseType {
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