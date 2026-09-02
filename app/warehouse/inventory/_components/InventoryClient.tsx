'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { apiFetch, logout, getUserInfo } from '@/app/lib/auth'
import { useLang } from '@/app/_components/LangProvider'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

interface ProductLot {
  id: number
  product_id: number
  barcode: string | null
  expiration_date: string | null
  received_qty: number
  remaining_qty: number
  status: string
  received_at: string | null
  product_name: string | null
  sku: string | null
}

type MovementType = 'RECEIPT' | 'ROUTE_LOAD' | 'RETURN' | 'DAMAGE' | 'ADJUSTMENT'

interface InventoryMovement {
  id: number
  warehouse_id: number
  product_id: number
  lot_id: number | null
  movement_type: MovementType
  quantity: number
  route_id: number | null
  created_at: string | null
  product_name: string | null
  sku: string | null
  lot_expiration_date: string | null
}

const MOVEMENT_TYPES: MovementType[] = ['RECEIPT', 'ROUTE_LOAD', 'RETURN', 'DAMAGE', 'ADJUSTMENT']

interface BackfillLine {
  product_id: number
  name: string
  sku: string | null
  gap: number
  status: 'dry_run' | 'applied'
}

// Mismo criterio de color que ya usa Android (InventoryMovementsActivity):
// verde = entra stock (recepción/devolución), "info" (índigo) = sale de forma
// normal (carga de ruta, no es una pérdida), rojo = baja por daño, ámbar =
// ajuste manual.
const MOVEMENT_BADGE: Record<MovementType, string> = {
  RECEIPT:    'bg-[var(--ec-success-bg)] text-[var(--ec-success-ink)]',
  RETURN:     'bg-[var(--ec-success-bg)] text-[var(--ec-success-ink)]',
  ROUTE_LOAD: 'bg-[var(--ec-info-bg)] text-[var(--ec-info-ink)]',
  DAMAGE:     'bg-[var(--ec-danger-bg)] text-[var(--ec-danger)]',
  ADJUSTMENT: 'bg-[var(--ec-warn-bg)] text-[var(--ec-warn-ink)]',
}

// ≤7 días — mismo umbral que Android, para no tener dos criterios de "pronto
// a vencer" distintos entre las dos partes.
function isExpiringSoon(dateStr: string): boolean {
  const target = new Date(dateStr + 'T00:00:00')
  const today = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00')
  const days = Math.round((target.getTime() - today.getTime()) / 86400000)
  return days >= 0 && days <= 7
}

