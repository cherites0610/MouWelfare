// const BASE_URL = "https://mou-api.cherites.org";
const BASE_URL = "https://6ecf601474d1.ngrok-free.app";

export interface ApiError {
  message: string;
}

export interface ResponseType {
  message: string;
  data: any;
}

export async function apiFetch<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    const headers: Record<string, string> = {};
    if (options.headers) {
      if (options.headers instanceof Headers) {
        options.headers.forEach((value, key) => {
          headers[key] = value;
        });
      } else if (Array.isArray(options.headers)) {
        options.headers.forEach(([key, value]) => {
          headers[key] = value;
        });
      } else {
        Object.assign(headers, options.headers);
      }
    }

    let body = options.body;

    if (body instanceof FormData) {
      delete headers["Content-Type"];
    } else if (typeof body === "string") {
      headers["Content-Type"] = "application/json";
    } else if (body) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(body);
    } else {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(`${BASE_URL}${url}`, {
      ...options,
      headers,
      body,
    });

    const responseText = await response.text();

    if (!response.ok) {
      let errorMessage = `Request failed with status ${response.status}`;

      if (responseText) {
        try {
          const error: ApiError = JSON.parse(responseText);
          errorMessage = error.message || errorMessage;
        } catch (jsonError) {
          errorMessage = responseText;
        }
      }

      throw new Error(errorMessage);
    }

    return responseText ? (JSON.parse(responseText) as T) : ({} as T);
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Unknown error occurred");
  }
}
