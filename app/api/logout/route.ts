import { type NextRequest, NextResponse } from 'next/server'

export function GET(request: NextRequest) {
  const url = new URL('/login', request.url)
  const res = NextResponse.redirect(url)
  res.cookies.set('jwt', '', { maxAge: 0, path: '/' })
  return res
}
