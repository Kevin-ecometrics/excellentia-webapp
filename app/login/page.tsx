'use client'

import { useState } from 'react'
import { useLang } from '@/app/_components/LangProvider'

export default function LoginPage() {
  const { t } = useLang()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Invalid credentials')
        return
      }
      const data = await res.json()
      document.cookie = `jwt=${data.token}; path=/; max-age=${7 * 86400}`
      window.location.href = data.user?.role === 'admin' ? '/dashboard' : '/orders'
    } catch {
      setError('Could not connect to the server')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-dvh">

      {/* ── Panel izquierdo — branding ─────────────────── */}
      <div className="hidden lg:flex lg:w-[52%] flex-col justify-between bg-primary p-12">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2"/>
              <path d="M8 21h8M12 17v4"/>
            </svg>
          </div>
          <span className="text-lg font-bold text-white tracking-tight">Excellentia</span>
        </div>

        {/* Central content */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-300 mb-4">OMS Platform</p>
          <h2 className="text-4xl font-bold text-white leading-tight mb-6">
            Order Management<br/>and Real-Time Sync<br/>with QuickBooks
          </h2>
          <p className="text-blue-200 text-base leading-relaxed max-w-sm">
            Manage products, monitor orders, and keep real-time sync with QuickBooks Online from a single place.
          </p>

          {/* Feature bullets */}
          <ul className="mt-10 space-y-4">
            {[
              'Automatic sync with QuickBooks',
              'Ticket printing via Bluetooth',
              'Product management with barcode and weight',
            ].map(f => (
              <li key={f} className="flex items-center gap-3 text-sm text-blue-100">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/15">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </span>
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <p className="text-xs text-blue-400">© 2026 Excellentia · OMS Platform</p>
      </div>

      {/* ── Panel derecho — formulario ────────────────── */}
      <div className="flex flex-1 flex-col items-center justify-center bg-slate-50 px-6 py-12">

        {/* Mobile logo (solo en móvil) */}
        <div className="mb-8 text-center lg:hidden">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2"/>
              <path d="M8 21h8M12 17v4"/>
            </svg>
          </div>
          <h1 className="text-xl font-bold text-zinc-900">Excellentia</h1>
        </div>

        <div className="w-full max-w-[360px]">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-zinc-900">{t('login_title')}</h2>
            <p className="mt-1 text-sm text-slate-500">{t('login_subtitle')}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700">
                {t('login_email')}
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@email.com"
                className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 placeholder-slate-400 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-blue-100"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700">
                {t('login_password')}
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 pr-11 text-sm text-zinc-900 placeholder-slate-400 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-blue-100"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-zinc-600 transition"
                  tabIndex={-1}
                >
                  {showPw ? (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="relative w-full overflow-hidden rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark active:scale-[0.99] disabled:opacity-60"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  {t('login_loading')}
                </span>
              ) : t('login_submit')}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-slate-400">
            Excellentia OMS · {t('login_footer')}
          </p>
        </div>
      </div>

    </div>
  )
}
