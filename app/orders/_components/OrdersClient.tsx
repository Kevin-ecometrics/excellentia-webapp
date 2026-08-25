'use client'

import React, { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { OrderRow, CompanyInfo } from '../page'
import { apiFetch, logout } from '@/app/lib/auth'
import { useLang } from '@/app/_components/LangProvider'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

interface Props {
  orders: OrderRow[]
  fetchError: string
  isAdmin: boolean
  company: CompanyInfo
}

interface Batch {
  batchId: string
  orders: OrderRow[]
  customerName: string | null
  userEmail: string | null
  userName:  string | null
  total: number
  status: string
  createdAt: string
  invoiceId: string | null
  paymentMethod: string | null
  checkNumber: string | null
  creditApplied: number | null
  damageCredits: number
}

interface DamageItem {
  barcode: string
  product_name: string
  qty: number
  unit_price?: number
  amount?: number
  unit?: string | null
}

// Espeja isLbsUnit()/formatDamageQty() del backend (creditCalculator.ts) y de
// la app Android (data/Models.kt) — mismo criterio en los 3 para que el
// ticket de la webapp, el ticket impreso y la factura de QBO coincidan. Solo
// Lbs necesita decimales; Case/Unit y Bucket siguen siendo conteos enteros.
function isLbsUnit(unit: string | null | undefined): boolean {
  return !unit || unit === 'Lbs'
}
// Number(qty): batch_damage.qty es DECIMAL(10,2) en MySQL — mysql2 devuelve
// columnas DECIMAL como string (no como number) salvo que se configure
// decimalNumbers en el backend, así que lo que llega acá vía fetch/JSON puede
// ser "2.35" en vez de 2.35 aunque el tipo declarado sea `number`. Sin este
// cast, qty.toFixed(2) revienta el render entero (string no tiene ese método).
function formatDamageQty(qty: number, unit: string | null | undefined): string {
  const q = Number(qty) || 0
  return isLbsUnit(unit) ? `${q.toFixed(2)} lb` : `${Math.round(q)} unit(s)`
}

// ── Ticket: agrupación por categoría de unidad (LBS / CASE-UNIT / BUCKET) ──
// Espeja ticketCategoryFor()/isCaseUnitType()/groupedForTicket()/byTicketCategory()
// de la app Android (data/Models.kt) y TicketDetailActivity.buildReceipt() — misma
// lógica en las dos para que el ticket de la webapp coincida con el que ve/imprime
// el vendedor en el TC22. "Case"/"Unit" viejos se siguen aceptando como el mismo
// tipo fusionado "Case/Unit" (datos históricos no migrados).
function isCaseUnitType(unit: string | null | undefined): boolean {
  return unit === 'Case/Unit' || unit === 'Case' || unit === 'Unit'
}

function ticketCategoryFor(unit: string | null | undefined): string {
  if (!unit || unit === 'Lbs') return 'LBS'
  if (isCaseUnitType(unit)) return 'CASE/UNIT'
  return unit.toUpperCase()
}

function isWeightTicketCategory(category: string): boolean {
  return category === 'LBS'
}

// Indicador corto de unidad para la columna Qty/W (comparte fila con rate/total).
function shortQtyUnit(category: string): string {
  if (category === 'CASE/UNIT') return 'cs/unt'
  if (category === 'BUCKET') return 'bkt'
  return category.slice(0, 3).toLowerCase()
}

// Nombre completo de unidad — usado en la línea de total al pie del ticket.
function unitLabel(unit: string | null | undefined): string {
  if (!unit || unit === 'Lbs') return 'lb'
  if (isCaseUnitType(unit)) return 'Case/Unit'
  return unit
}

interface GroupedTicketItem {
  barcode: string
  productName: string
  quantity: number
  total: number
  unit: string | null
  caseQty: number | null
  count: number
}

// Consolida líneas repetidas del mismo producto (mismo barcode) dentro de un
// batch — un producto escaneado/pesado varias veces aparece como una sola fila.
function groupedForTicket(orders: OrderRow[]): GroupedTicketItem[] {
  const map = new Map<string, GroupedTicketItem>()
  for (const o of orders) {
    const key = o.barcode || o.product_name
    const existing = map.get(key)
    if (!existing) {
      map.set(key, {
        barcode: o.barcode,
        productName: o.product_name,
        quantity: Number(o.quantity),
        total: Number(o.total),
        unit: o.unit ?? null,
        caseQty: o.case_qty ?? null,
        count: 1,
      })
    } else {
      existing.quantity += Number(o.quantity)
      existing.total += Number(o.total)
      existing.count += 1
    }
  }
  return Array.from(map.values())
}

const TICKET_CATEGORY_ORDER = ['LBS', 'CASE/UNIT', 'BUCKET']

// Agrupa preservando el orden LBS → CASE/UNIT → BUCKET → otras (alfabético).
function byTicketCategory(items: GroupedTicketItem[]): [string, GroupedTicketItem[]][] {
  const groups = new Map<string, GroupedTicketItem[]>()
  for (const item of items) {
    const cat = ticketCategoryFor(item.unit)
    if (!groups.has(cat)) groups.set(cat, [])
    groups.get(cat)!.push(item)
  }
  const orderedKeys = [
    ...TICKET_CATEGORY_ORDER.filter(k => groups.has(k)),
    ...Array.from(groups.keys()).filter(k => !TICKET_CATEGORY_ORDER.includes(k)).sort(),
  ]
  return orderedKeys.map(k => [k, groups.get(k)!] as [string, GroupedTicketItem[]])
}

// Etiqueta de unidad para el badge de la tabla principal — a diferencia de
// unitLabel() (usada en el pie del ticket, "lb" en minúscula para que quede
// bien en una frase), acá va con mayúscula inicial para que combine con
// "Case/Unit"/"Bucket" como texto de badge independiente.
function orderUnitLabel(unit: string | null | undefined): string {
  if (!unit || unit === 'Lbs') return 'Lbs'
  if (isCaseUnitType(unit)) return 'Case/Unit'
  return unit
}

// Cantidad mostrada para una línea de orden cruda (sin agrupar) — usada en la
// tabla principal de /orders (fila expandible). Case/Unit multiplica por
// unidades por caja (case_qty), igual que en el ticket agrupado.
function formatOrderQty(o: OrderRow): string {
  const category = ticketCategoryFor(o.unit)
  const qty = Number(o.quantity)
  if (isWeightTicketCategory(category)) return `${qty.toFixed(2)} lb`
  const displayQty = category === 'CASE/UNIT'
    ? qty * (o.case_qty && o.case_qty > 0 ? o.case_qty : 1)
    : qty
  return `${Math.round(displayQty)} ${shortQtyUnit(category)}`
}

const statusCls: Record<string, string> = {
  SENT:      'bg-green-100 text-green-700',
  PENDING:   'bg-amber-100 text-amber-700',
  FAILED:    'bg-red-100 text-red-700',
  CANCELLED: 'bg-slate-100 text-slate-500',
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('en-US', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: false,
    })
  } catch { return '' }
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

