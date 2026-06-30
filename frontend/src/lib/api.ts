const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

function getToken(): string | null {
  return localStorage.getItem('access_token')
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken()
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
    ...options,
  })

  if (!response.ok) {
    if (response.status === 401 && token) {
      localStorage.removeItem('access_token')
      window.dispatchEvent(new Event('auth-expired'))
    }
    const body = await response.json().catch(() => ({}))
    throw new Error(body?.detail ?? `API error ${response.status}: ${response.statusText}`)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

export const api = {
  get: <T>(path: string, extraHeaders?: Record<string, string>) =>
    request<T>(path, { headers: extraHeaders }),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}
