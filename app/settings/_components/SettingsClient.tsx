'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { CompanySettings } from '../page'
import { apiFetch, logout, getUserInfo } from '@/app/lib/auth'
import { useLang } from '@/app/_components/LangProvider'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

interface QbStatus {
  connected: boolean
  token_valid: boolean
  environment: string
  realm_id: string
  last_product_sync: string | null
}

interface Props {
  settings: CompanySettings | null
  fetchError: string
}

// ── Confirmation modal — cambio del contador de facturas ────────────────────
function InvoiceCounterConfirmModal({
  current,
  next,
  saving,
  onConfirm,
  onCancel,
}: {
  current: number
  next: number
  saving: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const { t } = useLang()
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={!saving ? onCancel : undefined}
      />
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-start gap-4 rounded-t-2xl bg-amber-50 px-6 py-5 border-b border-amber-100">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <div>
            <h2 className="text-base font-semibold text-zinc-900">{t('cfg_invoiceConfirmTitle')}</h2>
            <p className="mt-0.5 text-sm text-slate-500">{t('cfg_invoiceConfirmBody')}</p>
          </div>
        </div>
        <div className="px-6 py-5">
          <div className="flex items-center justify-center gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="text-center">
              <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{t('cfg_invoiceCurrent')}</p>
              <p className="text-lg font-bold text-slate-400 line-through tabular-nums">#{current}</p>
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"/>
              <polyline points="12 5 19 12 12 19"/>
            </svg>
            <div className="text-center">
              <p className="text-[10px] font-medium uppercase tracking-wide text-amber-600">{t('cfg_invoiceNewLabel')}</p>
              <p className="text-lg font-bold text-amber-700 tabular-nums">#{next}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 rounded-b-2xl border-t border-slate-100 bg-slate-50 px-6 py-4">
          <button onClick={onCancel} disabled={saving}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-300 transition disabled:opacity-50">
            {t('cfg_invoiceConfirmCancel')}
          </button>
          <button onClick={onConfirm} disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-amber-700 active:scale-[0.98] transition disabled:opacity-60">
            {saving ? (
              <>
                <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
                {t('cfg_invoiceUpdating')}
              </>
            ) : t('cfg_invoiceConfirmOk')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SettingsClient({ settings, fetchError }: Props) {
  const router = useRouter()
  const { t } = useLang()

  const [companyName, setCompanyName] = useState(settings?.company_name ?? 'EXCELLENTIA')
  const [subtitle,    setSubtitle]    = useState(settings?.subtitle ?? 'Sale Ticket')
  const [address,     setAddress]     = useState(settings?.address ?? '')
  const [phone,       setPhone]       = useState(settings?.phone ?? '')
  const [city,        setCity]        = useState(settings?.city ?? '')
  const [disclaimer,  setDisclaimer]  = useState(settings?.disclaimer ?? '')
  const [saving,      setSaving]      = useState(false)
  const [msg,         setMsg]         = useState<{ text: string; ok: boolean } | null>(null)
  const [qbStatus,    setQbStatus]    = useState<QbStatus | null>(null)
  const [qbLoading,   setQbLoading]   = useState(true)

  const [isAdmin,          setIsAdmin]          = useState(false)
  const [invoiceCounter,   setInvoiceCounter]   = useState(settings?.invoice_counter ?? null)
  const [newInvoiceInput,  setNewInvoiceInput]  = useState('')
  const [invoiceConfirm,   setInvoiceConfirm]   = useState<number | null>(null)
  const [savingCounter,    setSavingCounter]    = useState(false)

  useEffect(() => {
    apiFetch(`${API}/api/qb/status`)
      .then(r => r.ok ? r.json() : null)
      .then(data => setQbStatus(data))
      .catch(() => setQbStatus(null))
      .finally(() => setQbLoading(false))
  }, [])

  useEffect(() => {
    const user = getUserInfo()
    setIsAdmin(user?.role === 'admin')
  }, [])

  const parsedNewInvoice = Number(newInvoiceInput)
  const newInvoiceValid = newInvoiceInput.trim() !== ''
    && Number.isInteger(parsedNewInvoice)
    && invoiceCounter != null
    && parsedNewInvoice > invoiceCounter

  async function handleUpdateInvoiceCounter() {
    if (invoiceConfirm == null) return
    setSavingCounter(true)
    try {
      const res = await apiFetch(`${API}/api/settings/invoice-counter`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoice_counter: invoiceConfirm }),
      })
      if (res.status === 401) { logout(); return }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? `Error ${res.status}`)
      }
      const data = await res.json()
      setInvoiceCounter(data.data.invoice_counter)
      setNewInvoiceInput('')
      flash(t('cfg_invoiceUpdated'), true)
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Error updating counter', false)
    } finally {
      setSavingCounter(false)
      setInvoiceConfirm(null)
    }
  }

  function flash(text: string, ok: boolean) {
    setMsg({ text, ok })
    setTimeout(() => setMsg(null), 4000)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await apiFetch(`${API}/api/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: companyName,
          subtitle,
          address: address || null,
          phone:   phone   || null,
          city:    city    || null,
          disclaimer: disclaimer || null,
        }),
      })
      if (res.status === 401) { logout(); return }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? `Error ${res.status}`)
      }
      flash(t('cfg_saved'), true)
      router.refresh()
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Error saving', false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">{t('cfg_title')}</h1>
        <p className="mt-0.5 text-sm text-slate-500">{t('cfg_subtitle')}</p>
      </div>

      {msg && (
        <div className={`mb-4 rounded-lg px-4 py-3 text-sm font-medium ${msg.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {msg.text}
        </div>
      )}
      {fetchError && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{fetchError}</div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* Form */}
        <form onSubmit={handleSave} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="mb-5 text-sm font-semibold text-zinc-900">{t('cfg_formTitle')}</p>

          <div className="space-y-4">
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-xs font-medium text-slate-600">
                  {t('cfg_companyName')} <span className="text-red-400">*</span>
                </label>
                <span className={`text-[10px] font-medium tabular-nums ${companyName.length > 33 ? 'text-red-500' : 'text-slate-400'}`}>
                  {companyName.length}/33
                </span>
              </div>
              <input type="text" required value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                placeholder="EXCELLENTIA"
                maxLength={50}
                className={`w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 ${companyName.length > 33 ? 'border-amber-300 bg-amber-50 focus:border-amber-400 focus:ring-amber-100' : 'border-slate-300 bg-white focus:border-primary focus:ring-blue-100'}`}
              />
              <p className="mt-1 text-xs text-slate-400">{t('cfg_companyHint')}</p>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-xs font-medium text-slate-600">{t('cfg_ticketSub')}</label>
                <span className={`text-[10px] font-medium tabular-nums ${subtitle.length > 33 ? 'text-red-500' : 'text-slate-400'}`}>
                  {subtitle.length}/33
                </span>
              </div>
              <input type="text" value={subtitle}
                onChange={e => setSubtitle(e.target.value)}
                placeholder="Sale Ticket"
                maxLength={50}
                className={`w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 ${subtitle.length > 33 ? 'border-amber-300 bg-amber-50 focus:border-amber-400 focus:ring-amber-100' : 'border-slate-300 bg-white focus:border-primary focus:ring-blue-100'}`}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">{t('cfg_address')}</label>
              <input type="text" value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="123 Main Street"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">{t('cfg_city')}</label>
                <input type="text" value={city}
                  onChange={e => setCity(e.target.value)}
                  placeholder="New York, NY"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">{t('cfg_phone')}</label>
                <input type="tel" value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+1 555 123 4567"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="mb-1.5 block text-xs font-medium text-slate-600">Disclaimer / Legal Terms</label>
              <textarea value={disclaimer}
                onChange={e => setDisclaimer(e.target.value)}
                placeholder="I hereby acknowledge that all above referenced goods have been received..."
                rows={4}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-blue-100 resize-y"
              />
              <p className="mt-1 text-xs text-slate-400">Shown on printed tickets and receipts. Leave empty to omit.</p>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm ring-1 ring-blue-600/20 hover:bg-blue-700 active:scale-[0.98] transition disabled:opacity-60">
              {saving ? (
                <>
                  <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  </svg>
                  {t('cfg_saving')}
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                    <polyline points="17 21 17 13 7 13 7 21"/>
                    <polyline points="7 3 7 8 15 8"/>
                  </svg>
                  {t('cfg_save')}
                </>
              )}
            </button>
          </div>
        </form>

        {/* Ticket preview */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="mb-5 text-sm font-semibold text-zinc-900">{t('cfg_previewTitle')}</p>
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 font-mono text-xs">
            <p className="text-center text-sm font-bold tracking-widest">{companyName || 'EMPRESA'}</p>
            <p className="text-center text-slate-500">{subtitle || 'Sale Ticket'}</p>
            {city && <p className="text-center text-slate-400">{city}</p>}
            {address && <p className="text-center text-slate-400">{address}</p>}
            {phone && <p className="text-center text-slate-400">{phone}</p>}
            <div className="my-3 border-t border-dashed border-slate-300" />
            <p className="text-center text-slate-400">dd/MM/yyyy HH:mm</p>
            <p className="text-center">Order #XXXXXXXX</p>
            <p className="text-center">Customer: John Doe</p>
            <div className="my-3 border-t border-dashed border-slate-300" />
            <div className="mb-1">
              <p className="font-semibold">Sample Product</p>
              <p className="text-slate-500">123456 · $30.00/lb</p>
              <p className="flex justify-between"><span>1.50 lb</span><span>$45.00</span></p>
            </div>
            <div className="my-3 border-t border-dashed border-slate-300" />
            <p className="text-center font-bold">TOTAL</p>
            <p className="text-center text-lg font-bold">$45.00</p>
            <p className="text-center text-slate-400 mt-1">1.50 lb total</p>
            <p className="text-center text-slate-400 mt-3">{companyName || 'EMPRESA'}</p>
            {disclaimer && (
              <>
                <div className="my-3 border-t border-dashed border-slate-300" />
                <p className="text-[10px] leading-4 text-slate-500">{disclaimer}</p>
              </>
            )}
          </div>
          <p className="mt-3 text-xs text-slate-400">{t('cfg_previewNote')}</p>
        </div>

      </div>

      {/* QuickBooks Connection */}
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2"/>
                <path d="M8 21h8M12 17v4"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-900">QuickBooks Online</p>
              {qbLoading ? (
                <p className="text-xs text-slate-400">Checking status…</p>
              ) : qbStatus ? (
                <div className="mt-0.5 flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${qbStatus.token_valid ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${qbStatus.token_valid ? 'bg-green-500' : 'bg-amber-500'}`} />
                    {qbStatus.token_valid ? 'Connected' : 'Token expired'}
                  </span>
                  <span className="text-xs text-slate-400 capitalize">{qbStatus.environment}</span>
                  {qbStatus.last_product_sync && (
                    <span className="text-xs text-slate-400">
                      Last sync: {new Date(qbStatus.last_product_sync).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  )}
                </div>
              ) : (
                <div className="mt-0.5 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                  <span className="text-xs text-red-600">Not connected</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {qbStatus?.token_valid && (
              <a
                href={`${API}/api/qb/disconnect`}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 active:scale-[0.98] transition"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18.36 6.64A9 9 0 1 1 5.64 6.64"/>
                  <line x1="12" y1="2" x2="12" y2="12"/>
                </svg>
                Disconnect
              </a>
            )}
            <a
              href={`${API}/api/qb/auth`}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm ring-1 ring-blue-600/20 hover:bg-blue-700 active:scale-[0.98] transition"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
              </svg>
              {qbStatus?.token_valid ? 'Reconnect' : 'Connect'}
            </a>
          </div>
        </div>
      </div>

      {/* Invoice Numbering — admin only, edita company_settings.invoice_counter */}
      {isAdmin && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="10" y1="13" x2="14" y2="13"/>
                <line x1="10" y1="17" x2="14" y2="17"/>
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-zinc-900">{t('cfg_invoiceTitle')}</p>
              <p className="mt-0.5 text-xs text-slate-500">{t('cfg_invoiceNote')}</p>

              <div className="mt-4 flex flex-wrap items-end gap-3">
                <div>
                  <p className="mb-1.5 text-xs font-medium text-slate-600">{t('cfg_invoiceCurrent')}</p>
                  <p className="rounded-lg bg-slate-50 px-3 py-2.5 text-sm font-bold tabular-nums text-zinc-900 border border-slate-200">
                    {invoiceCounter != null ? `#${invoiceCounter}` : '—'}
                  </p>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">{t('cfg_invoiceNewLabel')}</label>
                  <input
                    type="number"
                    min={invoiceCounter != null ? invoiceCounter + 1 : 1}
                    step={1}
                    value={newInvoiceInput}
                    onChange={e => setNewInvoiceInput(e.target.value)}
                    placeholder={invoiceCounter != null ? String(invoiceCounter + 1) : ''}
                    className="w-40 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm tabular-nums focus:border-primary focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <button
                  type="button"
                  disabled={!newInvoiceValid || savingCounter}
                  onClick={() => setInvoiceConfirm(parsedNewInvoice)}
                  className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm ring-1 ring-amber-600/20 hover:bg-amber-700 active:scale-[0.98] transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('cfg_invoiceUpdate')}
                </button>
              </div>

              {newInvoiceInput.trim() !== '' && !newInvoiceValid && (
                <p className="mt-2 text-xs text-red-500">
                  {invoiceCounter != null
                    ? `Debe ser un número entero mayor a #${invoiceCounter}`
                    : 'Debe ser un número entero positivo'}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {invoiceConfirm != null && invoiceCounter != null && (
        <InvoiceCounterConfirmModal
          current={invoiceCounter}
          next={invoiceConfirm}
          saving={savingCounter}
          onConfirm={handleUpdateInvoiceCounter}
          onCancel={() => !savingCounter && setInvoiceConfirm(null)}
        />
      )}

      {/* APK Download */}
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-50">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="2" width="16" height="20" rx="2"/>
                <line x1="8" y1="6" x2="16" y2="6"/>
                <line x1="8" y1="10" x2="16" y2="10"/>
                <line x1="8" y1="14" x2="12" y2="14"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-900">Android App</p>
              <p className="text-xs text-slate-500">Download the APK for Android devices</p>
            </div>
          </div>
          <a
            href="/excellentia.apk"
            download
            className="flex items-center gap-2 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm ring-1 ring-green-600/20 hover:bg-green-700 active:scale-[0.98] transition"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Download APK
          </a>
        </div>
      </div>

      {settings?.updated_at && (
        <p className="mt-4 text-xs text-slate-400 text-right">
          {t('cfg_lastUpdated')} {new Date(settings.updated_at).toLocaleString('en-US', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', hour12: false
          })}
        </p>
      )}
    </div>
  )
}
