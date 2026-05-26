import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { cookies } from 'next/headers'
import { Suspense } from 'react'
import Sidebar from './_components/Sidebar'
import NavigationProgress from './_components/NavigationProgress'
import { LangProvider } from './_components/LangProvider'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Excellentia — Dashboard',
  description: 'Gestión de productos y pedidos',
}

export type CurrentUser = { id: number; email: string; name?: string | null; role: 'admin' | 'operator' }

function decodeJwt(token: string): CurrentUser | null {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString())
    return { id: payload.id, email: payload.email, name: payload.name ?? null, role: payload.role }
  } catch { return null }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const token = cookieStore.get('jwt')?.value ?? ''
  const currentUser = token ? decodeJwt(token) : null

  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-dvh bg-slate-50 antialiased">
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        <LangProvider>
          {currentUser ? (
            <div className="flex min-h-dvh">
              <Sidebar user={currentUser} />
              <main className="flex-1 overflow-auto p-8 max-w-[1200px] mx-auto w-full">
                {children}
              </main>
            </div>
          ) : (
            children
          )}
        </LangProvider>
      </body>
    </html>
  )
}
