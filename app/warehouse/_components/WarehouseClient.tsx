'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import type { RouteRow } from '../page'
import { apiFetch, logout } from '@/app/lib/auth'
import { useLang } from '@/app/_components/LangProvider'
import RouteModal from './RouteModal'
import ConfirmModal from './ConfirmModal'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

interface Driver {
  id: number
  name: string
}

interface Stop {
  id: number
  route_id: number
  position: number
  stop_type: 'BATCH' | 'PRE_ORDER' | 'CUSTOMER'
  batch_id: string | null
  pre_order_id: number | null
  customer_id: string | null
  customer_name: string | null
  status: string
  batch?: { batch_id: string; total: number; status: string; item_count: number; qb_invoice_id: string | null } | null
  preOrder?: { id: number; status: string; scheduled_date: string | null } | null
}

interface RouteItem {
  id: number
  route_id: number
  product_id: number
  barcode: string | null
  quantity: number
  name: string
  sku: string | null
  unit: string | null
  // Confirmación de salida — solo se puede cargar stock de lotes ACTIVE
  // (nunca dañado/vencido), así que esta fila ya es la prueba de que salió
  // en buen estado. Mismo dato que Android muestra en la revisión de
  // devoluciones.
  created_at: string
  loaded_by_name: string | null
}

interface RouteDetail extends RouteRow {
  stops: Stop[]
  items: RouteItem[]
}

// Fase 112 — lo que el almacén cuenta al volver la ruta (route_returns). Se
// carga aparte de RouteDetail porque GET /api/routes/:id no lo incluye.
interface RouteReturn {
  id: number
  route_id: number
  product_id: number
  quantity: number
  condition_status: 'GOOD' | 'DAMAGED' | 'EXPIRED' | 'TRANSPORTER_DAMAGE'
  notes: string | null
  // Fase 116 — valuación de la pérdida (NULL para GOOD, que no pierde nada).
  unit_price: number | null
  amount: number | null
  reviewed_at: string
  name: string
  sku: string | null
}

const RETURN_CONDITION_BADGE: Record<string, string> = {
  GOOD:               'bg-[var(--ec-success-bg)] text-[var(--ec-success-ink)]',
  DAMAGED:             'bg-[var(--ec-danger-bg)] text-[var(--ec-danger)]',
  EXPIRED:             'bg-[var(--ec-warn-bg)] text-[var(--ec-warn-ink)]',
  // Fase 116 — mismo índigo que ya usa MOVEMENT_BADGE para ROUTE_LOAD en
  // /warehouse/inventory, distinto del rojo de DAMAGED y el ámbar de EXPIRED.
  TRANSPORTER_DAMAGE:  'bg-[var(--ec-info-bg)] text-[var(--ec-info-ink)]',
}

const STATUS_BADGE: Record<string, string> = {
  PLANNED:     'bg-[var(--ec-surface-alt)] text-[var(--ec-muted)]',
  IN_PROGRESS: 'bg-[var(--ec-warn-bg)] text-[var(--ec-warn-ink)]',
  COMPLETED:   'bg-[var(--ec-success-bg)] text-[var(--ec-success-ink)]',
  CANCELLED:   'bg-[var(--ec-danger-bg)] text-[var(--ec-danger)]',
}

// Espeja canTransitionStatus() del backend (routeController.ts) — forward-only,
// sin retroceder, CANCELLED es terminal y no se puede cancelar una ruta ya
// COMPLETED. Se repite acá solo para decidir qué opciones mostrar en el
// <select> (UX) — el backend es quien realmente lo hace cumplir. La webapp ya
// no arma la ruta (eso es de la app Android) pero conserva este selector como
// override de emergencia, igual que "Cancelar ruta".
function nextStatusOptions(current: string): string[] {
  if (current === 'PLANNED') return ['PLANNED', 'IN_PROGRESS']
  if (current === 'IN_PROGRESS') return ['IN_PROGRESS', 'COMPLETED']
  return [current]
}

