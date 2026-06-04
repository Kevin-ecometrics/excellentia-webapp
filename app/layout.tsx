import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { Suspense } from 'react'
import NavigationProgress from './_components/NavigationProgress'
import { LangProvider } from './_components/LangProvider'
import ClientShell from './_components/ClientShell'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Excellentia — Dashboard',
  description: 'Product and order management',
}

// Re-export so pages that import from layout still compile
export type { CurrentUser } from './lib/auth'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-dvh bg-slate-50 antialiased">
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        <LangProvider>
          <ClientShell>
            {children}
          </ClientShell>
        </LangProvider>
      </body>
    </html>
  )
}