export default function InventoryClient() {
  const { t } = useLang()
  const [view, setView] = useState<'AVAILABLE' | 'HISTORY'>('AVAILABLE')
  const [isAdmin, setIsAdmin] = useState(false)

  const [lots, setLots] = useState<ProductLot[]>([])
  const [lotsError, setLotsError] = useState('')

  // Backfill de apertura (admin-only) — stock que nunca pasó por Recepción,
  // sin lote que lo respalde, así que no se puede cargar a una ruta hasta que
  // corra esto. Ver excellentia/src/controllers/warehouseController.ts
  // (backfillLots) para el detalle de por qué esto no toca products.stock.
  const [backfillPreview, setBackfillPreview] = useState<BackfillLine[] | null>(null)
  const [backfillLoading, setBackfillLoading] = useState(false)
  const [backfillApplying, setBackfillApplying] = useState(false)
  const [backfillError, setBackfillError] = useState('')
  const [backfillMsg, setBackfillMsg] = useState('')

  useEffect(() => { setIsAdmin(getUserInfo()?.role === 'admin') }, [])

  const [movements, setMovements] = useState<InventoryMovement[]>([])
  const [movementsError, setMovementsError] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState<MovementType | null>(null)

  const fetchLots = useCallback(() => {
    apiFetch(`${API}/api/warehouse/lots?status=ACTIVE`)
      .then(res => {
        if (res.status === 401) { logout(); return null }
        if (!res.ok) throw new Error(`Error ${res.status}`)
        return res.json()
      })
      .then(data => { if (data) setLots(data.data ?? []) })
      .catch(() => setLotsError('Could not connect to the server'))
  }, [])

  const fetchMovements = useCallback((date: string) => {
    const url = date ? `${API}/api/warehouse/movements?date=${date}` : `${API}/api/warehouse/movements`
    apiFetch(url)
      .then(res => {
        if (res.status === 401) { logout(); return null }
        if (!res.ok) throw new Error(`Error ${res.status}`)
        return res.json()
      })
      .then(data => { if (data) setMovements(data.data ?? []) })
      .catch(() => setMovementsError('Could not connect to the server'))
  }, [])

  useEffect(() => { fetchLots() }, [fetchLots])
  useEffect(() => { fetchMovements(dateFilter) }, [dateFilter, fetchMovements])

  function loadBackfillPreview() {
    setBackfillLoading(true)
    setBackfillError('')
    setBackfillMsg('')
    apiFetch(`${API}/api/warehouse/lots/backfill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
      .then(res => {
        if (res.status === 401) { logout(); return null }
        if (!res.ok) throw new Error(`Error ${res.status}`)
        return res.json()
      })
      .then(data => { if (data) setBackfillPreview(data.data ?? []) })
      .catch(() => setBackfillError(t('wh_backfillError')))
      .finally(() => setBackfillLoading(false))
  }

  function applyBackfill() {
    setBackfillApplying(true)
    setBackfillError('')
    apiFetch(`${API}/api/warehouse/lots/backfill?apply=true`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
      .then(res => {
        if (res.status === 401) { logout(); return null }
        if (!res.ok) throw new Error(`Error ${res.status}`)
        return res.json()
      })
      .then(data => {
        if (!data) return
        setBackfillPreview(null)
        setBackfillMsg(`${t('wh_backfillSuccess')} — ${data.summary?.count ?? 0}`)
        fetchLots()
      })
      .catch(() => setBackfillError(t('wh_backfillError')))
      .finally(() => setBackfillApplying(false))
  }

  // Lotes con stock real (> 0) ahora mismo — alimenta tanto "Disponible" como
  // el badge "Disponible" del historial (mismo dato, dos usos).
  const availableLots = useMemo(() => lots.filter(l => l.remaining_qty > 0), [lots])
  const availableLotIds = useMemo(() => new Set(availableLots.map(l => l.id)), [availableLots])

  const availableGroups = useMemo(() => {
    const byProduct = new Map<number, ProductLot[]>()
    for (const lot of availableLots) {
      const list = byProduct.get(lot.product_id) ?? []
      list.push(lot)
      byProduct.set(lot.product_id, list)
    }
    return Array.from(byProduct.entries())
      .map(([productId, group]) => ({
        productId,
        name: group[0].product_name ?? group[0].sku ?? `#${productId}`,
        total: group.reduce((sum, l) => sum + Number(l.remaining_qty), 0),
        // Mismo orden FIFO que usa el backend al cargar una ruta.
        lots: [...group].sort((a, b) => {
          if (!a.expiration_date && !b.expiration_date) return 0
          if (!a.expiration_date) return 1
          if (!b.expiration_date) return -1
          return a.expiration_date.localeCompare(b.expiration_date)
        }),
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [availableLots])

  const filteredMovements = useMemo(
    () => (typeFilter ? movements.filter(m => m.movement_type === typeFilter) : movements),
    [movements, typeFilter]
  )

  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  function dayLabel(dateKey: string): string {
    if (dateKey === today) return t('dt_today')
    if (dateKey === yesterday) return t('dt_yesterday')
    return dateKey
  }

  const pill = (active: boolean) =>
    `rounded-full px-4 py-2 text-sm font-bold transition ${
      active
        ? 'bg-primary text-white'
        : 'border border-[var(--ec-border-strong)] bg-white text-[var(--ec-muted)] hover:bg-[var(--ec-surface-alt)]'
    }`

  return (
    <div>
      <Link href="/warehouse" className="text-sm font-semibold text-[var(--ec-muted)] hover:text-[var(--ec-ink)]">
        {t('wh_backToWarehouse')}
      </Link>

      <div className="mt-3 mb-6">
        <h1 className="text-[26px] sm:text-[31px] font-extrabold tracking-[-.028em] text-[var(--ec-ink)]">{t('wh_inventoryTitle')}</h1>
      </div>

      <div className="mb-6 flex gap-2">
        <button onClick={() => setView('AVAILABLE')} className={pill(view === 'AVAILABLE')}>{t('wh_tabAvailable')}</button>
        <button onClick={() => setView('HISTORY')} className={pill(view === 'HISTORY')}>{t('wh_tabHistory')}</button>
      </div>

      {view === 'AVAILABLE' ? (
        <div>
          {isAdmin && (
            <div className="mb-5 rounded-md border border-[var(--ec-border)] bg-white px-4 py-3.5">
              <p className="text-sm font-bold text-[var(--ec-ink)]">{t('wh_backfillTitle')}</p>
              <p className="mt-1 text-xs text-[var(--ec-muted)]">{t('wh_backfillHint')}</p>

              {backfillMsg && <p className="mt-2 text-xs font-semibold text-[var(--ec-success-ink)]">{backfillMsg}</p>}
              {backfillError && <p className="mt-2 text-xs font-semibold text-[var(--ec-danger)]">{backfillError}</p>}

              {backfillPreview === null ? (
                <button onClick={loadBackfillPreview} disabled={backfillLoading}
                  className="mt-3 rounded border border-[var(--ec-border-strong)] bg-white px-3.5 py-2 text-xs font-bold text-[var(--ec-ink)] hover:bg-[var(--ec-surface-alt)] disabled:opacity-60">
                  {backfillLoading ? '…' : t('wh_backfillButton')}
                </button>
              ) : backfillPreview.length === 0 ? (
                <p className="mt-3 text-xs text-[var(--ec-faint)]">{t('wh_backfillNone')}</p>
              ) : (
                <div className="mt-3">
                  <div className="space-y-1.5">
                    {backfillPreview.map(line => (
                      <div key={line.product_id} className="flex items-center justify-between gap-3 rounded border border-[var(--ec-border)] px-3 py-1.5">
                        <p className="truncate text-xs font-semibold text-[var(--ec-ink)]">{line.name}</p>
                        <span className="shrink-0 text-xs font-extrabold text-[var(--ec-warn-ink)]">
                          {line.gap.toFixed(2)} {t('wh_backfillColQty')}
                        </span>
                      </div>
                    ))}
                  </div>
                  <button onClick={applyBackfill} disabled={backfillApplying}
                    className="mt-3 rounded bg-primary px-3.5 py-2 text-xs font-bold text-white hover:bg-primary-dark disabled:opacity-60">
                    {backfillApplying ? t('wh_backfillConfirming') : t('wh_backfillConfirm')}
                  </button>
                </div>
              )}
            </div>
          )}

          <p className="mb-4 text-sm text-[var(--ec-muted)]">{t('wh_availableHint')}</p>
          {lotsError && <div className="mb-4 rounded bg-[var(--ec-danger-bg)] px-4 py-3 text-sm text-[var(--ec-danger)]">{lotsError}</div>}
          {!lotsError && availableGroups.length === 0 ? (
            <div className="rounded-md border border-[var(--ec-border)] bg-white px-4 py-12 text-center text-sm text-[var(--ec-faint)]">
              {t('wh_noAvailableStock')}
            </div>
          ) : (
            <div className="space-y-3">
              {availableGroups.map(g => (
                <div key={g.productId} className="rounded-md border border-[var(--ec-border)] bg-white px-4 py-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-bold text-[var(--ec-ink)]">{g.name}</p>
                    <span className="shrink-0 rounded bg-[var(--ec-success-bg)] px-2.5 py-1 text-xs font-extrabold text-[var(--ec-success-ink)]">
                      {g.total.toFixed(2)} {t('wh_qtyAvailable')}
                    </span>
                  </div>
                  <div className="mt-2 space-y-1">
                    {g.lots.map(lot => {
                      const expiringSoon = lot.expiration_date != null && isExpiringSoon(lot.expiration_date)
                      return (
                        <p key={lot.id} className={`text-xs ${expiringSoon ? 'font-semibold text-[var(--ec-warn-ink)]' : 'text-[var(--ec-faint)]'}`}>
                          • {lot.expiration_date ? `${t('wh_expires')} ${lot.expiration_date.slice(0, 10)}` : t('wh_noExpiration')} · {Number(lot.remaining_qty).toFixed(2)} {t('wh_qtyAvailable')}
                        </p>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)}
              title={t('wh_filterDate')}
              className="rounded border border-[var(--ec-border-strong)] bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-50" />
            {dateFilter && (
              <button onClick={() => setDateFilter('')} className="text-xs font-semibold text-[var(--ec-muted)] hover:text-[var(--ec-ink)]">
                {t('wh_allDates')}
              </button>
            )}
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            <button onClick={() => setTypeFilter(null)} className={pill(typeFilter === null)}>{t('ord_all')}</button>
            {MOVEMENT_TYPES.map(type => (
              <button key={type} onClick={() => setTypeFilter(type)} className={pill(typeFilter === type)}>
                {t(`wh_movementType_${type}` as any)}
              </button>
            ))}
          </div>

          {movementsError && <div className="mb-4 rounded bg-[var(--ec-danger-bg)] px-4 py-3 text-sm text-[var(--ec-danger)]">{movementsError}</div>}
          {!movementsError && filteredMovements.length === 0 ? (
            <div className="rounded-md border border-[var(--ec-border)] bg-white px-4 py-12 text-center text-sm text-[var(--ec-faint)]">
              {typeFilter ? t('wh_noMovementsFilter') : t('wh_noMovements')}
            </div>
          ) : (
            <MovementsList movements={filteredMovements} availableLotIds={availableLotIds} dayLabel={dayLabel} t={t} />
          )}
        </div>
      )}
    </div>
  )
}

function MovementsList({
  movements, availableLotIds, dayLabel, t,
}: {
  movements: InventoryMovement[]
  availableLotIds: Set<number>
  dayLabel: (dateKey: string) => string
  t: (key: any) => string
}) {
  let lastDateKey: string | null = null
  return (
    <div className="space-y-2">
      {movements.map(m => {
        const dateKey = m.created_at?.slice(0, 10) ?? null
        const showHeader = dateKey != null && dateKey !== lastDateKey
        if (showHeader) lastDateKey = dateKey
        const exp = m.lot_expiration_date?.slice(0, 10) ?? null
        const expiringSoon = exp != null && isExpiringSoon(exp)
        const isAvailable = m.lot_id != null && availableLotIds.has(m.lot_id)

        return (
          <div key={m.id}>
            {showHeader && (
              <p className="mb-2 mt-4 text-[10px] font-extrabold uppercase tracking-[.12em] text-[var(--ec-faint)] first:mt-0">
                {dayLabel(dateKey!)}
              </p>
            )}
            <div className="rounded-md border border-[var(--ec-border)] bg-white px-4 py-3">
              <p className="truncate text-sm font-bold text-[var(--ec-ink)]">{m.product_name ?? m.sku ?? `#${m.product_id}`}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <span className={`rounded px-2 py-0.5 text-[9.5px] font-extrabold tracking-[.08em] uppercase ${MOVEMENT_BADGE[m.movement_type]}`}>
                  {t(`wh_movementType_${m.movement_type}` as any)}
                </span>
                <span className={`text-xs font-extrabold ${m.quantity >= 0 ? 'text-[var(--ec-success-ink)]' : 'text-[var(--ec-danger)]'}`}>
                  {m.quantity >= 0 ? '+' : ''}{Number(m.quantity).toFixed(2)}
                </span>
                {isAvailable && (
                  <span className="rounded bg-[var(--ec-success-bg)] px-2 py-0.5 text-[9.5px] font-extrabold tracking-[.08em] uppercase text-[var(--ec-success-ink)]">
                    {t('wh_tabAvailable')}
                  </span>
                )}
              </div>
              <p className={`mt-1.5 text-xs ${expiringSoon ? 'font-semibold text-[var(--ec-warn-ink)]' : 'text-[var(--ec-faint)]'}`}>
                {m.created_at?.slice(0, 16).replace('T', ' ')}
                {exp && ` · ${t('wh_expires')} ${exp}`}
                {m.route_id != null && ` · ${t('wh_routeRef')} #${m.route_id}`}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
