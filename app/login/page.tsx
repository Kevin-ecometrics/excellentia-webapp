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
        credentials: 'include',
        body: JSON.stringify({ email: email.trim(), password }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Invalid credentials')
        return
      }
      const data = await res.json()
      // Store only public user info (non-HttpOnly) for UI display
      const userInfo = { id: data.user.id, email: data.user.email, name: data.user.name ?? null, role: data.user.role }
      document.cookie = `jwt_user=${encodeURIComponent(JSON.stringify(userInfo))}; path=/; max-age=${7 * 86400}`
      window.location.href = data.user?.role === 'admin' ? '/dashboard' : '/orders'
    } catch {
      setError('Could not connect to the server')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-dvh bg-[#f9efe8]">

      {/* ── Panel izquierdo — branding ─────────────────── */}
      <div className="hidden lg:flex lg:w-[52%] flex-col justify-between bg-primary p-14 relative overflow-hidden">
        <img src="/brand/excellentia-mark.png" alt="" className="pointer-events-none select-none absolute -right-36 -bottom-28 w-[620px] opacity-[.07]" />

        {/* Logo */}
        <img src="/brand/excellentia-lockup.png" alt="Excellentia Foods" className="w-[210px] relative" />

        {/* Central content */}
        <div className="relative max-w-[460px]">
          <p className="text-[11px] font-bold uppercase tracking-[.24em] text-[var(--ec-gold)]">OMS Platform · V2.0</p>
          <h2 className="mt-4 text-[38px] font-extrabold leading-[1.1] tracking-[-.025em] text-[#f9efe8]">
            One catalog. One ledger.<br/>Two systems in step.
          </h2>
          <p className="mt-4 text-[14.5px] leading-[1.7] text-[#f9efe8]/60">
            Every order placed on the Android app lands in QuickBooks Online.
            This dashboard is where you watch it happen and fix it when it doesn&apos;t.
          </p>

          <ul className="mt-9 space-y-3.5">
            {[
              'Automatic sync with QuickBooks',
              'Ticket printing via Bluetooth',
              'Product management with barcode and weight',
            ].map(f => (
              <li key={f} className="flex items-center gap-3 text-[13.5px] text-[#f9efe8]/85">
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
        <p className="relative font-mono text-[11.5px] text-[#f9efe8]/40 tracking-[.04em]">https://app.excellentiafoods.com/</p>
      </div>

      {/* ── Panel derecho — formulario ────────────────── */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">

        {/* Mobile logo (mobile only) */}
        <div className="mb-8 text-center lg:hidden">
          <img src="/brand/excellentia-mark.png" alt="Excellentia Foods" className="mx-auto mb-3 h-12 w-12" />
          <h1 className="text-xl font-extrabold text-[var(--ec-ink)]">Excellentia</h1>
        </div>

        <div className="w-full max-w-[360px]">
          <div className="mb-8">
            <p className="text-[11px] font-bold uppercase tracking-[.2em] text-[var(--ec-faint)]">Sign in</p>
            <h2 className="mt-2 text-[29px] font-extrabold tracking-[-.02em] text-[var(--ec-ink)]">{t('login_title')}</h2>
            <p className="mt-2 text-[13.5px] text-[var(--ec-muted)]">{t('login_subtitle')}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2.5 rounded border border-[var(--ec-danger)]/30 bg-[var(--ec-danger-bg)] px-4 py-3 text-sm text-[var(--ec-danger)]">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-[11.5px] font-bold tracking-[.1em] text-[#5A5049]">
                {t('login_email').toUpperCase()}
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@email.com"
                className="w-full rounded border border-[var(--ec-border-strong)] bg-white px-3.5 py-3 text-sm text-[var(--ec-ink)] placeholder-[var(--ec-faint)] transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-50"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11.5px] font-bold tracking-[.1em] text-[#5A5049]">
                {t('login_password').toUpperCase()}
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded border border-[var(--ec-border-strong)] bg-white px-3.5 py-3 pr-11 text-sm text-[var(--ec-ink)] placeholder-[var(--ec-faint)] transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-50"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ec-faint)] hover:text-[var(--ec-ink)] transition"
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
              className="relative w-full overflow-hidden rounded bg-primary px-4 py-3.5 text-[14px] font-extrabold tracking-[.04em] text-[#f9efe8] transition hover:bg-primary-dark active:scale-[0.99] disabled:opacity-60"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  {t('login_loading')}
                </span>
              ) : t('login_submit').toUpperCase()}
            </button>

            <div className="border-t border-[var(--ec-border)] pt-4 text-[11.5px] leading-[1.65] text-[var(--ec-faint)]">
              Roles resolve server-side. Operators land on a reduced navigation set with no access to Credits.
            </div>
          </form>

          <p className="mt-8 text-center text-xs text-[var(--ec-faint)]">
            Excellentia OMS · {t('login_footer')}
          </p>
        </div>
      </div>

    </div>
  )
}
