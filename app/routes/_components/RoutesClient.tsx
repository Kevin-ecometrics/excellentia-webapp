'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import type { DayStop } from '../page'
import { apiFetch, logout } from '@/app/lib/auth'
import { useLang } from '@/app/_components/LangProvider'
import ConfirmModal from '../../warehouse/_components/ConfirmModal'
import AddDayStopModal from './AddDayStopModal'
import CopyDayModal from './CopyDayModal'
import { currentWeekdays } from '../_lib/weekdays'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Fase 121 — antes esta pantalla mostraba UN día por vez (un <select> para
// elegir cuál), pedido explícito del usuario: ver los 5 días de la semana
// (lunes a viernes) listados juntos, cada uno con lo que ya tiene asignado
// — de un vistazo, sin tener que ir cambiando el filtro día por día.
export default function RoutesClient() {
  const { t } = useLang()
  const weekdays = currentWeekdays()
  const today = todayIso()

  // Un mapa fecha -> stops, cargado para los 5 días a la vez.
  const [stopsByDate, setStopsByDate] = useState<Record<string, DayStop[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [addDate, setAddDate] = useState<string | null>(null)
  const [copyDay, setCopyDay] = useState<{ date: string; label: string; count: number } | null>(null)
  const [pendingRemove, setPendingRemove] = useState<DayStop | null>(null)
  const [removing, setRemoving] = useState(false)

  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)

  function flash(text: string, ok: boolean) {
    setMsg({ text, ok })
    setTimeout(() => setMsg(null), 4000)
  }

  const fetchAll = useCallback(() => {
    setLoading(true)
    setError('')
    Promise.all(weekdays.map(w =>
      apiFetch(`${API}/api/routes/day-stops?date=${w.date}`)
        .then(res => {
          if (res.status === 401) { logout(); return null }
          if (!res.ok) throw new Error(`Error ${res.status}`)
          return res.json()
        })
        .then(data => [w.date, data?.data ?? []] as const)
    ))
      .then(entries => setStopsByDate(Object.fromEntries(entries)))
      .catch(() => setError('Could not connect to the server'))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  // Un solo día se refresca solo (no hace falta re-pedir los 5 de nuevo)
  // después de agregar/borrar/copiar sobre ESE día puntual.
  const refetchOne = useCallback((date: string) => {
    apiFetch(`${API}/api/routes/day-stops?date=${date}`)
      .then(res => res.ok ? res.json() : { data: [] })
      .then(data => setStopsByDate(prev => ({ ...prev, [date]: data.data ?? [] })))
      .catch(() => {})
  }, [])

  async function confirmRemove() {
    if (!pendingRemove) return
    setRemoving(true)
    try {
      const res = await apiFetch(`${API}/api/routes/day-stops/${pendingRemove.id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`)
      refetchOne(pendingRemove.scheduled_date)
      setPendingRemove(null)
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Error removing', false)
    } finally {
      setRemoving(false)
    }
  }

  return (
    <>
      {addDate && (
        <AddDayStopModal
          date={addDate}
          onClose={() => setAddDate(null)}
          onAdded={usedDate => {
            flash(t('routes_addStop'), true)
            refetchOne(usedDate)
          }}
        />
      )}
      {copyDay && (
        <CopyDayModal
          fromDate={copyDay.date}
          fromLabel={copyDay.label}
          stopsCount={copyDay.count}
          onClose={() => setCopyDay(null)}
          onCopied={(toDate, copied, skipped) => {
            setCopyDay(null)
            flash(
              t('routes_copyResult').replace('{copied}', String(copied)).replace('{skipped}', String(skipped)),
              true
            )
            // Si la fecha destino cae en la semana actual (una de las 5 que
            // ya se muestran), se refresca de una para verlo reflejado.
            if (weekdays.some(w => w.date === toDate)) refetchOne(toDate)
          }}
        />
      )}
      {pendingRemove && (
        <ConfirmModal
          title={t('routes_removeStopTitle')}
          body={t('routes_removeStopBody')}
          confirming={removing}
          onConfirm={confirmRemove}
          onCancel={() => setPendingRemove(null)}
        />
      )}

      <div>
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[26px] sm:text-[31px] font-extrabold tracking-[-.028em] text-[var(--ec-ink)]">{t('routes_title')}</h1>
            <p className="mt-1.5 text-sm text-[var(--ec-muted)]">{t('routes_weekSubtitle')}</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/warehouse"
              className="rounded border border-[var(--ec-border-strong)] bg-white px-4 py-2 text-sm font-bold text-[var(--ec-ink)] hover:bg-[var(--ec-surface-alt)] transition">
              {t('nav_warehouse')}
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

        {loading ? (
          <p className="py-12 text-center text-sm text-[var(--ec-faint)]">…</p>
        ) : (
          <div className="space-y-5">
            {weekdays.map(w => {
              const stops = stopsByDate[w.date] ?? []
              const isToday = w.date === today
              return (
                <div key={w.date} className="rounded-md border border-[var(--ec-border)] bg-white">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--ec-border)] px-4 py-3">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-extrabold text-[var(--ec-ink)]">{t(w.labelKey)}</p>
                      <span className="text-xs font-mono text-[var(--ec-faint)]">{w.date}</span>
                      {isToday && (
                        <span className="rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-bold text-primary">
                          {t('routes_today')}
                        </span>
                      )}
                      <span className="rounded bg-[var(--ec-surface-alt)] px-2 py-0.5 text-[10px] font-bold text-[var(--ec-muted)]">
                        {stops.length}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {stops.length > 0 && (
                        <button onClick={() => setCopyDay({ date: w.date, label: t(w.labelKey), count: stops.length })}
                          title={t('routes_copyTitle')}
                          className="rounded border border-[var(--ec-border-strong)] bg-white px-3 py-1.5 text-xs font-bold text-[var(--ec-ink)] hover:bg-[var(--ec-surface-alt)] transition">
                          {t('routes_copyButton')}
                        </button>
                      )}
                      <button onClick={() => setAddDate(w.date)}
                        className="rounded bg-primary px-3 py-1.5 text-xs font-extrabold text-white hover:bg-primary-dark active:scale-[0.98] transition">
                        + {t('routes_addStop')}
                      </button>
                    </div>
                  </div>

                  {stops.length === 0 ? (
                    <p className="px-4 py-6 text-center text-sm text-[var(--ec-faint)]">{t('routes_noDayStops')}</p>
                  ) : (
                    <div className="divide-y divide-[var(--ec-divider)]">
                      {stops.map(stop => (
                        <div key={stop.id} className="flex items-center gap-3 px-4 py-2.5">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-[var(--ec-ink)]">{stop.customer_name}</p>
                          </div>
                          {stop.assigned_route_id ? (
                            <span className="shrink-0 rounded bg-[var(--ec-success-bg)] px-2.5 py-1 text-xs font-bold text-[var(--ec-success-ink)]">
                              {t('routes_assignedTo')} {stop.assigned_route_name ?? `#${stop.assigned_route_id}`}
                            </span>
                          ) : (
                            <>
                              <span className="shrink-0 rounded bg-[var(--ec-surface-alt)] px-2.5 py-1 text-xs font-bold text-[var(--ec-muted)]">
                                {t('routes_unassigned')}
                              </span>
                              <button title={t('common_delete')}
                                onClick={() => setPendingRemove(stop)}
                                className="shrink-0 rounded p-1.5 text-[var(--ec-danger)] hover:bg-[var(--ec-danger-bg)] transition">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                              </button>
                            </>
                          )}
                        </div>
                      ))}
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
