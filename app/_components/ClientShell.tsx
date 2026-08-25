'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'
import { getUserInfo } from '@/app/lib/auth'
import type { CurrentUser } from '@/app/lib/auth'
import { useLang } from './LangProvider'
import type { TranslationKey } from '@/app/lib/i18n'

const breadcrumbKeys: Record<string, TranslationKey> = {
  '/dashboard': 'nav_dashboard',
  '/orders':    'nav_orders',
  '/products':  'nav_products',
  '/customers': 'nav_customers',
  '/credits':   'nav_credits',
  '/users':     'nav_users',
  '/settings':  'nav_settings',
}

export default function ClientShell({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null | undefined>(undefined)
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()
  const { t } = useLang()
  const crumbEntry = Object.entries(breadcrumbKeys).find(([href]) => pathname.startsWith(href))
  const crumbLabel = crumbEntry ? t(crumbEntry[1]) : ''

  useEffect(() => {
    setUser(getUserInfo())
  }, [])

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  if (user === undefined) return <>{children}</>

  if (!user) return <>{children}</>

  return (
    <div className="flex min-h-dvh">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex">
        <Sidebar user={user} />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar drawer */}
      <div className={`fixed inset-y-0 left-0 z-50 w-60 transform transition-transform duration-200 lg:hidden ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <Sidebar user={user} />
      </div>

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Topbar */}
        <div className="sticky top-0 z-20 flex items-center justify-between h-14 px-4 sm:px-8 border-b border-[var(--ec-border)] bg-[#f9efe8]/92 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-[12.5px] text-[var(--ec-muted)] min-w-0">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden mr-1 flex items-center justify-center rounded border border-[var(--ec-border-strong)] bg-white h-8 w-8 text-[var(--ec-ink)] shrink-0"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
            <span className="font-semibold truncate">Excellentia Foods</span>
            {crumbLabel && (
              <>
                <span className="text-[var(--ec-faint)]">/</span>
                <span className="font-bold text-[var(--ec-ink)] truncate">{crumbLabel}</span>
              </>
            )}
          </div>
        </div>

        <main className="flex-1 overflow-auto p-4 sm:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
