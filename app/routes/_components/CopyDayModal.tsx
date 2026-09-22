'use client'

import { useState } from 'react'
import { apiFetch } from '@/app/lib/auth'
import { useLang } from '@/app/_components/LangProvider'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

interface Props {
  fromDate: string
  fromLabel: string
  stopsCount: number
  onClose: () => void
  onCopied: (toDate: string, copied: number, skipped: number) => void
}

// Fase 121 — "Copiar a otra fecha" (pedido explícito del usuario): un
// cliente que va todos los viernes obligaba a re-cargarlo a mano cada
// semana. Se eligió esto en vez de un motor de recurrencia — más simple,
// el admin decide cuándo copiar, nunca automático. A diferencia del <select>
// de 5 días de AddDayStopModal (limitado a la semana actual), acá el
// destino es un <input type="date"> libre — el caso de uso real es
// justamente una fecha de OTRA semana (ej. "el viernes que viene").
export default function CopyDayModal({ fromDate, fromLabel, stopsCount, onClose, onCopied }: Props) {
  const { t } = useLang()
  const [toDate, setToDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleCopy() {
    if (!toDate) return
    setError('')
    setSaving(true)
    try {
      const res = await apiFetch(`${API}/api/routes/day-stops/copy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from_date: fromDate, to_date: toDate }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`)
      onCopied(toDate, data.copied ?? 0, data.skipped ?? 0)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error copying')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[rgba(0,51,50,.5)]" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-lg bg-white shadow-2xl">
        <div className="px-6 pt-6 pb-2">
          <h2 className="text-lg font-extrabold text-[var(--ec-ink)]">{t('routes_copyTitle')}</h2>
          <p className="mt-1 text-sm text-[var(--ec-muted)]">
            {t('routes_copyBody').replace('{count}', String(stopsCount)).replace('{from}', fromLabel)}
          </p>
        </div>
        <div className="px-6 py-3">
          <label className="mb-1.5 block text-[11.5px] font-bold uppercase tracking-[.09em] text-[var(--ec-faint)]">
            {t('routes_copyToDate')}
          </label>
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
            min={fromDate}
            className="w-full rounded border border-[var(--ec-border-strong)] bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-50" />
        </div>
        {error && (
          <div className="mx-6 mb-2 rounded bg-[var(--ec-danger-bg)] px-4 py-2.5 text-sm text-[var(--ec-danger)]">{error}</div>
        )}
        <div className="flex justify-end gap-2 border-t border-[var(--ec-border)] bg-[var(--ec-surface-alt)] px-6 py-4">
          <button onClick={onClose}
            className="rounded border border-[var(--ec-border-strong)] bg-white px-4 py-2.5 text-sm font-bold text-[var(--ec-ink)] hover:bg-[var(--ec-surface-alt)] transition">
            {t('common_cancel')}
          </button>
          <button onClick={handleCopy} disabled={!toDate || saving}
            className="rounded bg-primary px-4 py-2.5 text-sm font-extrabold text-white hover:bg-primary-dark active:scale-[0.98] transition disabled:opacity-60">
            {saving ? t('common_saving') : t('routes_copyConfirm')}
          </button>
        </div>
      </div>
    </div>
  )
}
