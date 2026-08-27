const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

export interface CurrentUser {
  id: number
  email: string
  name?: string | null
  role: 'admin' | 'operator' | 'almacenista'
}

export function getUserInfo(): CurrentUser | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(/(?:^|; )jwt_user=([^;]*)/)
  if (!match) return null
  try {
    return JSON.parse(decodeURIComponent(match[1]))
  } catch { return null }
}

export function clearSession(): void {
  document.cookie = 'jwt_user=; path=/; max-age=0'
  window.location.href = '/login'
}

export async function logout(): Promise<void> {
  try {
    await fetch(`${API}/api/auth/logout`, { method: 'POST', credentials: 'include' })
  } catch {}
  clearSession()
}

export async function apiFetch(url: string, init?: RequestInit): Promise<Response> {
  return fetch(url, { ...init, credentials: 'include' })
}
