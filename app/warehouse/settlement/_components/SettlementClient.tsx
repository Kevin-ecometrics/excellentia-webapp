'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { apiFetch, logout } from '@/app/lib/auth'
import { useLang } from '@/app/_components/LangProvider'
import ConfirmModal from '@/app/warehouse/_components/ConfirmModal'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

interface SettlementLine {
  id: number
  product_id: number
  net_quantity: number
  stock_before: number
  stock_after: number
  qbo_synced: number
  qbo_error: string | null
  product_name: string | null
  sku: string | null
}

interface Settlement {
  id: number
  warehouse_id: number
  settlement_date: string
  status: 'DRAFT' | 'CONFIRMED'
  confirmed_at: string | null
  lines: SettlementLine[]
}

interface UnreviewedRoute {
  id: number
  name: string
}

export default function SettlementClient() {
  const { t } = useLang()
  const [settlement, setSettlement] = useState<Settlement | null>(null)
  const [loading, setLoading] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const [unreviewedRoutes, setUnreviewedRoutes] = useState<UnreviewedRoute[]>([])

  // Aviso proactivo (2026-08-31): antes de generar/confirmar, avisar si hay
  // rutas COMPLETED cuyas devoluciones el almacén todavía no revisó — si se
  // liquida antes de eso, lo que vuelva después queda pendiente recién para
  // la próxima liquidación (no se pierde, pero el stock de QBO de hoy queda
  // incompleto). No bloquea — es una advertencia, el admin sigue al mando.
  useEffect(() => {
    apiFetch(`${API}/api/routes?status=COMPLETED`)
      .then(res => res.ok ? res.json() : { data: [] })
      .then(data => {
        const pending = (data.data ?? []).filter((r: any) => !r.returns_reviewed_at)
        setUnreviewedRoutes(pending.map((r: any) => ({ id: r.id, name: r.name })))
      })
      .catch(() => {})
  }, [])

  function flash(text: string, ok: boolean) {
    setMsg({ text, ok })
    setTimeout(() => setMsg(null), 5000)
  }

  function generate() {
    setLoading(true)
    const today = new Date().toISOString().slice(0, 10)
    apiFetch(`${API}/api/warehouse/settlements/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: today }),
    })
      .then(res => {
        if (res.status === 401) { logout(); return null }
        if (!res.ok) throw new Error(`Error ${res.status}`)
        return res.json()
      })
      .then(data => { if (data) setSettlement(data.data) })
      .catch(() => flash(t('wst_generateFailed'), false))
      .finally(() => setLoading(false))
  }

  function confirm() {
    if (!settlement) return
    setConfirming(true)
    apiFetch(`${API}/api/warehouse/settlements/${settlement.id}/confirm`, { method: 'POST' })
      .then(res => {
        if (res.status === 401) { logout(); return null }
        if (!res.ok) throw new Error(`Error ${res.status}`)
        return res.json()
      })
      .then(data => {
        if (!data) return
        setSettlement(prev => prev ? { ...prev, status: 'CONFIRMED', lines: data.lines ?? prev.lines } : prev)
        flash(t('wst_confirmed'), true)
      })
      .catch(() => flash(t('wst_confirmFailed'), false))
      .finally(() => { setConfirming(false); setShowConfirmModal(false) })
  }

  const lines = settlement?.lines ?? []
  const isConfirmed = settlement?.status === 'CONFIRMED'
  // Solo se marca "falló" contra una liquidación ya CONFIRMED de verdad — un
  // DRAFT recién generado trae qbo_synced=0 por default en toda línea, sin
  // que eso signifique que algo falló (mismo bug ya corregido en Android).
  const hasFailedLines = isConfirmed && lines.some(l => !l.qbo_synced)

  return (
    <>
      {showConfirmModal && (
        <ConfirmModal
          title={t('wst_confirmModalTitle')}
          body={t('wst_confirmModalBody')}
          confirming={confirming}
          onConfirm={confirm}
          onCancel={() => setShowConfirmModal(false)}
        />
      )}

      <div>
        <Link href="/warehouse" className="text-sm font-semibold text-[var(--ec-muted)] hover:text-[var(--ec-ink)]">
          {t('wst_backToWarehouse')}
        </Link>

        <div className="mt-3 mb-6">
          <h1 className="text-[26px] sm:text-[31px] font-extrabold tracking-[-.028em] text-[var(--ec-ink)]">{t('wst_title')}</h1>
          <p className="mt-1.5 max-w-2xl text-sm text-[var(--ec-muted)]">{t('wst_hint')}</p>
        </div>

        {msg && (
          <div className={`mb-4 rounded px-4 py-3 text-sm font-medium ${msg.ok ? 'bg-[var(--ec-success-bg)] text-[var(--ec-success-ink)]' : 'bg-[var(--ec-danger-bg)] text-[var(--ec-danger)]'}`}>
            {msg.text}
          </div>
        )}

        {unreviewedRoutes.length > 0 && (
          <div className="mb-4 rounded border border-[var(--ec-warn-border)] bg-[var(--ec-warn-bg)] px-4 py-3 text-sm text-[var(--ec-warn-ink)]">
            <p className="font-bold">{t('wst_unreviewedWarningTitle')}</p>
            <p className="mt-1">{t('wst_unreviewedWarningBody')}</p>
            <ul className="mt-2 list-disc pl-5">
              {unreviewedRoutes.map(r => <li key={r.id}>{r.name}</li>)}
            </ul>
            <Link href="/warehouse" className="mt-2 inline-block font-bold underline">
              {t('wst_backToWarehouse')}
            </Link>
          </div>
        )}

        <button onClick={generate} disabled={loading}
          className="mb-6 rounded bg-primary px-5 py-2.5 text-sm font-extrabold text-white hover:bg-primary-dark active:scale-[0.98] transition disabled:opacity-60">
          {loading ? '…' : t('wst_generate')}
        </button>

        {settlement && (
          <>
            <div className="mb-4 flex items-center gap-3">
              <span className={`inline-block rounded px-2 py-0.5 text-[9.5px] font-extrabold tracking-[.1em] uppercase ${isConfirmed ? 'bg-[var(--ec-success-bg)] text-[var(--ec-success-ink)]' : 'bg-[var(--ec-surface-alt)] text-[var(--ec-muted)]'}`}>
                {isConfirmed ? t('wst_statusConfirmed') : t('wst_statusDraft')}
              </span>
              <span className="text-xs text-[var(--ec-faint)]">{settlement.settlement_date?.slice(0, 10)}</span>
            </div>

            {lines.length === 0 ? (
              <div className="rounded-md border border-[var(--ec-border)] bg-white px-4 py-12 text-center text-sm text-[var(--ec-faint)]">
                {t('wst_noLines')}
              </div>
            ) : (
              <div className="space-y-2">
                {lines.map(line => {
                  const failed = isConfirmed && !line.qbo_synced
                  return (
                    <div key={line.product_id} className="flex items-center gap-3 rounded-md border border-[var(--ec-border)] bg-white px-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[var(--ec-ink)]">{line.product_name ?? line.sku ?? `#${line.product_id}`}</p>
                        <p className={`text-xs ${failed ? 'font-semibold text-[var(--ec-danger)]' : 'text-[var(--ec-faint)]'}`}>
                          {t('wst_net')} {line.net_quantity > 0 ? '+' : ''}{line.net_quantity} · {t('wst_stockChange')} {line.stock_before} → {line.stock_after}
                          {failed && ` · ${t('wst_syncFailed')}`}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {lines.length > 0 && (!isConfirmed || hasFailedLines) && (
              <button onClick={() => setShowConfirmModal(true)}
                className="mt-6 w-full rounded bg-primary px-5 py-3 text-sm font-extrabold text-white hover:bg-primary-dark active:scale-[0.98] transition">
                {t('wst_confirm')}
              </button>
            )}
          </>
        )}
      </div>
    </>
  )
}
