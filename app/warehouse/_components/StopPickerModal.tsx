'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '@/app/lib/auth'
import { useLang } from '@/app/_components/LangProvider'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

interface AvailableOrder {
  batch_id: string
  customer_id: string | null
  customer_name: string | null
  total: number
  status: string
  item_count: number
  created_at: string
}

interface AvailablePreOrder {
  id: number
  customer_id: string
  customer_name: string
  scheduled_date: string | null
  salesperson_name: string | null
  status: string
  created_at: string
  item_count: number
  total: number
}

interface Props {
  routeId: number
  defaultDate: string
  onClose: () => void
  onAdded: () => void
}

export default function StopPickerModal({ routeId, defaultDate, onClose, onAdded }: Props) {
  const { t } = useLang()
  const [date, setDate] = useState(defaultDate.slice(0, 10))
  const [orders, setOrders] = useState<AvailableOrder[]>([])
  const [preOrders, setPreOrders] = useState<AvailablePreOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [adding, setAdding] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    apiFetch(`${API}/api/routes/available?date=${date}`)
      .then(res => {
        if (!res.ok) throw new Error(`Error ${res.status}`)
        return res.json()
      })
      .then(data => { setOrders(data.orders ?? []); setPreOrders(data.preOrders ?? []) })
      .catch(() => setError('Error loading'))
      .finally(() => setLoading(false))
  }, [date])

  useEffect(() => { load() }, [load])

  async function addStop(body: Record<string, unknown>, key: string) {
    setAdding(key)
    try {
      const res = await apiFetch(`${API}/api/routes/${routeId}/stops`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Error ${res.status}`)
      }
      onAdded()
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error adding stop')
    } finally {
      setAdding(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[rgba(0,51,50,.5)]" onClick={onClose} />

      <div className="relative z-10 flex max-h-[85vh] w-full max-w-lg flex-col rounded-lg bg-[#f9efe8] p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-[var(--ec-ink)]">{t('wh_addStop')}</h2>
          <button onClick={onClose} className="rounded p-1.5 text-[var(--ec-faint)] hover:bg-white hover:text-[var(--ec-ink)] transition">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="mb-4">
          <label className="mb-1.5 block text-[11.5px] font-bold uppercase tracking-[.09em] text-[#5A5049]">{t('wh_filterDate')}</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="w-full rounded border border-[var(--ec-border-strong)] bg-white px-3 py-2 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-50" />
        </div>

        {error && (
          <div className="mb-4 rounded bg-[var(--ec-danger-bg)] px-4 py-2.5 text-sm text-[var(--ec-danger)]">{error}</div>
        )}

        <div className="flex-1 overflow-y-auto space-y-5">
          {loading ? (
            <p className="py-8 text-center text-sm text-[var(--ec-faint)]">…</p>
          ) : orders.length === 0 && preOrders.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--ec-faint)]">{t('wh_noAvailable')}</p>
          ) : (
            <>
              {orders.length > 0 && (
                <div>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-[.09em] text-[#5A5049]">{t('wh_availableOrders')}</p>
                  <div className="space-y-2">
                    {orders.map(o => (
                      <div key={o.batch_id} className="flex items-center justify-between gap-3 rounded-md border border-[var(--ec-border)] bg-white px-3 py-2.5">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[var(--ec-ink)]">{o.customer_name ?? t('wh_noDriver')}</p>
                          <p className="text-xs text-[var(--ec-faint)]">#{o.batch_id.slice(-6)} · {o.item_count} · ${Number(o.total).toFixed(2)}</p>
                        </div>
                        <button
                          disabled={adding === o.batch_id}
                          onClick={() => addStop({ stop_type: 'BATCH', batch_id: o.batch_id }, o.batch_id)}
                          className="shrink-0 rounded bg-primary px-3 py-1.5 text-xs font-extrabold text-white transition hover:bg-primary-dark active:scale-[0.98] disabled:opacity-60">
                          {t('wh_add')}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {preOrders.length > 0 && (
                <div>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-[.09em] text-[#5A5049]">{t('wh_availablePreorders')}</p>
                  <div className="space-y-2">
                    {preOrders.map(p => (
                      <div key={p.id} className="flex items-center justify-between gap-3 rounded-md border border-[var(--ec-border)] bg-white px-3 py-2.5">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[var(--ec-ink)]">{p.customer_name}</p>
                          <p className="text-xs text-[var(--ec-faint)]">#{p.id} · {p.item_count} · ${Number(p.total).toFixed(2)}</p>
                        </div>
                        <button
                          disabled={adding === `pre-${p.id}`}
                          onClick={() => addStop({ stop_type: 'PRE_ORDER', pre_order_id: p.id }, `pre-${p.id}`)}
                          className="shrink-0 rounded bg-primary px-3 py-1.5 text-xs font-extrabold text-white transition hover:bg-primary-dark active:scale-[0.98] disabled:opacity-60">
                          {t('wh_add')}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
