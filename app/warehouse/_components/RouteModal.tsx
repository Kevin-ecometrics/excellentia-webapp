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
  route: RouteRow | null
  drivers: Driver[]
  onClose: () => void
  onSaved: () => void
}

export default function RouteModal({ route, drivers, onClose, onSaved }: Props) {
  const { t } = useLang()
  const isEdit = !!route

  const [form, setForm] = useState({
    name: route?.name ?? '',
    scheduled_date: route?.scheduled_date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
    driver_user_id: route?.driver_user_id?.toString() ?? '',
    notes: route?.notes ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (route) {
      setForm({
        name: route.name,
        scheduled_date: route.scheduled_date.slice(0, 10),
        driver_user_id: route.driver_user_id?.toString() ?? '',
        notes: route.notes ?? '',
      })
    }
  }, [route])

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
    if (fieldErrors[field]) setFieldErrors(prev => ({ ...prev, [field]: '' }))
  }

  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (!form.name.trim() || form.name.trim().length < 2) errs.name = t('val_min2')
    if (!form.scheduled_date) errs.scheduled_date = t('val_invalidVal')
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!validate()) return

    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        scheduled_date: form.scheduled_date,
        driver_user_id: form.driver_user_id ? Number(form.driver_user_id) : null,
        notes: form.notes.trim() || null,
      }

      const url = isEdit ? `${API}/api/routes/${route!.id}` : `${API}/api/routes`
      const res = await apiFetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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
          <h2 className="text-lg font-extrabold text-[var(--ec-ink)]">
            {isEdit ? t('wh_editRoute') : t('wh_createRoute')}
          </h2>
          <button onClick={onClose} className="rounded p-1.5 text-[var(--ec-faint)] hover:bg-white hover:text-[var(--ec-ink)] transition">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded bg-[var(--ec-danger-bg)] px-4 py-2.5 text-sm text-[var(--ec-danger)]">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[11.5px] font-bold uppercase tracking-[.09em] text-[#5A5049]">{t('wh_name')}</label>
            <input type="text" value={form.name} onChange={e => set('name', e.target.value)}
              className={fieldErrors.name ? inpErr : inp} placeholder="Zona Norte" />
            {fieldErrors.name && <p className="mt-1 text-xs text-[var(--ec-danger)]">{fieldErrors.name}</p>}
          </div>

          <div>
            <label className="mb-1.5 block text-[11.5px] font-bold uppercase tracking-[.09em] text-[#5A5049]">{t('wh_date')}</label>
            <input type="date" value={form.scheduled_date} onChange={e => set('scheduled_date', e.target.value)}
              className={fieldErrors.scheduled_date ? inpErr : inp} />
            {fieldErrors.scheduled_date && <p className="mt-1 text-xs text-[var(--ec-danger)]">{fieldErrors.scheduled_date}</p>}
          </div>

          <div>
            <label className="mb-1.5 block text-[11.5px] font-bold uppercase tracking-[.09em] text-[#5A5049]">{t('wh_driver')}</label>
            <select value={form.driver_user_id} onChange={e => set('driver_user_id', e.target.value)}
              className={inp}>
              <option value="">{t('wh_selectDriver')}</option>
              {drivers.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-[11.5px] font-bold uppercase tracking-[.09em] text-[#5A5049]">{t('wh_notes')}</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
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
const inpErr = 'w-full rounded border border-[var(--ec-danger)]/50 bg-[var(--ec-danger-bg)] px-3 py-2 text-sm transition focus:border-[var(--ec-danger)] focus:outline-none focus:ring-2 focus:ring-[var(--ec-danger)]/20'
