'use client'

import { useEffect, useState } from 'react'
import Sidebar from './Sidebar'
import { getUserInfo } from '@/app/lib/auth'
import type { CurrentUser } from '@/app/lib/auth'

export default function ClientShell({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null | undefined>(undefined)
  const [mobileOpen, setMobileOpen] = useState(false)

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

      <main className="flex-1 overflow-auto p-4 sm:p-8 max-w-[1200px] mx-auto w-full">
        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(true)}
          className="lg:hidden mb-3 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50 transition"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
          Menu
        </button>
        {children}
      </main>
    </div>
  )
}
