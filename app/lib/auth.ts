export function getToken(): string {
  if (typeof document === 'undefined') return ''
  const match = document.cookie.match(/(?:^|; )jwt=([^;]*)/)
  return match ? decodeURIComponent(match[1]) : ''
}

export function logout(): void {
  document.cookie = 'jwt=; path=/; max-age=0'
  window.location.href = '/login'
}

export interface CurrentUser {
  id: number
  email: string
  name?: string | null
  role: 'admin' | 'operator'
}

export function decodeJwt(token: string): CurrentUser | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return { id: payload.id, email: payload.email, name: payload.name ?? null, role: payload.role }
  } catch { return null }
}