function groupBatches(orders: OrderRow[]): Batch[] {
  const map = new Map<string, OrderRow[]>()
  for (const o of orders) {
    const key = o.batch_id ?? `_${o.id}`
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(o)
  }
  return Array.from(map.entries()).map(([batchId, items]) => {
    const allSent = items.every(i => i.status === 'SENT')
    const anyFailed = items.some(i => i.status === 'FAILED')
    return {
      batchId,
      orders: items,
      customerName: items[0]?.customer_name ?? null,
      userEmail: items[0]?.user_email ?? null,
      userName:  items[0]?.user_name  ?? null,
      total: items.reduce((s, i) => s + Number(i.total), 0),
      status: allSent ? 'SENT' : anyFailed ? 'FAILED' : 'PENDING',
      createdAt: items[0]?.created_at ?? '',
      invoiceId: items[0]?.qb_invoice_id ?? null,
      paymentMethod: items[0]?.payment_method ?? null,
      checkNumber: items[0]?.check_number ?? null,
      creditApplied: Number(items[0]?.credit_applied) || null,
      damageCredits: Number(items[0]?.damage_credits) || 0,
    }
  })
}

function isToday(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  return d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
}

export default function OrdersClient({ orders, fetchError, isAdmin, company }: Props) {
  const router = useRouter()
  const { t } = useLang()

  const statusCfg: Record<string, { label: string; cls: string }> = {
    SENT:      { label: t('ord_labelSent'),      cls: statusCls.SENT },
    PENDING:   { label: t('ord_labelPending'),   cls: statusCls.PENDING },
    FAILED:    { label: t('ord_labelFailed'),    cls: statusCls.FAILED },
    CANCELLED: { label: t('ord_labelCancelled'), cls: statusCls.CANCELLED },
  }

  const paymentLabel: Record<string, string> = {
    Cash: t('ord_paymentCash'),
    Check: t('ord_paymentCheck'),
    'On Account': t('ord_paymentAccount'),
  }
  const paymentCls: Record<string, string> = {
    Cash: 'bg-green-100 text-green-700',
    Check: 'bg-blue-100 text-blue-700',
    'On Account': 'bg-amber-100 text-amber-700',
  }

  const [dateFilter, setDateFilter] = useState<'TODAY' | 'ALL'>('TODAY')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [paymentFilter, setPaymentFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [syncing, setSyncing] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [ticketBatch, setTicketBatch] = useState<Batch | null>(null)
  const [ticketDamageItems, setTicketDamageItems] = useState<DamageItem[]>([])
  const [ticketSignature, setTicketSignature] = useState<string | null>(null)
  const [expandedDamage, setExpandedDamage] = useState<Map<string, DamageItem[]>>(new Map())
  const [batchSignatures, setBatchSignatures] = useState<Map<string, boolean>>(new Map())
  const [exporting, setExporting] = useState(false)

  async function handleExpand(batchId: string) {
    const next = expanded === batchId ? null : batchId
    setExpanded(next)
    if (next && !expandedDamage.has(batchId)) {
      try {
        const res = await apiFetch(`${API}/api/orders/damage/${batchId}`)
        if (res.ok) {
          const data = await res.json()
          const items = (data.data ?? []).filter((d: DamageItem) => d.qty > 0)
          setExpandedDamage(prev => new Map(prev).set(batchId, items))
          setBatchSignatures(prev => new Map(prev).set(batchId, !!data.signature))
        }
      } catch {}
    }
  }

  async function openTicket(batch: Batch) {
    setTicketBatch(batch)
    setTicketDamageItems([])
    setTicketSignature(null)
    try {
      const res = await apiFetch(`${API}/api/orders/damage/${batch.batchId}`)
      if (res.ok) {
        const data = await res.json()
        setTicketDamageItems((data.data ?? []).filter((d: DamageItem) => d.qty > 0))
        if (data.signature) setTicketSignature(data.signature)
      }
    } catch { /* sin damage items */ }
  }

  function flash(text: string, ok: boolean) {
    setMsg({ text, ok })
    setTimeout(() => setMsg(null), 4000)
  }

  const batches = useMemo(() => groupBatches(orders), [orders])

  const dateFiltered = useMemo(() =>
    dateFilter === 'TODAY' ? batches.filter(b => isToday(b.createdAt)) : batches
  , [batches, dateFilter])

  const filtered = useMemo(() => {
    let result = dateFiltered
    if (statusFilter !== 'ALL') result = result.filter(b => b.status === statusFilter)
    if (paymentFilter !== 'ALL') result = result.filter(b => b.paymentMethod === paymentFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(b =>
        b.customerName?.toLowerCase().includes(q) ||
        b.batchId.toLowerCase().includes(q) ||
        b.orders.some(o => o.product_name.toLowerCase().includes(q))
      )
    }
    return result
  }, [dateFiltered, statusFilter, paymentFilter, search])

  const counts = useMemo(() => ({
    all: dateFiltered.length,
    pending: dateFiltered.filter(b => b.status === 'PENDING').length,
    sent: dateFiltered.filter(b => b.status === 'SENT').length,
    failed: dateFiltered.filter(b => b.status === 'FAILED').length,
  }), [dateFiltered])

  async function handleExport() {
    setExporting(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'ALL') params.set('status', statusFilter)
      const url = `${API}/api/orders/export?${params}`
      const res = await apiFetch(url)
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `orders_${new Date().toISOString().slice(0,10)}.csv`
      a.click()
      URL.revokeObjectURL(a.href)
    } catch {
      flash('Error exporting', false)
    } finally {
      setExporting(false)
    }
  }

  async function handleForceSync(batch: Batch) {
    setSyncing(batch.batchId)
    try {
      await Promise.all(batch.orders.map(o =>
        apiFetch(`${API}/api/orders/${o.id}/sync`, { method: 'POST' })
      ))
      flash(`Batch #${batch.batchId.slice(-6)} sent to sync queue`, true)
      router.refresh()
    } catch {
      flash('Error forcing sync', false)
    } finally {
      setSyncing(null)
    }
  }

  const chips = [
    { key: 'ALL',     label: t('ord_statusAll'),     count: counts.all },
    { key: 'PENDING', label: t('ord_statusPending'), count: counts.pending },
    { key: 'SENT',    label: t('ord_statusSent'),    count: counts.sent },
    { key: 'FAILED',  label: t('ord_statusFailed'),  count: counts.failed },
  ]

  const paymentChips = [
    { key: 'ALL',        label: t('ord_paymentAll') },
    { key: 'Cash',       label: t('ord_paymentCash') },
    { key: 'Check',      label: t('ord_paymentCheck') },
    { key: 'On Account', label: t('ord_paymentAccount') },
  ]

  return (
    <>
    {/* Modal ticket */}
    {ticketBatch && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setTicketBatch(null); setTicketDamageItems([]); setTicketSignature(null) }} />
        <div className="relative w-full max-w-sm rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 overflow-hidden">
          {/* Cierre */}
          <button onClick={() => { setTicketBatch(null); setTicketDamageItems([]); setTicketSignature(null) }}
            className="absolute right-3 top-3 z-10 rounded-full p-1 text-slate-400 hover:bg-slate-100">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
          {/* Ticket — same format as printed physical ticket */}
          <div className="p-5 font-mono text-[11px] leading-5 text-black bg-white">
            {/* Company header */}
            <p className="font-bold">{company.company_name}</p>
            <p>{company.subtitle}</p>
            {company.city    && <p>{company.city}</p>}
            {company.address && <p>{company.address}</p>}
            {company.phone   && <p>{company.phone}</p>}

            {/* Order info */}
            <p className="mt-1">================================</p>
            <p>{fmtDate(ticketBatch.createdAt)}</p>
            <p>{t('tkt_order')}{ticketBatch.batchId.slice(-8).toUpperCase()}</p>
            {ticketBatch.invoiceId && <p>{t('tkt_invoice')}{ticketBatch.invoiceId}</p>}

            {/* Customer */}
            {ticketBatch.customerName && (
              <>
                <p>--------------------------------</p>
                <p>{t('tkt_customer')} {ticketBatch.customerName}</p>
              </>
            )}
            {ticketBatch.paymentMethod && (
              <p>{t('tkt_payment')} {ticketBatch.paymentMethod === 'Check' && ticketBatch.checkNumber ? `Check #${ticketBatch.checkNumber}` : ticketBatch.paymentMethod}</p>
            )}

            {/* Items — agrupados por producto y por categoría de unidad
                (LBS / CASE-UNIT / BUCKET), misma lógica que el ticket de la
                app Android (TicketDetailActivity.buildReceipt) */}
            <p>================================</p>
            <p className="font-bold">Desc</p>
            <div className="flex justify-between font-bold">
              <span>Qty/W</span><span>Rate</span><span>Total</span>
            </div>
            {byTicketCategory(groupedForTicket(ticketBatch.orders)).map(([category, items]) => (
              <div key={category}>
                <p className="mt-1">--------------------------------</p>
                <p className="font-bold">{category}</p>
                <p>--------------------------------</p>
                {items.map(g => {
                  const displayQty = category === 'CASE/UNIT'
                    ? g.quantity * (g.caseQty && g.caseQty > 0 ? g.caseQty : 1)
                    : g.quantity
                  const avgPrice = displayQty !== 0 ? g.total / displayQty : 0
                  const pickCount = isWeightTicketCategory(category) ? g.count : Math.round(g.quantity)
                  const qtyStr = isWeightTicketCategory(category)
                    ? `${displayQty.toFixed(2)} lb`
                    : `${Math.round(displayQty)} ${shortQtyUnit(category)}`
                  return (
                    <div key={g.barcode} className="mb-2">
                      <p className="font-semibold">{pickCount} - {g.productName}</p>
                      <div className="flex justify-between">
                        <span>{qtyStr}</span>
                        <span>${avgPrice.toFixed(2)}</span>
                        <span className="font-semibold">${g.total.toFixed(2)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}

            {/* Negative Sale Summary */}
            {ticketDamageItems.length > 0 && (
              <>
                <p>--------------------------------</p>
                <p className="font-bold">{t('tkt_negSale')}</p>
                {ticketDamageItems.map((d, i) => (
                  <p key={i} className="pl-2">
                    {d.product_name}: {formatDamageQty(d.qty, d.unit)} · {fmt(-(d.amount ?? d.qty * (d.unit_price ?? 0)))}
                  </p>
                ))}
              </>
            )}

            {/* Total */}
            <p>================================</p>
            {(() => {
              const creditsTotal = ticketDamageItems.reduce(
                (sum, d) => sum + (d.amount ?? d.qty * (d.unit_price ?? 0)), 0
              )
              return (
                <>
                  {creditsTotal > 0 && (
                    <>
                      <div className="flex justify-between">
                        <span>{t('tkt_subtotal')}</span>
                        <span>{fmt(ticketBatch.total)}</span>
                      </div>
                      <div className="flex justify-between text-red-600 font-semibold">
                        <span>{t('tkt_credits')}</span>
                        <span>{fmt(-creditsTotal)}</span>
                      </div>
                    </>
                  )}
                  {ticketBatch.creditApplied && ticketBatch.creditApplied > 0 && (
                    <div className="flex justify-between text-green-600 font-semibold">
                      <span>Credit Applied</span>
                      <span>{fmt(-ticketBatch.creditApplied)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold">
                    <span>{t('tkt_total')}</span>
                    <span>{fmt(ticketBatch.total - creditsTotal - (ticketBatch.creditApplied ?? 0))}</span>
                  </div>
                </>
              )
            })()}
            {(() => {
              const grouped = byTicketCategory(groupedForTicket(ticketBatch.orders))
              const totalQty = ticketBatch.orders.reduce((s, o) => s + Number(o.quantity), 0)
              if (grouped.length <= 1) {
                const category = grouped[0]?.[0] ?? 'LBS'
                const overallUnit = unitLabel(ticketBatch.orders[0]?.unit)
                return isWeightTicketCategory(category)
                  ? <p>{totalQty.toFixed(2)} {overallUnit} total</p>
                  : <p>{Math.round(totalQty)} {overallUnit} total</p>
              }
              return <p>{groupedForTicket(ticketBatch.orders).length} {t('ord_items')} total</p>
            })()}
            <p>{company.company_name}</p>

            {/* Terms and conditions — QR, mismo formato que el ticket físico (PrintService.kt) */}
            <p className="mt-1">--------------------------------</p>
            <p className="font-semibold">{t('tkt_terms')}</p>
            <p>{t('tkt_scanToView')}</p>
            <div className="flex justify-center py-1">
              <img src="/disclaimer-qr.png" alt="Terms and Conditions QR" className="h-20 w-20" />
            </div>
            <p className="text-center break-all">https://excellentiafoods.com/terms-and-conditions/</p>

            {/* Signature */}
            <p className="mt-1">--------------------------------</p>
            <p>{t('tkt_signature')}</p>
            {ticketSignature ? (
              <img
                src={`data:image/png;base64,${ticketSignature}`}
                alt="Customer signature"
                className="mt-1 w-full max-h-28 object-contain object-left bg-white border border-slate-100 rounded"
              />
            ) : (
              <div className="h-10" />
            )}
          </div>
        </div>
      </div>
    )}

    <div>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">{t('ord_title')}</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {dateFilter === 'TODAY'
              ? t('ord_todaySubtitle').replace('{n}', String(dateFiltered.length)).replace('{total}', String(batches.length))
              : t('ord_allSubtitle').replace('{total}', String(batches.length))}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} disabled={exporting}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm hover:bg-slate-50 transition disabled:opacity-60">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            {exporting ? t('common_exporting') : t('common_export')}
          </button>
          <button onClick={() => router.refresh()}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 shadow-sm hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98] transition">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            {t('common_refresh')}
          </button>
        </div>
      </div>

      {msg && (
        <div className={`mb-4 rounded-lg px-4 py-3 text-sm font-medium ${msg.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {msg.text}
        </div>
      )}
      {fetchError && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{fetchError}</div>
      )}

      {/* KPIs */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: t('ord_statusAll'),     value: counts.all,     cls: 'bg-white text-zinc-900' },
          { label: t('ord_statusSent'),    value: counts.sent,    cls: 'bg-green-50 text-green-700' },
          { label: t('ord_statusPending'), value: counts.pending, cls: 'bg-amber-50 text-amber-700' },
          { label: t('ord_statusFailed'),  value: counts.failed,  cls: counts.failed > 0 ? 'bg-red-50 text-red-700' : 'bg-white text-zinc-900' },
        ].map(s => (
          <div key={s.label} className={`${s.cls} rounded-xl border border-slate-200 p-4`}>
            <p className="text-xs font-medium text-slate-500">{s.label}</p>
            <p className="mt-1 text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {/* Fecha */}
        <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-0.5">
          {(['TODAY', 'ALL'] as const).map(key => (
            <button key={key} onClick={() => { setDateFilter(key); setStatusFilter('ALL') }}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                dateFilter === key
                  ? 'bg-zinc-900 text-white shadow-sm'
                  : 'text-slate-500 hover:text-zinc-700'
              }`}>
              {key === 'TODAY' ? t('ord_today') : t('ord_all')}
            </button>
          ))}
        </div>

        {/* Status */}
        <div className="flex gap-1.5 flex-wrap">
          {chips.map(c => (
            <button key={c.key} onClick={() => setStatusFilter(c.key)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                statusFilter === c.key
                  ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-600/20'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
              }`}>
              {c.label}
              <span className={`rounded-full px-1.5 py-px text-[10px] font-bold ${
                statusFilter === c.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
              }`}>{c.count}</span>
            </button>
          ))}
        </div>

        {/* Payment */}
        <select value={paymentFilter} onChange={e => setPaymentFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-blue-100">
          {paymentChips.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>

        <div className="relative flex-1 min-w-[200px]">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder={t('ord_search')}
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-8 pr-4 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-300 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{t('ord_colOrder')}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{t('ord_colCustomer')}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{t('ord_colProducts')}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{t('ord_colTotal')}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{t('ord_colPayment')}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{t('ord_colStatus')}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{t('ord_colDate')}</th>
              {isAdmin && <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{t('ord_colOperator')}</th>}
              {isAdmin && <th className="px-4 py-3" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(batch => {
              const cfg = statusCfg[batch.status] ?? statusCfg.PENDING
              const isExpanded = expanded === batch.batchId
              const isSyncing = syncing === batch.batchId
              const canSync = isAdmin && (batch.status === 'PENDING' || batch.status === 'FAILED')

              return (
                <React.Fragment key={batch.batchId}>
                  <tr
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => handleExpand(batch.batchId)}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                          className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                          <polyline points="9 18 15 12 9 6"/>
                        </svg>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="font-mono text-xs font-semibold text-zinc-800">#{batch.batchId.slice(-8).toUpperCase()}</p>
                            {batchSignatures.get(batch.batchId) && (
                              <span className="inline-flex items-center rounded-full bg-blue-50 px-1.5 py-0.5 text-[9px] font-semibold text-blue-600 border border-blue-100">
                                ✎ {t('ord_hasSig')}
                              </span>
                            )}
                            {(expandedDamage.get(batch.batchId)?.length ?? 0) > 0 && (
                              <span className="inline-flex items-center rounded-full bg-orange-50 px-1.5 py-0.5 text-[9px] font-semibold text-orange-600 border border-orange-100">
                                ↩ {t('ord_negSale')}
                              </span>
                            )}
                          </div>
                          {batch.invoiceId && (
                            <p className="text-[10px] text-slate-400">{t('ord_invoice')} #{batch.invoiceId}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {batch.customerName ?? <span className="text-slate-400 italic">{t('ord_noCustomer')}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                        {batch.orders.length} {t('ord_items')}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-zinc-900">{fmt(batch.total - batch.damageCredits - (batch.creditApplied ?? 0))}</td>
                    <td className="px-4 py-3">
                      {batch.paymentMethod ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${paymentCls[batch.paymentMethod] ?? 'bg-slate-100 text-slate-500'}`}>
                            {paymentLabel[batch.paymentMethod] ?? batch.paymentMethod}
                          </span>
                          {batch.paymentMethod === 'Check' && batch.checkNumber && (
                            <span className="text-[10px] text-slate-400">#{batch.checkNumber}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.cls}`}>
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{fmtDate(batch.createdAt)}</td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        {(batch.userName || batch.userEmail) ? (
                          <div className="flex items-center gap-1.5">
                            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500 uppercase">
                              {(batch.userName ?? batch.userEmail ?? '?')[0]}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-zinc-700 truncate max-w-[120px]">
                                {batch.userName ?? batch.userEmail}
                              </p>
                              {batch.userName && batch.userEmail && (
                                <p className="text-[10px] text-slate-400 truncate max-w-[120px]">{batch.userEmail}</p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">—</span>
                        )}
                      </td>
                    )}
                    {isAdmin && (
                      <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => openTicket(batch)}
                            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50 hover:border-slate-300 transition">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                              <polyline points="14 2 14 8 20 8"/>
                            </svg>
                            {t('ord_ticket')}
                          </button>
                        {canSync && (
                          <button onClick={() => handleForceSync(batch)} disabled={isSyncing}
                            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 transition">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                              className={isSyncing ? 'animate-spin' : ''}>
                              <path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                            </svg>
                            {isSyncing ? t('ord_sending') : t('ord_forceSync')}
                          </button>
                        )}
                        </div>
                      </td>
                    )}
                  </tr>

                  {/* Expanded items */}
                  {isExpanded && (
                    <tr key={`${batch.batchId}-items`}>
                      <td colSpan={isAdmin ? 9 : 7} className="bg-slate-50 px-4 pb-3 pt-0">
                        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-slate-100 bg-slate-50">
                                <th className="px-3 py-2 text-left font-semibold text-slate-400 uppercase tracking-wide">Product</th>
                                <th className="px-3 py-2 text-left font-semibold text-slate-400 uppercase tracking-wide">Barcode</th>
                                <th className="px-3 py-2 text-left font-semibold text-slate-400 uppercase tracking-wide">Unit</th>
                                <th className="px-3 py-2 text-left font-semibold text-slate-400 uppercase tracking-wide">Quantity</th>
                                <th className="px-3 py-2 text-left font-semibold text-slate-400 uppercase tracking-wide">Price</th>
                                <th className="px-3 py-2 text-left font-semibold text-slate-400 uppercase tracking-wide">Total</th>
                                <th className="px-3 py-2 text-left font-semibold text-slate-400 uppercase tracking-wide">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {batch.orders.map(o => {
                                const sCfg = statusCfg[o.status] ?? statusCfg.PENDING
                                return (
                                  <tr key={o.id} className="hover:bg-slate-50">
                                    <td className="px-3 py-2 font-medium text-zinc-800">{o.product_name}</td>
                                    <td className="px-3 py-2 font-mono text-slate-500">{o.barcode}</td>
                                    <td className="px-3 py-2 text-slate-600">
                                      <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                                        {orderUnitLabel(o.unit)}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 text-slate-600">{formatOrderQty(o)}</td>
                                    <td className="px-3 py-2 text-slate-600">{fmt(o.price)}</td>
                                    <td className="px-3 py-2 font-semibold text-zinc-900">{fmt(Number(o.total))}</td>
                                    <td className="px-3 py-2">
                                      <span className={`inline-block rounded-full px-2 py-px text-[10px] font-semibold ${sCfg.cls}`}>
                                        {sCfg.label}
                                      </span>
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* Negative Sale */}
                        {(expandedDamage.get(batch.batchId)?.length ?? 0) > 0 && (
                          <div className="mt-2 rounded-xl border border-orange-100 bg-orange-50 px-4 py-3">
                            <div className="mb-1.5 flex items-center justify-between">
                              <p className="text-xs font-semibold uppercase tracking-wide text-orange-600">
                                Negative Sale
                              </p>
                              <p className="text-xs font-bold text-red-600">
                                {fmt(-expandedDamage.get(batch.batchId)!.reduce((s, d) => s + (d.amount ?? d.qty * (d.unit_price ?? 0)), 0))}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {expandedDamage.get(batch.batchId)!.map((d, i) => (
                                <span key={i} className="inline-flex items-center gap-1 rounded-full bg-white border border-orange-200 px-2.5 py-1 text-xs font-medium text-orange-700">
                                  <span className="font-semibold">{formatDamageQty(d.qty, d.unit)}</span> · {d.product_name}
                                  {(d.amount ?? d.unit_price) != null && (
                                    <span className="text-orange-500">{fmt(-(d.amount ?? d.qty * (d.unit_price ?? 0)))}</span>
                                  )}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={isAdmin ? 9 : 7} className="px-4 py-12 text-center text-sm text-slate-400">
                  {search || statusFilter !== 'ALL'
                    ? t('ord_emptyFilter')
                    : dateFilter === 'TODAY'
                      ? t('ord_emptyToday')
                      : t('ord_emptyAll')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {filtered.length > 0 && (
        <p className="mt-3 text-xs text-slate-400 text-right">
          {t('common_showing')} {filtered.length} {t('common_of')} {dateFiltered.length} {dateFilter === 'TODAY' ? t('ord_showingToday') : t('ord_items')}
        </p>
      )}
    </div>
    </>
  )
}
