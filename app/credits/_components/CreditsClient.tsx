'use client'

import React, { useState, useMemo, useRef } from 'react'
import type { CreditRow, CreditsSummary } from '../page'
import { useLang } from '@/app/_components/LangProvider'
import { apiFetch, logout } from '@/app/lib/auth'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

interface Props {
  credits: CreditRow[]
  summary: CreditsSummary
  fetchError: string
}

// Una línea de batch_damage — lo que se recogió y generó el crédito.
interface DamageLine {
  barcode: string
  product_name: string
  qty: number
  unit: string | null
  unit_price: number | null
  amount: number | null
  // Motivo del crédito por producto (2026-10-26); null = registrado antes de los motivos.
  reason: string | null
  reason_note: string | null
}

// NOTE = créditos 'cr…' (sin venta): los únicos con nota de crédito
// imprimible / enviable por correo (2026-10-27).
type TypeFilter = 'ALL' | 'EARNED' | 'USED' | 'NOTE'
const isNote = (c: CreditRow) => c.type === 'EARNED' && !!c.batch_id?.startsWith('cr')

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}
function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('en-US', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
    })
  } catch { return '' }
}

// Mismo criterio que formatDamageQty() de OrdersClient/creditCalculator.ts/
// Models.kt: solo Lbs lleva decimales. Number(): DECIMAL de mysql2 llega como string.
function formatDamageQty(qty: number, unit: string | null | undefined): string {
  const q = Number(qty) || 0
  return !unit || unit === 'Lbs' ? `${q.toFixed(2)} lb` : `${Math.round(q)} unit(s)`
}

// Fecha a mostrar: la de la venta del batch (misma que /orders) si tiene;
// si no (crédito agendado sin venta), la del movimiento.
const rowDate = (c: CreditRow) => c.sale_date ?? c.created_at
const orderRef = (c: CreditRow) => c.batch_id ? `#${c.batch_id.slice(-8).toUpperCase()}` : '—'
const invoiceRef = (c: CreditRow) => c.invoice_id ?? (c.invoice_number != null ? String(c.invoice_number) : null)

