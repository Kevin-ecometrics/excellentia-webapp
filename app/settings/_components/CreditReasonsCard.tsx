'use client'

import { useEffect, useState } from 'react'
import { apiFetch, logout } from '@/app/lib/auth'
import { useLang } from '@/app/_components/LangProvider'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
const LABEL_MAX = 100

interface CreditReason {
  id: number
  label: string
  is_active: boolean
  sort_order: number
}

// Catálogo de motivos de crédito (admin) — GET/POST/PUT /api/credits/reasons.
// Un motivo nunca se borra, solo se desactiva: los créditos ya registrados
// guardan su propio texto, así que renombrar/desactivar no cambia el historial.
export default function CreditReasonsCard({ onFlash }: { onFlash: (text: string, ok: boolean) => void }) {
  const { t } = useLang()
  const [reasons,   setReasons]   = useState<CreditReason[]>([])
  const [loading,   setLoading]   = useState(true)
  const [loadError, setLoadError] = useState('')
  const [newLabel,  setNewLabel]  = useState('')
  const [busy,      setBusy]      = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editLabel, setEditLabel] = useState('')

  useEffect(() => {
    apiFetch(`${API}/api/credits/reasons?all=1`)
      .then(res => {
        if (res.status === 401) { logout(); return null }
        if (!res.ok) throw new Error(`Error ${res.status}`)
        return res.json()
      })
      .then(data => { if (data) setReasons(data.data) })
      .catch(e => setLoadError(e instanceof Error ? e.message : 'Error'))
      .finally(() => setLoading(false))
  }, [])

  async function send(path: string, method: string, body: unknown) {
    const res = await apiFetch(`${API}/api/credits/reasons${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.status === 401) { logout(); return null }
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`)
    return data.data
  }

  async function run(action: () => Promise<void>) {
    setBusy(true)
    try {
      await action()
    } catch (e) {
      onFlash(e instanceof Error ? e.message : 'Error', false)
    } finally {
      setBusy(false)
    }
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newLabel.trim()) return
    run(async () => {
      const created = await send('', 'POST', { label: newLabel })
      if (!created) return
      setReasons(prev => [...prev, created])
      setNewLabel('')
      onFlash(t('cfg_reasonAdded'), true)
    })
  }

  function handleRename(id: number) {
    if (!editLabel.trim()) return
    run(async () => {
      const updated = await send(`/${id}`, 'PUT', { label: editLabel })
      if (!updated) return
      setReasons(prev => prev.map(r => r.id === id ? updated : r))
      setEditingId(null)
      onFlash(t('cfg_reasonSaved'), true)
    })
  }

  function handleToggle(reason: CreditReason) {
    run(async () => {
      const updated = await send(`/${reason.id}`, 'PUT', { is_active: !reason.is_active })
      if (!updated) return
      setReasons(prev => prev.map(r => r.id === reason.id ? updated : r))
    })
  }

  function handleMove(index: number, delta: -1 | 1) {
    const target = index + delta
    if (target < 0 || target >= reasons.length) return
    const next = [...reasons]
    ;[next[index], next[target]] = [next[target], next[index]]
    run(async () => {
      const updated = await send('/order', 'PUT', { ids: next.map(r => r.id) })
      if (updated) setReasons(updated)
    })
  }

  const activeCount = reasons.filter(r => r.is_active).length

  return (
    <div className="mt-[18px] rounded-md border border-[var(--ec-border)] bg-white p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded bg-[var(--ec-info-bg)]">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--ec-info-ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="8" y1="6" x2="21" y2="6"/>
            <line x1="8" y1="12" x2="21" y2="12"/>
            <line x1="8" y1="18" x2="21" y2="18"/>
            <line x1="3" y1="6" x2="3.01" y2="6"/>
            <line x1="3" y1="12" x2="3.01" y2="12"/>
            <line x1="3" y1="18" x2="3.01" y2="18"/>
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[14.5px] font-extrabold text-[var(--ec-ink)]">{t('cfg_reasonsTitle')}</p>
          <p className="mt-0.5 text-xs text-[var(--ec-muted)]">{t('cfg_reasonsNote')}</p>

          {loadError && (
            <div className="mt-4 rounded bg-[var(--ec-danger-bg)] px-4 py-3 text-sm text-[var(--ec-danger)]">{loadError}</div>
          )}

          <div className="mt-4 overflow-hidden rounded border border-[var(--ec-border)]">
            {loading ? (
              <p className="px-4 py-3 text-sm text-[var(--ec-faint)]">{t('cfg_reasonsLoading')}</p>
            ) : reasons.length === 0 ? (
              <p className="px-4 py-3 text-sm text-[var(--ec-faint)]">{t('cfg_reasonsEmpty')}</p>
            ) : (
              <ul className="divide-y divide-[var(--ec-border)]">
                {reasons.map((reason, index) => (
                  <li key={reason.id} className={`flex flex-wrap items-center gap-3 px-4 py-2.5 ${reason.is_active ? '' : 'bg-[var(--ec-surface-alt)]'}`}>
                    <div className="flex flex-col">
                      <button type="button" disabled={busy || index === 0} onClick={() => handleMove(index, -1)}
                        title={t('cfg_reasonUp')}
                        className="px-1 text-[var(--ec-faint)] hover:text-[var(--ec-ink)] disabled:opacity-30 disabled:cursor-not-allowed">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
                      </button>
                      <button type="button" disabled={busy || index === reasons.length - 1} onClick={() => handleMove(index, 1)}
                        title={t('cfg_reasonDown')}
                        className="px-1 text-[var(--ec-faint)] hover:text-[var(--ec-ink)] disabled:opacity-30 disabled:cursor-not-allowed">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                      </button>
                    </div>

                    {editingId === reason.id ? (
                      <form className="flex min-w-0 flex-1 items-center gap-2" onSubmit={e => { e.preventDefault(); handleRename(reason.id) }}>
                        <input autoFocus type="text" value={editLabel} maxLength={LABEL_MAX}
                          onChange={e => setEditLabel(e.target.value)}
                          className="min-w-0 flex-1 rounded border border-[var(--ec-border-strong)] bg-white px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-50"
                        />
                        <button type="submit" disabled={busy || !editLabel.trim()}
                          className="rounded bg-primary px-3 py-1.5 text-xs font-extrabold text-white hover:bg-primary-dark transition disabled:opacity-50">
                          {t('cfg_reasonSave')}
                        </button>
                        <button type="button" disabled={busy} onClick={() => setEditingId(null)}
                          className="rounded border border-[var(--ec-border-strong)] bg-white px-3 py-1.5 text-xs font-bold text-[var(--ec-ink)] hover:bg-[var(--ec-surface-alt)] transition">
                          {t('cfg_reasonCancel')}
                        </button>
                      </form>
                    ) : (
                      <>
                        <span className={`min-w-0 flex-1 text-sm ${reason.is_active ? 'text-[var(--ec-ink)]' : 'text-[var(--ec-faint)] line-through'}`}>
                          {reason.label}
                        </span>
                        {!reason.is_active && (
                          <span className="rounded bg-[var(--ec-warn-bg)] px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-[var(--ec-warn-ink)]">
                            {t('cfg_reasonInactive')}
                          </span>
                        )}
                        <button type="button" disabled={busy}
                          onClick={() => { setEditingId(reason.id); setEditLabel(reason.label) }}
                          className="text-xs font-bold text-primary hover:underline disabled:opacity-50">
                          {t('cfg_reasonRename')}
                        </button>
                        <button type="button" disabled={busy} onClick={() => handleToggle(reason)}
                          className={`text-xs font-bold hover:underline disabled:opacity-50 ${reason.is_active ? 'text-[var(--ec-danger)]' : 'text-[var(--ec-success)]'}`}>
                          {reason.is_active ? t('cfg_reasonDeactivate') : t('cfg_reasonActivate')}
                        </button>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {!loading && reasons.length > 0 && (
            <p className="mt-2 text-xs text-[var(--ec-faint)]">
              {activeCount} {t('cfg_reasonsActiveCount')}
            </p>
          )}

          <form onSubmit={handleAdd} className="mt-4 flex flex-wrap items-end gap-3">
            <div className="min-w-0 flex-1">
              <label className="mb-1.5 block text-[11.5px] font-bold tracking-[.09em] text-[#5A5049]">{t('cfg_reasonNewLabel')}</label>
              <input type="text" value={newLabel} maxLength={LABEL_MAX}
                onChange={e => setNewLabel(e.target.value)}
                placeholder={t('cfg_reasonPlaceholder')}
                className="w-full rounded border border-[var(--ec-border-strong)] bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-50"
              />
            </div>
            <button type="submit" disabled={busy || !newLabel.trim()}
              className="rounded bg-primary px-5 py-2.5 text-sm font-extrabold text-white hover:bg-primary-dark active:scale-[0.98] transition disabled:opacity-50 disabled:cursor-not-allowed">
              {t('cfg_reasonAdd')}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
