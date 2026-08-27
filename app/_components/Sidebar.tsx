'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { CurrentUser } from '../layout'
import { useLang } from './LangProvider'
import { logout } from '@/app/lib/auth'


type Role = 'admin' | 'operator' | 'almacenista'

const navItems = {
  dashboard: { href: '/dashboard', roles: ['admin'] as Role[], icon: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></> },
  orders:    { href: '/orders',    roles: ['admin', 'operator', 'almacenista'] as Role[], icon: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></> },
  warehouse: { href: '/warehouse', roles: ['admin', 'almacenista'] as Role[], icon: <><path d="M3 9l9-6 9 6v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></> },
  products:  { href: '/products',  roles: ['admin', 'operator'] as Role[], icon: <><path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></> },
  customers: { href: '/customers', roles: ['admin'] as Role[], icon: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></> },
  credits:   { href: '/credits',   roles: ['admin'] as Role[], icon: <><circle cx="12" cy="12" r="10"/><path d="M12 6v2M12 16v2M9.5 15.5a2.5 2.5 0 0 0 2.5 1.5c1.5 0 2.5-.8 2.5-2s-1-1.7-2.5-2-2.5-.8-2.5-2 1-2 2.5-2a2.5 2.5 0 0 1 2.5 1.5"/></> },
  users:     { href: '/users',     roles: ['admin'] as Role[], icon: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></> },
  settings:  { href: '/settings',  roles: ['admin'] as Role[], icon: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></> },
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
  const roleLabel = user.role === 'admin' ? t('role_admin') : user.role === 'almacenista' ? t('role_almacenista') : t('role_operator')


  const groups = [
    { labelKey: 'nav_general' as const, keys: ['dashboard', 'orders', 'warehouse', 'products'] as const },
    { labelKey: 'nav_admin' as const,   keys: ['customers', 'credits', 'users', 'settings'] as const },
  ]

  const navLabels: Record<keyof typeof navItems, string> = {
    dashboard: t('nav_dashboard'),
    orders:    t('nav_orders'),
    warehouse: t('nav_warehouse'),
    products:  t('nav_products'),
    customers: t('nav_customers'),
    credits:   t('nav_credits'),
    users:     t('nav_users'),
    settings:  t('nav_settings'),
  }

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col bg-primary sticky top-0 overflow-hidden">

      {/* Brand */}
      <div className="flex items-center gap-3 px-5 pt-6 pb-5 border-b border-white/10">
        <img src="/brand/excellentia-mark.png" alt="" className="w-[30px] h-[30px] shrink-0" />
        <div>
          <p className="text-[14.5px] font-extrabold text-[#f9efe8] leading-tight tracking-wide uppercase">Excellentia</p>
          <p className="text-[10px] text-[#f9efe8]/45 leading-tight tracking-[.14em] font-semibold mt-0.5">OMS PLATFORM</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 pt-4 pb-3 space-y-5">
        {groups.map(group => {
          const visible = group.keys.filter(k => (navItems[k].roles as readonly Role[]).includes(user.role))
          if (visible.length === 0) return null
          return (
            <div key={group.labelKey}>
              <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[.18em] text-[#f9efe8]/35">
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
                      className={`group flex items-center gap-3 rounded px-3 py-2.5 text-[13.5px] font-semibold transition-colors border-l-[3px] ${
                        active
                          ? 'border-l-[var(--ec-gold)] bg-white/[.06] text-[#f9efe8]'
                          : 'border-l-transparent text-[#f9efe8]/55 hover:bg-white/[.04] hover:text-[#f9efe8]/85'
                      }`}
                    >
                      <span className="opacity-85">
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
      <div className="border-t border-white/10 p-3 space-y-1">
        {/* User card */}
        <div className="flex items-center gap-2.5 rounded px-3 py-2.5 border border-white/10">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-[var(--ec-gold)] text-xs font-extrabold text-primary uppercase">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-[#f9efe8] leading-tight">
              {user.name ?? user.email}
            </p>
            {user.name && (
              <p className="truncate text-[10px] text-[#f9efe8]/42 leading-tight">{user.email}</p>
            )}
            <span className={`inline-block mt-1 rounded px-1.5 py-px text-[9px] font-extrabold uppercase leading-tight tracking-wide ${
              isAdmin ? 'bg-[var(--ec-gold)]/[.16] text-[var(--ec-gold)]' : 'bg-white/10 text-[#f9efe8]/60'
            }`}>
              {roleLabel}
            </span>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          className="flex w-full items-center gap-2.5 rounded px-3 py-2 text-xs font-semibold text-[#f9efe8]/50 hover:bg-red-950 hover:text-red-400 transition-colors"
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