export default function CreditsClient({ credits, summary, fetchError }: Props) {
  const { t } = useLang()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL')
  // Detalle de lo recogido por crédito, cargado al abrir la fila (batch_id →
  // líneas de batch_damage). Mismo endpoint que usa el ticket de /orders.
  const [expanded, setExpanded] = useState<number | null>(null)
  const [details, setDetails] = useState<Map<string, DamageLine[] | 'error'>>(new Map())
  // Filtro por cliente (2026-10-27): al elegir uno se pide su historial
  // completo al backend (?customer_id=) — la carga inicial trae solo los
  // últimos 500 movimientos y podría dejarle afuera movimientos viejos.
  const [customerId, setCustomerId] = useState('')
  const [customerData, setCustomerData] = useState<{ rows: CreditRow[]; summary: CreditsSummary } | 'loading' | 'error' | null>(null)

  // Clientes con algún movimiento en lo cargado, para el selector.
  const customers = useMemo(() => {
    const map = new Map<string, string>()
    for (const c of credits) {
      if (c.customer_id && !map.has(c.customer_id)) map.set(c.customer_id, c.customer_name ?? c.customer_id)
    }
    return [...map].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name))
  }, [credits])

  // Último cliente pedido: descarta respuestas de una selección anterior.
  const latestCustomer = useRef('')

  function selectCustomer(id: string) {
    latestCustomer.current = id
    setCustomerId(id)
    setExpanded(null)
    if (!id) { setCustomerData(null); return }
    setCustomerData('loading')
    apiFetch(`${API}/api/credits?customer_id=${encodeURIComponent(id)}&limit=5000`)
      .then(res => {
        if (res.status === 401) { logout(); return null }
        if (!res.ok) throw new Error(`Error ${res.status}`)
        return res.json()
      })
      .then(data => {
        if (!data || latestCustomer.current !== id) return
        // Más antiguo primero: el saldo corrido se lee de arriba hacia abajo.
        const rows: CreditRow[] = [...(data.data ?? [])].reverse()
        setCustomerData({ rows, summary: { ...summary, ...(data.summary ?? {}) } })
      })
      .catch(() => { if (latestCustomer.current === id) setCustomerData('error') })
  }

  const customerLoaded = customerId && customerData && typeof customerData === 'object' ? customerData : null
  const base = customerId ? customerLoaded?.rows ?? [] : credits
  const shownSummary = customerLoaded?.summary ?? summary

  // Saldo después de cada movimiento del cliente elegido (EARNED suma, USED resta).
  const runningBalance = useMemo(() => {
    const map = new Map<number, number>()
    let acc = 0
    for (const c of customerLoaded?.rows ?? []) {
      acc += c.type === 'EARNED' ? Number(c.amount) : -Number(c.amount)
      map.set(c.id, Math.round(acc * 100) / 100)
    }
    return map
  }, [customerLoaded])

  const filtered = useMemo(() =>
    base.filter(c =>
      (typeFilter === 'ALL' || (typeFilter === 'NOTE' ? isNote(c) : c.type === typeFilter)) &&
      (customerId || (c.customer_name ?? '').toLowerCase().includes(search.toLowerCase()))),
    [base, customerId, search, typeFilter]
  )

  // Movimientos por cliente — para el saldo y el historial dentro del detalle.
  const byCustomer = useMemo(() => {
    const map = new Map<string, CreditRow[]>()
    for (const c of base) {
      const key = c.customer_id ?? `name:${c.customer_name ?? ''}`
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(c)
    }
    return map
  }, [base])
  const customerRows = (c: CreditRow) => byCustomer.get(c.customer_id ?? `name:${c.customer_name ?? ''}`) ?? []

  function toggle(c: CreditRow) {
    if (expanded === c.id) { setExpanded(null); return }
    setExpanded(c.id)
    const batchId = c.batch_id
    if (c.type !== 'EARNED' || !batchId || details.has(batchId)) return
    apiFetch(`${API}/api/orders/damage/${batchId}`)
      .then(res => {
        if (res.status === 401) { logout(); return null }
        if (!res.ok) throw new Error(`Error ${res.status}`)
        return res.json()
      })
      .then(data => {
        if (!data) return
        setDetails(prev => new Map(prev).set(batchId, data.data ?? []))
      })
      .catch(() => setDetails(prev => new Map(prev).set(batchId, 'error')))
  }

  const balance = Math.round((shownSummary.totalEarned - shownSummary.totalUsed) * 100) / 100
  const showRunning = !!customerLoaded
  const colCount = showRunning ? 9 : 8
  const pill = (active: boolean) =>
    `px-3.5 py-2 text-xs font-bold transition ${active ? 'bg-primary text-white' : 'text-[var(--ec-muted)] hover:text-[var(--ec-ink)]'}`

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[26px] sm:text-[31px] font-extrabold tracking-[-.028em] text-[var(--ec-ink)]">{t('crd_title')}</h1>
        <p className="mt-1.5 text-sm text-[var(--ec-muted)]">{t('crd_subtitleAll')}</p>
      </div>

      {fetchError && (
        <div className="mb-4 rounded bg-[var(--ec-danger-bg)] px-4 py-3 text-sm text-[var(--ec-danger)]">{fetchError}</div>
      )}

      {/* KPIs */}
      <div className="mb-5 grid grid-cols-1 sm:grid-cols-3 gap-px bg-[var(--ec-border)] border border-[var(--ec-border)] rounded-md overflow-hidden">
        <div className="bg-white p-4 border-t-[3px] border-t-[var(--ec-gold)]">
          <p className="text-[10.5px] font-bold uppercase tracking-[.14em] text-[var(--ec-warn-ink)]">{t('crd_totalIssued')}</p>
          <p className="mt-1.5 text-2xl font-extrabold tracking-[-.03em] text-[var(--ec-warn-ink)]">{fmt(shownSummary.totalEarned)}</p>
          <p className="mt-0.5 text-xs text-[var(--ec-faint)]">{shownSummary.countEarned} {t('crd_movements')}</p>
        </div>
        <div className="bg-white p-4 border-t-[3px] border-t-[var(--ec-success)]">
          <p className="text-[10.5px] font-bold uppercase tracking-[.14em] text-[var(--ec-success-ink)]">{t('crd_totalUsed')}</p>
          <p className="mt-1.5 text-2xl font-extrabold tracking-[-.03em] text-[var(--ec-success-ink)]">{fmt(shownSummary.totalUsed)}</p>
          <p className="mt-0.5 text-xs text-[var(--ec-faint)]">{shownSummary.countUsed} {t('crd_movements')}</p>
        </div>
        <div className="bg-white p-4">
          <p className="text-[10.5px] font-bold uppercase tracking-[.14em] text-[var(--ec-faint)]">{t('crd_balance')}</p>
          <p className="mt-1.5 text-2xl font-extrabold tracking-[-.03em] text-[var(--ec-ink)]">{fmt(balance)}</p>
          <p className="mt-0.5 text-xs text-[var(--ec-faint)]">{t('crd_balanceHint')}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="mt-5 mb-4 flex flex-wrap items-center gap-3">
        <div className="flex rounded border border-[var(--ec-border-strong)] bg-white overflow-hidden">
          {(['ALL', 'EARNED', 'USED', 'NOTE'] as const).map(k => (
            <button key={k} onClick={() => setTypeFilter(k)} className={pill(typeFilter === k)}>
              {k === 'ALL' ? t('crd_filterAll') : k === 'EARNED' ? t('crd_filterEarned') : k === 'USED' ? t('crd_filterUsed') : t('crd_filterNote')}
            </button>
          ))}
        </div>
        <select value={customerId} onChange={e => selectCustomer(e.target.value)}
          aria-label={t('crd_colCustomer')}
          className="w-full max-w-xs rounded border border-[var(--ec-border-strong)] bg-white py-2.5 px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-50">
          <option value="">{t('crd_allCustomers')}</option>
          {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {customerId ? (
          <button onClick={() => selectCustomer('')}
            className="text-xs font-bold text-primary hover:underline">
            {t('crd_clearCustomer')}
          </button>
        ) : (
          <div className="relative w-full max-w-sm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ec-faint)] pointer-events-none">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder={t('crd_search')}
              className="w-full rounded border border-[var(--ec-border-strong)] bg-white py-2.5 pl-8 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-50"
            />
          </div>
        )}
      </div>

      {customerData === 'loading' && <p className="mb-3 text-xs text-[var(--ec-faint)]">{t('crd_customerLoading')}</p>}
      {customerData === 'error' && (
        <div className="mb-3 rounded bg-[var(--ec-danger-bg)] px-4 py-3 text-sm text-[var(--ec-danger)]">{t('crd_customerError')}</div>
      )}
      {showRunning && <p className="mb-3 text-xs text-[var(--ec-muted)]">{t('crd_customerHistory')}</p>}

      {/* Table */}
      <div className="overflow-x-auto rounded-md border border-[var(--ec-border)] bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--ec-border)] bg-[var(--ec-surface-alt)]">
              <th className="w-8 px-2 py-3" />
              <th className="px-4 py-3 text-left text-[10px] font-extrabold uppercase tracking-[.1em] text-[#7C7169]">{t('crd_colDate')}</th>
              <th className="px-4 py-3 text-left text-[10px] font-extrabold uppercase tracking-[.1em] text-[#7C7169]">{t('crd_colType')}</th>
              <th className="px-4 py-3 text-left text-[10px] font-extrabold uppercase tracking-[.1em] text-[#7C7169]">{t('crd_colReason')}</th>
              <th className="px-4 py-3 text-left text-[10px] font-extrabold uppercase tracking-[.1em] text-[#7C7169]">{t('crd_colCustomer')}</th>
              <th className="px-4 py-3 text-left text-[10px] font-extrabold uppercase tracking-[.1em] text-[#7C7169]">{t('crd_colOrder')}</th>
              <th className="px-4 py-3 text-left text-[10px] font-extrabold uppercase tracking-[.1em] text-[#7C7169]">{t('crd_colInvoice')}</th>
              <th className="px-4 py-3 text-right text-[10px] font-extrabold uppercase tracking-[.1em] text-[#7C7169]">{t('crd_colAmount')}</th>
              {showRunning && <th className="px-4 py-3 text-right text-[10px] font-extrabold uppercase tracking-[.1em] text-[#7C7169]">{t('crd_colRunning')}</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--ec-divider)]">
            {filtered.map(c => {
              const isOpen = expanded === c.id
              const earned = c.type === 'EARNED'
              const invoice = invoiceRef(c)
              return (
                <React.Fragment key={c.id}>
                  <tr onClick={() => toggle(c)}
                    className={`cursor-pointer transition-colors ${isOpen ? 'bg-[var(--ec-surface-alt)]' : 'hover:bg-[var(--ec-surface-alt)]/60'}`}>
                    <td className="px-2 py-3 text-center text-[var(--ec-faint)]">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                        className={`inline transition-transform ${isOpen ? 'rotate-90' : ''}`}>
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                    </td>
                    <td className="px-4 py-3 font-mono text-[var(--ec-muted)] text-[10.5px]">{fmtDate(rowDate(c))}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded px-2 py-0.5 text-[9.5px] font-extrabold uppercase tracking-[.08em] ${earned
                        ? 'bg-[var(--ec-warn-bg)] text-[var(--ec-warn-ink)]'
                        : 'bg-[var(--ec-success-bg)] text-[var(--ec-success-ink)]'}`}>
                        {earned ? t('crd_typeEarned') : t('crd_typeUsed')}
                      </span>
                      {noteTag(c.note, t) && <span className="ml-1.5 text-[10px] italic text-[var(--ec-faint)]">{noteTag(c.note, t)}</span>}
                      {isNote(c) && (
                        <span title={t('crd_noteTagHint')}
                          className="ml-1.5 inline-flex items-center gap-1 rounded border border-[var(--ec-border-strong)] px-1.5 py-0.5 text-[9.5px] font-bold text-primary">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="22,6 12,13 2,6"/>
                          </svg>
                          {t('crd_noteTag')}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--ec-ink)]">
                      {!earned
                        ? <span className="text-[var(--ec-faint)]">—</span>
                        : c.reasons ?? <span className="italic text-[var(--ec-faint)]">{t('crd_noReason')}</span>}
                    </td>
                    <td className="px-4 py-3 font-semibold text-[var(--ec-ink)]">
                      {c.customer_name ?? <span className="text-[var(--ec-faint)] italic font-normal">{t('crd_noCustomer')}</span>}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11.5px] text-[var(--ec-muted)]">{orderRef(c)}</td>
                    <td className="px-4 py-3 font-mono text-[11.5px] text-[var(--ec-muted)]">
                      {invoice ? `#${invoice}` : <span className="text-[var(--ec-faint)] italic">{t('crd_noInvoice')}</span>}
                    </td>
                    <td className={`px-4 py-3 text-right font-mono font-bold ${earned ? 'text-[var(--ec-warn-ink)]' : 'text-[var(--ec-success-ink)]'}`}>
                      {earned ? '+' : '−'}{fmt(Number(c.amount))}
                    </td>
                    {showRunning && (
                      <td className="px-4 py-3 text-right font-mono font-bold text-[var(--ec-ink)]">{fmt(runningBalance.get(c.id) ?? 0)}</td>
                    )}
                  </tr>
                  {isOpen && (
                    <tr className="bg-[var(--ec-surface-alt)]">
                      <td />
                      <td colSpan={colCount - 1} className="px-4 pb-4 pt-1">
                        {earned
                          ? <EarnedDetail c={c} detail={c.batch_id ? details.get(c.batch_id) : []} t={t} />
                          : <UsedDetail c={c} t={t} sources={customerRows(c).filter(r => r.type === 'EARNED' && r.created_at <= c.created_at)} />}
                        <CustomerBalance rows={customerRows(c)} t={t} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
            {filtered.length === 0 && customerData !== 'loading' && (
              <tr>
                <td colSpan={colCount} className="px-4 py-12 text-center text-sm text-[var(--ec-faint)]">
                  {search ? `${t('crd_noResults')} "${search}"` : t('crd_empty')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

type T = (key: any) => string

// Etiqueta corta junto al tipo según la nota del movimiento. Antes toda nota
// se mostraba como "(reversa)"; desde 2026-10-26 el daño de una venta deja
// también un USED con nota "Aplicado en la misma venta".
function noteTag(note: string | null, t: T): string | null {
  if (!note) return null
  if (note.startsWith('Reversa')) return t('crd_reversal')
  if (note.startsWith('Aplicado en la misma venta')) return t('crd_sameSale')
  return null
}

// Crédito generado: de dónde salió y qué productos se recogieron.
function EarnedDetail({ c, detail, t }: { c: CreditRow; detail: DamageLine[] | 'error' | undefined; t: T }) {
  // 'cr…' = crédito agendado sin venta (POST /api/credits/issue);
  // el resto salió de artículos dañados dentro de una venta.
  const standalone = !!c.batch_id?.startsWith('cr')
  return (
    <div>
      <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[.1em] text-[var(--ec-faint)]">
        {standalone ? t('crd_originStandalone') : t('crd_originSale')}
      </p>
      {c.note && <p className="mb-2 text-xs italic text-[var(--ec-muted)]">{c.note}</p>}
      {standalone && c.batch_id && c.customer_id && <EmailNote batchId={c.batch_id} customerId={c.customer_id} t={t} />}
      {detail === undefined ? (
        <p className="text-xs text-[var(--ec-faint)]">…</p>
      ) : detail === 'error' ? (
        <p className="text-xs text-[var(--ec-danger)]">{t('crd_detailError')}</p>
      ) : detail.length === 0 ? (
        <p className="text-xs text-[var(--ec-faint)]">{t('crd_detailEmpty')}</p>
      ) : (
        <div className="overflow-x-auto rounded border border-[var(--ec-border)] bg-white">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--ec-border)] text-[10px] font-extrabold uppercase tracking-[.08em] text-[#7C7169]">
                <th className="px-3 py-2 text-left">{t('crd_detailProduct')}</th>
                <th className="px-3 py-2 text-left">{t('crd_colReason')}</th>
                <th className="px-3 py-2 text-right">{t('crd_detailQty')}</th>
                <th className="px-3 py-2 text-right">{t('crd_detailUnitPrice')}</th>
                <th className="px-3 py-2 text-right">{t('crd_colAmount')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--ec-divider)]">
              {detail.map((d, i) => {
                const amount = d.amount != null ? Number(d.amount) : Number(d.qty) * Number(d.unit_price ?? 0)
                return (
                  <tr key={i}>
                    <td className="px-3 py-2 text-[var(--ec-ink)]">
                      {d.product_name}
                      {d.barcode && <span className="ml-1.5 font-mono text-[10px] text-[var(--ec-faint)]">{d.barcode}</span>}
                    </td>
                    <td className="px-3 py-2 text-[var(--ec-ink)]">
                      {d.reason ?? <span className="italic text-[var(--ec-faint)]">{t('crd_noReason')}</span>}
                      {d.reason_note && <p className="mt-0.5 text-[10.5px] italic text-[var(--ec-muted)]">{d.reason_note}</p>}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">{formatDamageQty(d.qty, d.unit)}</td>
                    <td className="px-3 py-2 text-right font-mono">{d.unit_price != null ? fmt(Number(d.unit_price)) : '—'}</td>
                    <td className="px-3 py-2 text-right font-mono font-semibold">{fmt(amount)}</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-[var(--ec-border)]">
                <td colSpan={4} className="px-3 py-2 text-right text-[10px] font-extrabold uppercase tracking-[.08em] text-[var(--ec-faint)]">{t('crd_detailTotal')}</td>
                <td className="px-3 py-2 text-right font-mono font-bold text-[var(--ec-warn-ink)]">
                  {fmt(detail.reduce((s, d) => s + (d.amount != null ? Number(d.amount) : Number(d.qty) * Number(d.unit_price ?? 0)), 0))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}

// Nota de crédito por correo (ticket 3, 2026-10-27) — solo créditos 'cr…'.
// Precarga el correo guardado (corregido a mano o el de QBO); si se cambia,
// el backend lo guarda para la próxima vez. Siempre manual.
function EmailNote({ batchId, customerId, t }: { batchId: string; customerId: string; t: T }) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<{ kind: 'idle' | 'loading' | 'sending' | 'ok' | 'error'; msg?: string }>({ kind: 'idle' })

  function start() {
    setOpen(true)
    setStatus({ kind: 'loading' })
    apiFetch(`${API}/api/credits/customers/${encodeURIComponent(customerId)}/email`)
      .then(res => {
        if (res.status === 401) { logout(); return null }
        return res.ok ? res.json() : null
      })
      .then(data => {
        if (data && data.mail_configured === false) { setStatus({ kind: 'error', msg: t('crd_emailNotConfigured') }); return }
        setEmail(data?.email ?? '')
        setStatus({ kind: 'idle' })
      })
      .catch(() => setStatus({ kind: 'idle' }))
  }

  function send() {
    setStatus({ kind: 'sending' })
    apiFetch(`${API}/api/credits/notes/${encodeURIComponent(batchId)}/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim() }),
    })
      .then(async res => {
        if (res.status === 401) { logout(); return }
        const data = await res.json().catch(() => ({}))
        if (res.ok) setStatus({ kind: 'ok', msg: `${t('crd_emailSent')} ${data.to ?? email}` })
        else setStatus({ kind: 'error', msg: data.error ?? `Error ${res.status}` })
      })
      .catch(() => setStatus({ kind: 'error', msg: t('crd_emailError') }))
  }

  if (!open) {
    return (
      <button onClick={start} className="mb-3 rounded border border-[var(--ec-border-strong)] bg-white px-3 py-1.5 text-xs font-bold text-primary hover:bg-[var(--ec-surface-alt)]">
        {t('crd_emailButton')}
      </button>
    )
  }
  const busy = status.kind === 'loading' || status.kind === 'sending'
  return (
    <div className="mb-3 rounded border border-[var(--ec-border)] bg-white p-3">
      <p className="mb-2 text-xs text-[var(--ec-muted)]">{t('crd_emailHint')}</p>
      <div className="flex flex-wrap items-center gap-2">
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} disabled={busy}
          placeholder="customer@example.com"
          className="w-full max-w-xs rounded border border-[var(--ec-border-strong)] px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-50" />
        <button onClick={send} disabled={busy || !email.trim()}
          className="rounded bg-primary px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">
          {status.kind === 'sending' ? t('crd_emailSending') : t('crd_emailSend')}
        </button>
        <button onClick={() => { setOpen(false); setStatus({ kind: 'idle' }) }} disabled={status.kind === 'sending'}
          className="text-xs font-bold text-[var(--ec-muted)] hover:underline">
          {t('crd_emailCancel')}
        </button>
      </div>
      {status.msg && (
        <p className={`mt-2 text-xs ${status.kind === 'ok' ? 'text-[var(--ec-success-ink)]' : 'text-[var(--ec-danger)]'}`}>{status.msg}</p>
      )}
    </div>
  )
}

// Saldo aplicado: en qué venta/factura se usó y qué créditos del cliente
// existían hasta ese momento (el ledger no vincula un USED con un EARNED
// puntual — el saldo es un total por cliente — así que se listan todos los
// créditos generados antes de esta aplicación como posible origen).
function UsedDetail({ c, sources, t }: { c: CreditRow; sources: CreditRow[]; t: T }) {
  const invoice = invoiceRef(c)
  return (
    <div>
      <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[.1em] text-[var(--ec-faint)]">{t('crd_usedTitle')}</p>
      {c.note && <p className="mb-2 text-xs italic text-[var(--ec-muted)]">{c.note}</p>}
      <div className="mb-3 rounded border border-[var(--ec-border)] bg-white px-3 py-2 text-xs text-[var(--ec-ink)]">
        <p>
          <b>{t('crd_colOrder')}:</b> {orderRef(c)}
          {c.sale_date && <> · {fmtDate(c.sale_date)}</>}
          {invoice && <> · <b>{t('crd_colInvoice')}</b> #{invoice}</>}
          {c.sale_status && <> · {c.sale_status}</>}
        </p>
        <p className="mt-0.5"><b>{t('crd_usedAmount')}:</b> {fmt(Number(c.amount))}</p>
      </div>
      {sources.length > 0 && (
        <>
          <p className="mb-1.5 text-[10px] font-extrabold uppercase tracking-[.1em] text-[var(--ec-faint)]">{t('crd_usedSources')}</p>
          <div className="rounded border border-[var(--ec-border)] bg-white">
            {sources.map(s => (
              <div key={s.id} className="flex items-center justify-between gap-3 border-b border-[var(--ec-divider)] px-3 py-1.5 text-xs last:border-b-0">
                <span className="text-[var(--ec-ink)]">
                  {fmtDate(rowDate(s))} · <span className="font-mono">{orderRef(s)}</span>
                  <span className="ml-1.5 text-[var(--ec-faint)]">
                    {s.batch_id?.startsWith('cr') ?t('crd_sourceStandalone') : t('crd_sourceSale')}
                  </span>
                </span>
                <span className="font-mono font-semibold text-[var(--ec-warn-ink)]">+{fmt(Number(s.amount))}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// Saldo del cliente con lo cargado en la página (generado − aplicado).
function CustomerBalance({ rows, t }: { rows: CreditRow[]; t: T }) {
  const earned = rows.filter(r => r.type === 'EARNED').reduce((s, r) => s + Number(r.amount), 0)
  const used = rows.filter(r => r.type === 'USED').reduce((s, r) => s + Number(r.amount), 0)
  return (
    <p className="mt-3 text-xs text-[var(--ec-muted)]">
      <b>{t('crd_customerBalance')}:</b>{' '}
      {t('crd_typeEarned')} {fmt(earned)} · {t('crd_typeUsed')} {fmt(used)} ·{' '}
      <b className="text-[var(--ec-ink)]">{t('crd_balance')} {fmt(Math.round((earned - used) * 100) / 100)}</b>
    </p>
  )
}
