'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { CurrentUser } from '../layout'
import { useLang } from './LangProvider'
import { logout } from '@/app/lib/auth'


const navItems = {
  dashboard: { href: '/dashboard', adminOnly: true, icon: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></> },
  orders:    { href: '/orders',    adminOnly: false, icon: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></> },
  products:  { href: '/products',  adminOnly: false, icon: <><path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></> },
  customers: { href: '/customers', adminOnly: true,  icon: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></> },
  credits:   { href: '/credits',   adminOnly: true,  icon: <><circle cx="12" cy="12" r="10"/><path d="M12 6v2M12 16v2M9.5 15.5a2.5 2.5 0 0 0 2.5 1.5c1.5 0 2.5-.8 2.5-2s-1-1.7-2.5-2-2.5-.8-2.5-2 1-2 2.5-2a2.5 2.5 0 0 1 2.5 1.5"/></> },
  users:     { href: '/users',     adminOnly: true,  icon: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></> },
  settings:  { href: '/settings',  adminOnly: true,  icon: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></> },
} as const

function NavIcon({ children }: { children: React.ReactNode }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      {children}
    </svg>
  )
}

export default function Sidebar({ user }: { user: CurrentUser }) {
  const pathname = usePathname()
  const { t } = useLang()
  const isAdmin = user.role === 'admin'
  const displayName = user.name ?? user.email
  const initials = displayName.slice(0, 2).toUpperCase()


  const groups = [
    { labelKey: 'nav_general' as const, keys: ['dashboard', 'orders', 'products'] as const },
    { labelKey: 'nav_admin' as const,   keys: ['customers', 'credits', 'users', 'settings'] as const },
  ]

  const navLabels: Record<keyof typeof navItems, string> = {
    dashboard: t('nav_dashboard'),
    orders:    t('nav_orders'),
    products:  t('nav_products'),
    customers: t('nav_customers'),
    credits:   t('nav_credits'),
    users:     t('nav_users'),
    settings:  t('nav_settings'),
  }

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col bg-zinc-950 sticky top-0 overflow-hidden">

      {/* Brand */}
      <div className="flex items-center gap-3 px-5 pt-6 pb-5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 shadow-lg shadow-blue-900/40">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2"/>
            <path d="M8 21h8M12 17v4"/>
          </svg>
        </div>
        <div>
          <p className="text-sm font-bold text-white leading-tight tracking-tight">Excellentia</p>
          <p className="text-[10px] text-zinc-500 leading-tight">OMS Platform</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 pb-3 space-y-5">
        {groups.map(group => {
          const visible = group.keys.filter(k => !navItems[k].adminOnly || isAdmin)
          if (visible.length === 0) return null
          return (
            <div key={group.labelKey}>
              <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
                {t(group.labelKey)}
              </p>
              <div className="space-y-0.5">
                {visible.map(key => {
                  const item = navItems[key]
                  const active = pathname.startsWith(item.href)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                        active
                          ? 'bg-blue-600 text-white shadow-sm shadow-blue-900/30'
                          : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-100'
                      }`}
                    >
                      <span className={`transition-colors ${active ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'}`}>
                        <NavIcon>{item.icon}</NavIcon>
                      </span>
                      {navLabels[key]}
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>

      {/* User footer */}
      <div className="border-t border-white/5 p-3 space-y-1">
        {/* User card */}
        <div className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 bg-white/5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white uppercase shadow">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-zinc-100 leading-tight">
              {user.name ?? user.email}
            </p>
            {user.name && (
              <p className="truncate text-[10px] text-zinc-500 leading-tight">{user.email}</p>
            )}
            <span className={`inline-block mt-0.5 rounded-full px-1.5 py-px text-[9px] font-bold uppercase leading-tight tracking-wide ${
              isAdmin ? 'bg-blue-900 text-blue-300' : 'bg-zinc-800 text-zinc-400'
            }`}>
              {isAdmin ? t('role_admin') : t('role_operator')}
            </span>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-zinc-500 hover:bg-red-950 hover:text-red-400 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          {t('nav_logout')}
        </button>
      </div>
    </aside>
  )
}
