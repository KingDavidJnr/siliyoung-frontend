const BASE_URL = import.meta.env.VITE_BASE_URL || "https://Siliyoung Enterprise-api.monesize.com/v1";

interface ApiResponse<T = unknown> {
  message: string;
  data: T;
}

export async function apiRequest<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.message || "Something went wrong");
  }

  return json as ApiResponse<T>;
}
