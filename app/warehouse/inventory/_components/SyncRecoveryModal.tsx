'use client'

import { useEffect, useState } from 'react'
import { apiFetch, logout } from '@/app/lib/auth'
import { useLang } from '@/app/_components/LangProvider'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

// Recuperación de stock + reintento a QBO para productos con movimientos
// "Not synced to QBO". El backend (getSyncRecovery, warehouseController.ts)
// compara stock webapp / QtyOnHand de QBO / lo que nunca llegó a QBO y sugiere
// el stock correcto; el admin revisa, puede editar el número, y al aplicar se
// guarda el stock (con un movimiento ADJUSTMENT de rastro) y se manda a QBO.
// Ver services/syncRecovery.ts en el backend para el criterio.

type Verdict = 'lost' | 'kept' | 'no_pending' | 'unknown'

interface RecoveryRow {
  product_id: number
  name: string
  unit: string | null
  stock: number
  qbo_qty: number | null
  qbo_type: string | null
  lots_qty: number
  unsynced_count: number
  pending_count: number
  pending_delta: number
  first_pending_at: string | null
  sales_after: number
  verdict: Verdict
  suggested_stock: number
  approximate: boolean
}

interface ApplyResult {
  product_id: number
  status: 'ok' | 'qbo_failed' | 'error'
  error?: string
}

const CHUNK = 10

function fmt(n: number | null): string {
  if (n === null || n === undefined) return '—'
  return Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 })
}

function fmtDate(iso: string | null): string {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleString('en-US', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false })
  } catch { return '' }
}

