'use client'

import { useState } from 'react'
import type { Product } from '../page'
import { apiFetch } from '@/app/lib/auth'
import { useLang } from '@/app/_components/LangProvider'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

interface Props {
  product: Product
  onClose: () => void
  onSaved: () => void
}

// Backlog cliente (2026-09-28) — rol almacenista puede asignar/corregir el
// barcode de un producto (ej. uno recién importado de QBO sin barcode
// todavía) sin abrirle el resto del catálogo (precio/stock/sku), que sigue
// admin-only via ProductModal. Pega contra el endpoint angosto
// PATCH /api/products/:id/barcode (warehouseOnly), no PUT /api/products/:id.
export default function BarcodeModal({ product, onClose, onSaved }: Props) {
  const { t } = useLang()
  const [barcode, setBarcode] = useState(product.barcode ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const res = await apiFetch(`${API}/api/products/${product.id}/barcode`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barcode: barcode.trim() || null }),
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

      <div className="relative z-10 w-full max-w-sm rounded-lg bg-[#f9efe8] p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-[var(--ec-ink)]">{t('modal_editBarcode')}</h2>
          <button onClick={onClose} className="rounded p-1.5 text-[var(--ec-faint)] hover:bg-white hover:text-[var(--ec-ink)] transition">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <p className="mb-4 text-sm font-semibold text-[var(--ec-ink)]">{product.name}</p>

        {error && (
          <div className="mb-4 rounded bg-[var(--ec-danger-bg)] px-4 py-2.5 text-sm text-[var(--ec-danger)]">{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          <label className="mb-1.5 block text-[11.5px] font-bold uppercase tracking-[.09em] text-[#5A5049]">{t('modal_barcode')}</label>
          <input
            type="text"
            value={barcode}
            onChange={e => setBarcode(e.target.value)}
            placeholder={t('modal_barcodePh')}
            autoFocus
            className="w-full rounded border border-[var(--ec-border-strong)] bg-white px-3 py-2.5 text-sm font-mono focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-50"
          />

          <div className="mt-6 flex justify-end gap-2">
            <button type="button" onClick={onClose}
              className="rounded border border-[var(--ec-border-strong)] bg-white px-4 py-2.5 text-sm font-bold text-[var(--ec-ink)] hover:bg-[var(--ec-surface-alt)] transition">
              {t('common_cancel')}
            </button>
            <button type="submit" disabled={saving}
              className="rounded bg-primary px-4 py-2.5 text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-60">
              {saving ? t('common_saving') : t('modal_saveChanges')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
