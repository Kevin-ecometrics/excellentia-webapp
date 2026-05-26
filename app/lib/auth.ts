export function getToken(): string {
  if (typeof document === 'undefined') return ''
  const match = document.cookie.match(/(?:^|; )jwt=([^;]*)/)
  return match ? decodeURIComponent(match[1]) : ''
}
