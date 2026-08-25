import type { Metadata } from 'next'
import { Archivo, IBM_Plex_Mono } from 'next/font/google'
import './globals.css'
import { Suspense } from 'react'
import NavigationProgress from './_components/NavigationProgress'
import { LangProvider } from './_components/LangProvider'
import ClientShell from './_components/ClientShell'

const archivo = Archivo({ variable: '--font-archivo', subsets: ['latin'], weight: ['400', '500', '600', '700', '800', '900'] })
const plexMono = IBM_Plex_Mono({ variable: '--font-plex-mono', subsets: ['latin'], weight: ['400', '500', '600'] })

export const metadata: Metadata = {
  title: 'Excellentia — Dashboard',
  description: 'Product and order management',
}

// Re-export so pages that import from layout still compile
export type { CurrentUser } from './lib/auth'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${archivo.variable} ${plexMono.variable}`}>
      <body className="min-h-dvh antialiased">
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
