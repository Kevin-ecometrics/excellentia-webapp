'use client'

import { useState, useEffect, useMemo } from 'react'
import { apiFetch } from '@/app/lib/auth'
import { useLang } from '@/app/_components/LangProvider'
import { currentWeekdays } from '../_lib/weekdays'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

interface QbCustomer {
  Id: string
  DisplayName: string
}

interface Props {
  date: string
  onClose: () => void
  onAdded: (date: string) => void
}

// Simplificado (2026-09-18, pedido del usuario) — antes tenía 3 pestañas
// (Pedidos/Pre-órdenes/Cliente directo). Ahora es solo: buscar cliente y
// asignarlo a un día. El mismo cliente puede estar en varios días
// distintos sin problema (cada fila de route_day_stops es independiente
// por fecha) — no hay ninguna deduplicación entre días.
//
// La fecha arranca precargada con la que estaba filtrada en la lista de
// atrás, pero es editable acá adentro (pedido del usuario) — así se puede
// planificar otro día sin cerrar el modal y cambiar el filtro primero.
export default function AddDayStopModal({ date, onClose, onAdded }: Props) {
  const { t } = useLang()

  const weekdays = useMemo(() => currentWeekdays(), [])
  // El filtro de atrás puede estar en cualquier fecha (incluido un fin de
  // semana, o una semana pasada) — si no matchea ninguna de las 5 opciones
  // de esta semana, arranca en la primera (lunes) en vez de quedar con un
  // <select> sin nada seleccionado.
  const [selectedDate, setSelectedDate] = useState(
    () => weekdays.find(w => w.date === date)?.date ?? weekdays[0].date
  )
  const [customers, setCustomers] = useState<QbCustomer[] | null>(null)
  const [loadingCustomers, setLoadingCustomers] = useState(false)
  const [existingIds, setExistingIds] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [addingId, setAddingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoadingCustomers(true)
    apiFetch(`${API}/api/customers`)
      .then(res => res.ok ? res.json() : { QueryResponse: { Customer: [] } })
      .then(data => setCustomers(data.QueryResponse?.Customer ?? []))
      .catch(() => setCustomers([]))
      .finally(() => setLoadingCustomers(false))
  }, [])

  // Quién ya está en la lista de ESTE día — se re-consulta cada vez que
  // cambia el día elegido, para no ofrecer de nuevo un cliente que ya
  // tiene fila (el backend igual lo rechazaría, pero así ni aparece).
  useEffect(() => {
    apiFetch(`${API}/api/routes/day-stops?date=${selectedDate}`)
      .then(res => res.ok ? res.json() : { data: [] })
      .then(data => setExistingIds(new Set((data.data ?? []).map((d: { customer_id: string }) => d.customer_id))))
      .catch(() => setExistingIds(new Set()))
  }, [selectedDate])

  const filtered = useMemo(() => {
    if (!customers) return []
    const available = customers.filter(c => !existingIds.has(c.Id))
    const q = search.trim().toLowerCase()
    if (!q) return available.slice(0, 40)
    return available.filter(c => c.DisplayName?.toLowerCase().includes(q)).slice(0, 40)
  }, [customers, existingIds, search])

  async function addCustomer(c: QbCustomer) {
    setError('')
    setAddingId(c.Id)
    try {
      const res = await apiFetch(`${API}/api/routes/day-stops`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduled_date: selectedDate,
          stop_type: 'CUSTOMER',
          customer_id: c.Id,
          customer_name: c.DisplayName,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`)
      setExistingIds(prev => new Set(prev).add(c.Id))
      onAdded(selectedDate)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error adding')
    } finally {
      setAddingId(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[rgba(0,51,50,.5)]" onClick={onClose} />

      <div className="relative z-10 flex max-h-[85vh] w-full max-w-lg flex-col rounded-lg bg-[#f9efe8] shadow-2xl">
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <h2 className="text-lg font-extrabold text-[var(--ec-ink)]">{t('routes_addStopTitle')}</h2>
          <button onClick={onClose} className="rounded p-1.5 text-[var(--ec-faint)] hover:bg-white hover:text-[var(--ec-ink)] transition">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="px-6 pb-4">
          <label className="mb-1.5 block text-[11.5px] font-bold uppercase tracking-[.09em] text-[#5A5049]">{t('routes_scheduledDate')}</label>
          <select value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
            className="w-full rounded border border-[var(--ec-border-strong)] bg-white px-3 py-2 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-50">
            {currentWeekdays().map(w => (
              <option key={w.date} value={w.date}>{t(w.labelKey)}</option>
            ))}
          </select>
        </div>

        {error && (
          <div className="mx-6 mb-2 rounded bg-[var(--ec-danger-bg)] px-4 py-2.5 text-sm text-[var(--ec-danger)]">{error}</div>
        )}

        <div className="flex-1 overflow-y-auto bg-white px-6 py-4">
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={t('routes_searchCustomer')}
            className="mb-3 w-full rounded border border-[var(--ec-border-strong)] bg-white px-3 py-2 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-50" />
          {loadingCustomers ? (
            <p className="py-6 text-center text-sm text-[var(--ec-faint)]">…</p>
          ) : filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-[var(--ec-faint)]">{t('routes_noCustomerResults')}</p>
          ) : (
            <div className="space-y-2">
              {filtered.map(c => (
                <div key={c.Id} className="flex items-center gap-3 rounded-md border border-[var(--ec-border)] px-3 py-2.5">
                  <p className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--ec-ink)]">{c.DisplayName}</p>
                  <button disabled={addingId === c.Id}
                    onClick={() => addCustomer(c)}
                    className="shrink-0 rounded bg-primary px-3 py-1.5 text-xs font-extrabold text-white hover:bg-primary-dark transition disabled:opacity-60">
                    {addingId === c.Id ? t('common_saving') : t('routes_add')}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end border-t border-[var(--ec-border)] bg-[var(--ec-surface-alt)] px-6 py-4">
          <button onClick={onClose}
            className="rounded bg-primary px-4 py-2.5 text-sm font-extrabold text-white hover:bg-primary-dark active:scale-[0.98] transition">
            {t('routes_done')}
          </button>
        </div>
      </div>
    </div>
  )
}