interface Props {
  initialRoutes: RouteRow[]
  fetchError: string
}

export default function WarehouseClient({ initialRoutes, fetchError }: Props) {
  const { t } = useLang()
  const [routes, setRoutes] = useState<RouteRow[]>(initialRoutes)
  const [error, setError] = useState(fetchError)
  const [dateFilter, setDateFilter] = useState('')

  const [drivers, setDrivers] = useState<Driver[]>([])
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [detail, setDetail] = useState<RouteDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [returns, setReturns] = useState<RouteReturn[]>([])

  const [editingRoute, setEditingRoute] = useState<RouteRow | null>(null)

  const [pendingStatus, setPendingStatus] = useState<{ routeId: number; newStatus: string } | null>(null)
  const [pendingCancelId, setPendingCancelId] = useState<number | null>(null)
  const [confirmingStatus, setConfirmingStatus] = useState(false)

  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)

  function flash(text: string, ok: boolean) {
    setMsg({ text, ok })
    setTimeout(() => setMsg(null), 4000)
  }

  const fetchRoutes = useCallback((date?: string) => {
    const url = date ? `${API}/api/routes?date=${date}` : `${API}/api/routes`
    apiFetch(url)
      .then(res => {
        if (res.status === 401) { logout(); return null }
        if (!res.ok) throw new Error(`Error ${res.status}`)
        return res.json()
      })
      .then(data => { if (data) setRoutes(data.data ?? []) })
      .catch(() => setError('Could not connect to the server'))
  }, [])

  useEffect(() => {
    apiFetch(`${API}/api/users/salespersons`)
      .then(res => res.ok ? res.json() : { data: [] })
      // Por ahora se incluye también admin (temporal, a pedido del usuario).
      .then(data => setDrivers((data.data ?? []).filter((u: any) => u.role === 'operator' || u.role === 'admin')))
      .catch(() => {})
  }, [])

  useEffect(() => { fetchRoutes(dateFilter || undefined) }, [dateFilter, fetchRoutes])

  const loadDetail = useCallback((id: number) => {
    setDetailLoading(true)
    apiFetch(`${API}/api/routes/${id}`)
      .then(res => {
        if (!res.ok) throw new Error(`Error ${res.status}`)
        return res.json()
      })
      .then(data => setDetail(data.data))
      .catch(() => flash('Error loading route', false))
      .finally(() => setDetailLoading(false))

    // Devoluciones — endpoint aparte (route_returns no viene en GET /routes/:id).
    // Solo tiene datos una vez que la ruta está COMPLETED, pero no hace daño
    // pedirlo siempre: si no hay nada, el array queda vacío.
    apiFetch(`${API}/api/routes/${id}/returns`)
      .then(res => res.ok ? res.json() : { data: [] })
      .then(data => setReturns(data.data ?? []))
      .catch(() => setReturns([]))
  }, [])

  function toggleExpand(route: RouteRow) {
    if (expandedId === route.id) {
      setExpandedId(null)
      setDetail(null)
      setReturns([])
      return
    }
    setExpandedId(route.id)
    setDetail(null)
    setReturns([])
    loadDetail(route.id)
  }

  function refreshAll(id: number) {
    fetchRoutes(dateFilter || undefined)
    loadDetail(id)
  }

  async function confirmStatusChange() {
    if (!pendingStatus) return
    setConfirmingStatus(true)
    try {
      const res = await apiFetch(`${API}/api/routes/${pendingStatus.routeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: pendingStatus.newStatus }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Error ${res.status}`)
      }
      refreshAll(pendingStatus.routeId)
      fetchRoutes(dateFilter || undefined)
      setPendingStatus(null)
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Error updating status', false)
    } finally {
      setConfirmingStatus(false)
    }
  }

  async function confirmCancel() {
    if (pendingCancelId == null) return
    const routeId = pendingCancelId
    setConfirmingStatus(true)
    try {
      const res = await apiFetch(`${API}/api/routes/${routeId}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Error ${res.status}`)
      }
      flash(t('wh_cancelRoute'), true)
      fetchRoutes(dateFilter || undefined)
      if (expandedId === routeId) refreshAll(routeId)
      setPendingCancelId(null)
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Error cancelling route', false)
    } finally {
      setConfirmingStatus(false)
    }
  }

  return (
    <>
      {editingRoute && (
        <RouteModal
          route={editingRoute}
          drivers={drivers}
          onClose={() => setEditingRoute(null)}
          onSaved={() => { const id = editingRoute.id; setEditingRoute(null); fetchRoutes(dateFilter || undefined); if (expandedId === id) loadDetail(id) }}
        />
      )}
      {pendingStatus && (
        <ConfirmModal
          title={t('wh_confirmStatusTitle')}
          body={`${t('wh_confirmStatusBody')} "${t(`wh_status_${pendingStatus.newStatus}` as any)}"?`}
          confirming={confirmingStatus}
          onConfirm={confirmStatusChange}
          onCancel={() => setPendingStatus(null)}
        />
      )}
      {pendingCancelId != null && (
        <ConfirmModal
          title={t('wh_confirmCancelTitle')}
          body={t('wh_confirmCancelBody')}
          confirming={confirmingStatus}
          onConfirm={confirmCancel}
          onCancel={() => setPendingCancelId(null)}
        />
      )}

      <div>
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[26px] sm:text-[31px] font-extrabold tracking-[-.028em] text-[var(--ec-ink)]">{t('wh_title')}</h1>
            <p className="mt-1.5 text-sm text-[var(--ec-muted)]">{routes.length} {t('wh_subtitle')}</p>
          </div>
          <div className="flex items-center gap-3">
            <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)}
              title={t('wh_filterDate')}
              className="rounded border border-[var(--ec-border-strong)] bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-50" />
            {dateFilter && (
              <button onClick={() => setDateFilter('')} className="text-xs font-semibold text-[var(--ec-muted)] hover:text-[var(--ec-ink)]">
                {t('wh_allDates')}
              </button>
            )}
            <Link href="/warehouse/inventory"
              className="rounded border border-[var(--ec-border-strong)] bg-white px-4 py-2 text-sm font-bold text-[var(--ec-ink)] hover:bg-[var(--ec-surface-alt)] transition">
              {t('wh_inventoryNav')}
            </Link>
          </div>
        </div>

        {msg && (
          <div className={`mb-4 rounded px-4 py-3 text-sm font-medium ${msg.ok ? 'bg-[var(--ec-success-bg)] text-[var(--ec-success-ink)]' : 'bg-[var(--ec-danger-bg)] text-[var(--ec-danger)]'}`}>
            {msg.text}
          </div>
        )}
        {error && (
          <div className="mb-4 rounded bg-[var(--ec-danger-bg)] px-4 py-3 text-sm text-[var(--ec-danger)]">{error}</div>
        )}

        {routes.length === 0 && !error ? (
          <div className="rounded-md border border-[var(--ec-border)] bg-white px-4 py-12 text-center text-sm text-[var(--ec-faint)]">
            {t('wh_noRoutes')}
          </div>
        ) : (
          <div className="space-y-3">
            {routes.map(route => {
              const expanded = expandedId === route.id
              return (
                <div key={route.id} className="overflow-hidden rounded-md border border-[var(--ec-border)] bg-white">
                  <button onClick={() => toggleExpand(route)} className="flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left hover:bg-[var(--ec-surface-alt)]/60 transition">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2.5">
                        <p className="truncate text-sm font-bold text-[var(--ec-ink)]">{route.name}</p>
                        <span className={`inline-block rounded px-2 py-0.5 text-[9.5px] font-extrabold tracking-[.1em] uppercase ${STATUS_BADGE[route.status]}`}>
                          {t(`wh_status_${route.status}` as any)}
                        </span>
                        {/* Fase 112 (2026-08-31) — aviso para el admin: no
                            asumir "nada volvió" solo porque no hay filas en
                            route_returns, capaz el almacén todavía no la revisó. */}
                        {route.status === 'COMPLETED' && !route.returns_reviewed_at && (
                          <span className="inline-block rounded bg-[var(--ec-warn-bg)] px-2 py-0.5 text-[9.5px] font-extrabold tracking-[.1em] uppercase text-[var(--ec-warn-ink)]">
                            {t('wh_returnsNotReviewed')}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-[var(--ec-muted)]">
                        {route.scheduled_date?.slice(0, 10)} · {route.driver_name ?? t('wh_noDriver')} · {route.stop_count} {t('wh_stops').toLowerCase()}
                      </p>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                      className={`shrink-0 text-[var(--ec-faint)] transition-transform ${expanded ? 'rotate-180' : ''}`}>
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </button>

                  {expanded && (
                    <div className="border-t border-[var(--ec-border)] bg-[var(--ec-surface-alt)]/40 px-4 py-4">
                      {detailLoading || !detail ? (
                        <p className="py-6 text-center text-sm text-[var(--ec-faint)]">…</p>
                      ) : (
                        <>
                          {detail.status === 'CANCELLED' || detail.status === 'COMPLETED' ? (
                            <div className="mb-4 flex items-center gap-2 rounded border border-[var(--ec-danger)]/25 bg-[var(--ec-danger-bg)] px-3 py-2.5 text-xs font-semibold text-[var(--ec-danger)]">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                              {detail.status === 'CANCELLED' ? t('wh_locked') : t('wh_lockedCompleted')}
                            </div>
                          ) : (
                            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <select
                                  value={detail.status}
                                  onChange={e => setPendingStatus({ routeId: detail.id, newStatus: e.target.value })}
                                  className="rounded border border-[var(--ec-border-strong)] bg-white px-2.5 py-1.5 text-xs font-bold focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-50"
                                >
                                  {nextStatusOptions(detail.status).map(s => (
                                    <option key={s} value={s}>{t(`wh_status_${s}` as any)}</option>
                                  ))}
                                </select>
                                <button onClick={() => setEditingRoute(route)}
                                  className="rounded border border-[var(--ec-border-strong)] bg-white px-3 py-1.5 text-[11px] font-bold text-[var(--ec-ink)] hover:bg-[var(--ec-surface-alt)] transition">
                                  {t('common_edit')}
                                </button>
                                <button onClick={() => setPendingCancelId(route.id)}
                                  className="rounded border border-[var(--ec-danger)]/30 bg-white px-3 py-1.5 text-[11px] font-bold text-[var(--ec-danger)] hover:bg-[var(--ec-danger-bg)] transition">
                                  {t('wh_cancelRoute')}
                                </button>
                              </div>
                            </div>
                          )}

                          {detail.notes && (
                            <p className="mb-3 rounded border border-[var(--ec-border)] bg-white px-3 py-2 text-xs text-[var(--ec-muted)]">{detail.notes}</p>
                          )}

                          <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[.12em] text-[var(--ec-faint)]">{t('wh_stops')}</p>
                          {detail.stops.length === 0 ? (
                            <p className="pb-4 text-sm text-[var(--ec-faint)]">{t('wh_noStops')}</p>
                          ) : (
                            <div className="mb-4 space-y-2">
                              {[...detail.stops].sort((a, b) => a.position - b.position).map((stop, i) => (
                                <div key={stop.id} className="flex items-center gap-3 rounded-md border border-[var(--ec-border)] bg-white px-3 py-2.5">
                                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-[var(--ec-surface-alt)] text-[11px] font-extrabold text-[var(--ec-muted)]">
                                    {i + 1}
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold text-[var(--ec-ink)]">{stop.customer_name ?? '—'}</p>
                                    <p className="text-xs text-[var(--ec-faint)]">
                                      {stop.stop_type === 'BATCH' ? t('wh_order') : stop.stop_type === 'PRE_ORDER' ? t('wh_preorder') : t('wh_customer')}
                                      {stop.batch && ` · $${Number(stop.batch.total).toFixed(2)}`}
                                      {stop.preOrder && ` · #${stop.preOrder.id}`}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[.12em] text-[var(--ec-faint)]">{t('wh_loaded')}</p>
                          {detail.items.length === 0 ? (
                            <p className="text-sm text-[var(--ec-faint)]">{t('wh_noItems')}</p>
                          ) : (
                            <div className="space-y-2">
                              {detail.items.map(item => (
                                <div key={item.id} className="flex items-center gap-3 rounded-md border border-[var(--ec-border)] bg-white px-3 py-2.5">
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold text-[var(--ec-ink)]">{item.name}</p>
                                    <p className="text-xs text-[var(--ec-faint)]">
                                      {item.sku ?? item.barcode ?? '—'}{item.unit && ` · ${item.unit}`}
                                    </p>
                                    <p className="mt-0.5 text-[11px] text-[var(--ec-success-ink)]">
                                      {t('wh_loadedOn')} {item.created_at.slice(0, 16).replace('T', ' ')}
                                      {item.loaded_by_name && ` · ${t('wh_loadedBy')} ${item.loaded_by_name}`}
                                      {' — '}{t('wh_loadedConfirmed')}
                                    </p>
                                  </div>
                                  <span className="shrink-0 rounded bg-[var(--ec-surface-alt)] px-2.5 py-1 text-xs font-extrabold text-[var(--ec-ink)]">
                                    {item.quantity}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Fase 112 — lo que el almacén contó al volver la
                              ruta: cantidad real + condición por producto.
                              returns_reviewed_at (2026-08-31) distingue "no
                              revisado todavía" de "revisado, nada volvió" —
                              antes ambos casos se veían idénticos (lista vacía). */}
                          <p className="mt-4 mb-2 text-[10px] font-extrabold uppercase tracking-[.12em] text-[var(--ec-faint)]">{t('wh_returns')}</p>
                          {!detail.returns_reviewed_at ? (
                            <p className="flex items-center gap-1.5 text-sm font-semibold text-[var(--ec-warn-ink)]">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                              {t('wh_returnsNotReviewed')}
                            </p>
                          ) : returns.length === 0 ? (
                            <p className="text-sm text-[var(--ec-faint)]">{t('wh_noReturns')}</p>
                          ) : (
                            <div className="space-y-2">
                              {returns.map(r => (
                                <div key={r.id} className="flex items-center gap-3 rounded-md border border-[var(--ec-border)] bg-white px-3 py-2.5">
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold text-[var(--ec-ink)]">{r.name}</p>
                                    {r.notes && <p className="text-xs text-[var(--ec-faint)]">{r.notes}</p>}
                                  </div>
                                  <span className={`shrink-0 rounded px-2 py-0.5 text-[9.5px] font-extrabold tracking-[.08em] uppercase ${RETURN_CONDITION_BADGE[r.condition_status]}`}>
                                    {t(`wh_returnCondition_${r.condition_status}` as any)}
                                  </span>
                                  {/* Fase 116 — pérdida de inventario valorizada, no aplica a GOOD (amount siempre NULL ahí).
                                      Number(): amount es DECIMAL(10,2) en MySQL — mysql2 lo devuelve como string
                                      sin decimalNumbers configurado (mismo gotcha que batch_damage.qty, ver
                                      excellentia/CLAUDE.md), así que llega como "3.50" via JSON, no 3.5. */}
                                  {Number(r.amount) > 0 && (
                                    <span className="shrink-0 text-xs font-extrabold text-[var(--ec-danger)]">
                                      -${Number(r.amount).toFixed(2)}
                                    </span>
                                  )}
                                  <span className="shrink-0 rounded bg-[var(--ec-surface-alt)] px-2.5 py-1 text-xs font-extrabold text-[var(--ec-ink)]">
                                    {r.quantity}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
