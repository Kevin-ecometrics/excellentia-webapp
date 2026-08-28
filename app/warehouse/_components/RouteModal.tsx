'use client'

import { useState, useEffect } from 'react'
import type { RouteRow } from '../page'
import { apiFetch } from '@/app/lib/auth'
import { useLang } from '@/app/_components/LangProvider'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

interface Driver {
  id: number
  name: string
}

interface Props {
  route: RouteRow
  drivers: Driver[]
  onClose: () => void
  onSaved: () => void
}

// Solo lectura + control de emergencia (Fase Módulo Almacén — manifiesto desde
// Android): la ruta se crea y arma desde la app Android, la webapp ya no tiene
// modo de creación. Lo único que un admin puede corregir acá es a quién está
// asignada y las notas — nombre y fecha quedan como referencia, no editables.
export default function RouteModal({ route, drivers, onClose, onSaved }: Props) {
  const { t } = useLang()

  const [form, setForm] = useState({
    driver_user_id: route.driver_user_id?.toString() ?? '',
    notes: route.notes ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setForm({
      driver_user_id: route.driver_user_id?.toString() ?? '',
      notes: route.notes ?? '',
    })
  }, [route])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const res = await apiFetch(`${API}/api/routes/${route.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driver_user_id: form.driver_user_id ? Number(form.driver_user_id) : null,
          notes: form.notes.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`)
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error saving')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[rgba(0,51,50,.5)]" onClick={onClose} />

      <div className="relative z-10 w-full max-w-md rounded-lg bg-[#f9efe8] p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-[var(--ec-ink)]">{t('wh_editRoute')}</h2>
          <button onClick={onClose} className="rounded p-1.5 text-[var(--ec-faint)] hover:bg-white hover:text-[var(--ec-ink)] transition">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded bg-[var(--ec-danger-bg)] px-4 py-2.5 text-sm text-[var(--ec-danger)]">{error}</div>
        )}

        <div className="mb-4 rounded border border-[var(--ec-border)] bg-white px-3 py-2.5 text-sm">
          <p className="font-bold text-[var(--ec-ink)]">{route.name}</p>
          <p className="text-xs text-[var(--ec-faint)]">{route.scheduled_date.slice(0, 10)}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[11.5px] font-bold uppercase tracking-[.09em] text-[#5A5049]">{t('wh_driver')}</label>
            <select value={form.driver_user_id} onChange={e => setForm(prev => ({ ...prev, driver_user_id: e.target.value }))}
              className={inp}>
              <option value="">{t('wh_selectDriver')}</option>
              {drivers.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-[11.5px] font-bold uppercase tracking-[.09em] text-[#5A5049]">{t('wh_notes')}</label>
            <textarea value={form.notes} onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
              rows={2}
              className={`${inp} resize-none`} />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 rounded border border-[var(--ec-border-strong)] px-4 py-2.5 text-sm font-bold text-[var(--ec-ink)] transition hover:bg-white active:scale-[0.98]">
              {t('common_cancel')}
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 rounded bg-primary px-4 py-2.5 text-sm font-extrabold text-white transition hover:bg-primary-dark active:scale-[0.98] disabled:opacity-60">
              {saving ? t('common_saving') : t('common_save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const inp = 'w-full rounded border border-[var(--ec-border-strong)] bg-white px-3 py-2 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-50'