export default function SyncRecoveryModal({ productId, onClose, onApplied }: {
  productId: number | null   // null = todos los productos con movimientos sin sincronizar
  onClose: () => void
  onApplied: () => void
}) {
  const { t } = useLang()
  const [rows, setRows] = useState<RecoveryRow[] | null>(null)
  const [loadError, setLoadError] = useState('')
  const [qboError, setQboError] = useState('')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [values, setValues] = useState<Record<number, string>>({})
  const [applying, setApplying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<ApplyResult[] | null>(null)
  // Paso de confirmación antes de aplicar: resumen de qué stock cambia y qué
  // solo se manda a QBO.
  const [confirmStep, setConfirmStep] = useState(false)

  useEffect(() => {
    const url = productId ? `${API}/api/warehouse/sync-recovery?product_id=${productId}` : `${API}/api/warehouse/sync-recovery`
    apiFetch(url)
      .then(async res => {
        if (res.status === 401) { logout(); return }
        const data = await res.json().catch(() => ({}))
        if (!res.ok) { setLoadError(data.error ?? `Error ${res.status}`); return }
        const list: RecoveryRow[] = data.data ?? []
        setRows(list)
        setQboError(data.qbo_error ?? '')
        // Pre-tildado todo menos 'unknown' (sin dato de QBO no hay con qué
        // comparar — que el admin lo decida a mano).
        setSelected(new Set(list.filter(r => r.verdict !== 'unknown').map(r => r.product_id)))
        setValues(Object.fromEntries(list.map(r => [r.product_id, String(r.suggested_stock)])))
      })
      .catch(() => setLoadError('Could not connect to the server'))
  }, [productId])

  function toggle(id: number) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const invalid = (rows ?? []).some(r => selected.has(r.product_id) && !(Number(values[r.product_id]) >= 0 && values[r.product_id] !== ''))

  async function apply() {
    if (!rows) return
    const items = rows
      .filter(r => selected.has(r.product_id))
      .map(r => ({ product_id: r.product_id, new_stock: Number(values[r.product_id]) }))
    setApplying(true)
    setProgress(0)
    const all: ApplyResult[] = []
    // En tandas de 10: cada producto es un push a QBO y el backend los hace
    // de a uno — muchos en una sola request superarían el timeout del proxy.
    for (let i = 0; i < items.length; i += CHUNK) {
      const chunk = items.slice(i, i + CHUNK)
      try {
        const res = await apiFetch(`${API}/api/warehouse/sync-recovery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: chunk }),
        })
        if (res.status === 401) { logout(); return }
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          chunk.forEach(c => all.push({ product_id: c.product_id, status: 'error', error: data.error ?? `Error ${res.status}` }))
        } else {
          all.push(...(data.results ?? []))
        }
      } catch {
        chunk.forEach(c => all.push({ product_id: c.product_id, status: 'error', error: 'Could not connect to the server' }))
      }
      setProgress(Math.min(i + CHUNK, items.length))
    }
    setResults(all)
    setApplying(false)
    onApplied()
  }

  const nameOf = (id: number) => rows?.find(r => r.product_id === id)?.name ?? `#${id}`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[rgba(0,51,50,.5)]" onClick={!applying ? onClose : undefined} />
      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col rounded-lg bg-white shadow-2xl">
        <div className="border-b border-[var(--ec-border)] px-6 py-5">
          <h2 className="text-base font-bold text-[var(--ec-ink)]">{t('wh_recoveryTitle')}</h2>
          <p className="mt-1 text-xs text-[var(--ec-muted)]">{t('wh_recoveryHint')}</p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loadError && <div className="rounded bg-[var(--ec-danger-bg)] px-4 py-3 text-sm text-[var(--ec-danger)]">{loadError}</div>}
          {qboError && <div className="mb-3 rounded bg-[var(--ec-warn-bg)] px-4 py-3 text-xs font-semibold text-[var(--ec-warn-ink)]">{qboError}</div>}
          {!loadError && rows === null && <p className="py-8 text-center text-sm text-[var(--ec-faint)]">…</p>}
          {rows && rows.length === 0 && <p className="py-8 text-center text-sm text-[var(--ec-faint)]">{t('wh_recoveryNone')}</p>}

          {results ? (
            <div className="space-y-2">
              <p className="text-sm font-bold text-[var(--ec-success-ink)]">
                {t('wh_recoveryDone').replace('{n}', String(results.filter(r => r.status === 'ok').length))}
              </p>
              {results.filter(r => r.status !== 'ok').map(r => (
                <p key={r.product_id} className="text-xs font-semibold text-[var(--ec-danger)]">
                  {nameOf(r.product_id)} — {r.status === 'qbo_failed' ? t('wh_recoveryQboFailed') : r.error}
                </p>
              ))}
            </div>
          ) : confirmStep && rows ? (
            (() => {
              const chosen = rows.filter(r => selected.has(r.product_id))
              const changing = chosen.filter(r => Math.abs(Number(values[r.product_id]) - r.stock) > 0.01)
              const syncOnly = chosen.length - changing.length
              return (
                <div className="space-y-4">
                  <div className="rounded-md border border-[var(--ec-warn-border)] bg-[var(--ec-warn-bg)] px-4 py-3">
                    <p className="text-sm font-bold text-[var(--ec-warn-ink)]">{t('wh_recoveryConfirmTitle')}</p>
                    <p className="mt-1 text-xs text-[var(--ec-warn-ink)]">{t('wh_recoveryConfirmBody')}</p>
                  </div>

                  {changing.length > 0 && (
                    <div>
                      <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[.12em] text-[var(--ec-faint)]">
                        {t('wh_recoveryConfirmChanging').replace('{n}', String(changing.length))}
                      </p>
                      <div className="divide-y divide-[var(--ec-border)] rounded-md border border-[var(--ec-border)]">
                        {changing.map(r => {
                          const next = Number(values[r.product_id])
                          const diff = Math.round((next - r.stock) * 100) / 100
                          const warn = r.approximate || r.sales_after > 0
                          return (
                            <div key={r.product_id} className="flex items-center justify-between gap-3 px-3 py-2">
                              <p className="min-w-0 truncate text-sm text-[var(--ec-ink)]">
                                {warn && <span className="mr-1 text-[var(--ec-warn-ink)]" title={t('wh_recoveryApprox')}>⚠</span>}
                                {r.name}
                              </p>
                              <p className="shrink-0 text-sm font-semibold text-[var(--ec-ink)]">
                                {fmt(r.stock)} → <b>{fmt(next)}</b>{' '}
                                <span className={diff >= 0 ? 'text-[var(--ec-success-ink)]' : 'text-[var(--ec-danger)]'}>
                                  ({diff >= 0 ? '+' : ''}{fmt(diff)})
                                </span>
                              </p>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {syncOnly > 0 && (
                    <p className="text-xs text-[var(--ec-muted)]">{t('wh_recoveryConfirmSyncOnly').replace('{n}', String(syncOnly))}</p>
                  )}
                </div>
              )
            })()
          ) : rows && rows.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                {rows.length > 1 ? (
                  <label className="flex items-center gap-2 text-xs font-semibold text-[var(--ec-muted)]">
                    <input type="checkbox" checked={selected.size === rows.length} disabled={applying}
                      onChange={e => setSelected(e.target.checked ? new Set(rows.map(r => r.product_id)) : new Set())} />
                    {t('wh_backfillSelectAll')}
                  </label>
                ) : <span />}
                {rows.some(r => values[r.product_id] !== String(r.suggested_stock)) && (
                  <button type="button" disabled={applying}
                    onClick={() => setValues(Object.fromEntries(rows.map(r => [r.product_id, String(r.suggested_stock)])))}
                    className="text-xs font-bold text-primary hover:underline">
                    {t('wh_recoveryResetAll')}
                  </button>
                )}
              </div>
              {rows.map(r => {
                const isSelected = selected.has(r.product_id)
                const changes = Number(values[r.product_id]) !== r.stock
                return (
                  <div key={r.product_id} className={`rounded-md border px-4 py-3 ${isSelected ? 'border-[var(--ec-border-strong)]' : 'border-[var(--ec-border)] opacity-60'}`}>
                    <div className="flex flex-wrap items-start gap-3">
                      <input type="checkbox" className="mt-1" checked={isSelected} onChange={() => toggle(r.product_id)} disabled={applying} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-[var(--ec-ink)]">
                          {r.name} {r.unit && <span className="font-normal text-[var(--ec-faint)]">· {r.unit}</span>}
                        </p>
                        <p className="mt-1 text-xs text-[var(--ec-muted)]">
                          {t('wh_recoveryWebapp')} <b>{fmt(r.stock)}</b> · QBO <b>{fmt(r.qbo_qty)}</b> · {t('wh_recoveryLots')} <b>{fmt(r.lots_qty)}</b>
                        </p>
                        {r.pending_count > 0 && (
                          <p className="mt-0.5 text-xs text-[var(--ec-muted)]">
                            {t('wh_recoveryPending')
                              .replace('{qty}', `${r.pending_delta > 0 ? '+' : ''}${fmt(r.pending_delta)}`)
                              .replace('{n}', String(r.pending_count))
                              .replace('{date}', fmtDate(r.first_pending_at))}
                          </p>
                        )}
                        <p className={`mt-1.5 text-xs font-semibold ${r.verdict === 'lost' ? 'text-[var(--ec-warn-ink)]' : r.verdict === 'unknown' ? 'text-[var(--ec-danger)]' : 'text-[var(--ec-success-ink)]'}`}>
                          {t(`wh_recoveryVerdict_${r.verdict}` as any)}
                        </p>
                        {r.approximate && r.verdict !== 'unknown' && (
                          <p className="mt-0.5 text-xs text-[var(--ec-warn-ink)]">{t('wh_recoveryApprox')}</p>
                        )}
                        {r.sales_after > 0 && (
                          <p className="mt-0.5 text-xs text-[var(--ec-warn-ink)]">{t('wh_recoverySales').replace('{n}', String(r.sales_after))}</p>
                        )}
                        {r.qbo_type && r.qbo_type !== 'Inventory' && (
                          <p className="mt-0.5 text-xs text-[var(--ec-danger)]">{t('wh_recoveryNotInventory').replace('{type}', r.qbo_type)}</p>
                        )}
                      </div>
                      <div className="w-full shrink-0 sm:w-48">
                        <label className="block text-[10px] font-bold uppercase tracking-[.08em] text-[var(--ec-faint)]">{t('wh_recoveryNewStock')}</label>
                        <input type="number" step="0.01" min="0" value={values[r.product_id] ?? ''} disabled={!isSelected || applying}
                          onChange={e => setValues(v => ({ ...v, [r.product_id]: e.target.value }))}
                          className="mt-1 w-full rounded border border-[var(--ec-border-strong)] bg-white px-2 py-1.5 text-sm focus:border-primary focus:outline-none" />
                        {/* Opciones rápidas — se puede ir y volver entre ellas sin
                            perder la sugerencia original. "Lotes" sirve cuando la
                            sugerencia no puede deducir la pérdida (ej. el producto ya
                            se había reintentado antes). Se omite una opción si da el
                            mismo número que la sugerencia. */}
                        {isSelected && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {[
                              { key: 'suggested', label: t('wh_recoveryOptSuggested'), value: r.suggested_stock, show: true },
                              { key: 'lots', label: t('wh_recoveryLots'), value: r.lots_qty, show: Math.abs(r.lots_qty - r.suggested_stock) > 0.01 },
                              { key: 'current', label: t('wh_recoveryOptCurrent'), value: r.stock, show: Math.abs(r.stock - r.suggested_stock) > 0.01 },
                            ].filter(o => o.show).map(o => {
                              const active = values[r.product_id] !== '' && Math.abs(Number(values[r.product_id]) - o.value) <= 0.01
                              return (
                                <button key={o.key} type="button" disabled={applying}
                                  onClick={() => setValues(v => ({ ...v, [r.product_id]: String(o.value) }))}
                                  className={`rounded-full border px-2 py-0.5 text-[11px] font-bold transition ${active
                                    ? 'border-primary bg-primary text-white'
                                    : 'border-[var(--ec-border-strong)] bg-white text-[var(--ec-ink)] hover:border-primary'}`}>
                                  {o.label} {fmt(o.value)}
                                </button>
                              )
                            })}
                          </div>
                        )}
                        {isSelected && values[r.product_id] !== '' && (
                          <p className={`mt-1.5 text-[11px] font-semibold ${changes ? 'text-[var(--ec-warn-ink)]' : 'text-[var(--ec-faint)]'}`}>
                            {changes
                              ? `${fmt(r.stock)} → ${fmt(Number(values[r.product_id]))}`
                              : t('wh_recoveryNoChange')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 rounded-b-lg border-t border-[var(--ec-border)] bg-[var(--ec-surface-alt)] px-6 py-4">
          {applying && <span className="mr-auto text-xs font-semibold text-[var(--ec-muted)]">{progress}/{selected.size}</span>}
          {results ? (
            <button onClick={onClose}
              className="rounded bg-primary px-4 py-2.5 text-sm font-extrabold text-white hover:bg-primary-dark">OK</button>
          ) : confirmStep ? (
            <>
              <button onClick={() => setConfirmStep(false)} disabled={applying}
                className="rounded border border-[var(--ec-border-strong)] bg-white px-4 py-2.5 text-sm font-bold text-[var(--ec-ink)] hover:bg-[var(--ec-surface-alt)] disabled:opacity-50">
                {t('wh_recoveryBack')}
              </button>
              <button onClick={apply} disabled={applying}
                className="rounded bg-primary px-4 py-2.5 text-sm font-extrabold text-white hover:bg-primary-dark disabled:opacity-60">
                {applying ? t('common_saving') : t('wh_recoveryConfirm')}
              </button>
            </>
          ) : (
            <>
              <button onClick={onClose} disabled={applying}
                className="rounded border border-[var(--ec-border-strong)] bg-white px-4 py-2.5 text-sm font-bold text-[var(--ec-ink)] hover:bg-[var(--ec-surface-alt)] disabled:opacity-50">
                {t('common_cancel')}
              </button>
              <button onClick={() => setConfirmStep(true)} disabled={selected.size === 0 || invalid}
                className="rounded bg-primary px-4 py-2.5 text-sm font-extrabold text-white hover:bg-primary-dark disabled:opacity-60">
                {`${t('wh_recoveryApply')} (${selected.size})`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
