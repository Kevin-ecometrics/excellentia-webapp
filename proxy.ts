import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const protectedRoutes = ['/dashboard', '/products', '/warehouse']
const publicRoutes = ['/login']

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname
  const token = request.cookies.get('jwt')?.value

  const isProtected = protectedRoutes.some(route => path.startsWith(route))
  const isPublic = publicRoutes.some(route => path.startsWith(route))

  if (isProtected && !token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (isPublic && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
}
