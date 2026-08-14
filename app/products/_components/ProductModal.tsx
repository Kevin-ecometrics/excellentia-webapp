'use client'

import { useState, useEffect } from 'react'
import type { Product } from '../page'
import { apiFetch } from '@/app/lib/auth'
import { useLang } from '@/app/_components/LangProvider'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

interface Props {
  product: Product | null
  onClose: () => void
  onSaved: () => void
}

export default function ProductModal({ product, onClose, onSaved }: Props) {
  const { t } = useLang()
  const isEdit = !!product

  const [form, setForm] = useState({ name: '', short_name: '', price: '', min_price: '', barcode: '', unit: '', qty: '0', weight_per_unit: '', stock: '0', description: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (product) {
      // "Case" y "Unit" se fusionaron en un solo tipo, "Case/Unit" — normaliza
      // acá para que el <select> preseleccione bien productos viejos que
      // todavía tengan el valor legacy en la base (antes de correr la
      // migración de datos, o cualquier fila que se le haya escapado).
      const legacyUnit = product.unit === 'Case' || product.unit === 'Unit' ? 'Case/Unit' : product.unit
      setForm({
        name: product.name,
        short_name: product.short_name ?? '',
        price: product.price.toString(),
        min_price: product.min_price?.toString() ?? '',
        barcode: product.barcode ?? '',
        unit: legacyUnit ?? '',
        qty: product.qty?.toString() ?? '0',
        weight_per_unit: product.weight_per_unit?.toString() ?? '',
        stock: product.stock.toString(),
        description: product.description ?? '',
      })
    }
  }, [product])

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
    if (fieldErrors[field]) setFieldErrors(prev => ({ ...prev, [field]: '' }))
  }

  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (!form.name.trim() || form.name.trim().length < 2) errs.name = t('val_min2')
    const price = parseFloat(form.price)
    if (!form.price || isNaN(price) || price <= 0) errs.price = t('val_pricePos')
    const stock = parseInt(form.stock)
    if (isNaN(stock) || stock < 0) errs.stock = t('val_stockNeg')
    if (form.weight_per_unit && (isNaN(parseFloat(form.weight_per_unit)) || parseFloat(form.weight_per_unit) < 0))
      errs.weight_per_unit = t('val_invalidVal')
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
        short_name: form.short_name.trim() || null,
        price: parseFloat(form.price),
      }
      body.barcode = form.barcode.trim() || null
      body.min_price = form.min_price ? parseFloat(form.min_price) : null
      body.unit = form.unit || null
      body.qty = parseInt(form.qty) || 0
      body.weight_per_unit = form.weight_per_unit ? parseFloat(form.weight_per_unit) : null
      body.stock = parseInt(form.stock) || 0
      body.description = form.description.trim() || null

      const url = isEdit ? `${API}/api/products/${product!.id}` : `${API}/api/products`
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
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-bold text-zinc-900">
            {isEdit ? t('modal_editProd') : t('modal_newProd')}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-zinc-700 transition">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">{t('modal_name')}</label>
            <input type="text" value={form.name} onChange={e => set('name', e.target.value)}
              className={fieldErrors.name ? inpErr : inp} placeholder="e.g. Fresh Cheese" />
            {fieldErrors.name && <p className="mt-1 text-xs text-red-600">{fieldErrors.name}</p>}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">{t('modal_shortName')}</label>
            <input type="text" value={form.short_name} onChange={e => set('short_name', e.target.value)}
              className={inp} placeholder={t('modal_shortNamePh')} />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">{t('modal_salesDesc')}</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              rows={2}
              className={`${inp} resize-none`} placeholder={t('modal_salesDescPh')} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">{t('modal_price')}</label>
              <input type="number" step="0.01" min="0.01" value={form.price} onChange={e => set('price', e.target.value)}
                className={fieldErrors.price ? inpErr : inp} placeholder="0.00" />
              {fieldErrors.price && <p className="mt-1 text-xs text-red-600">{fieldErrors.price}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">{t('modal_weight')}</label>
              <input type="number" step="0.01" min="0" value={form.weight_per_unit} onChange={e => set('weight_per_unit', e.target.value)}
                className={fieldErrors.weight_per_unit ? inpErr : inp} placeholder="—" />
              {fieldErrors.weight_per_unit && <p className="mt-1 text-xs text-red-600">{fieldErrors.weight_per_unit}</p>}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">{t('modal_unit')}</label>
            <select value={form.unit} onChange={e => set('unit', e.target.value)}
              className={inp}>
              <option value="">{t('modal_unitNone')}</option>
              <option value="Lbs">Lbs</option>
              <option value="Case/Unit">Case/Unit</option>
              <option value="Bucket">Bucket</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">{t('modal_qty')}</label>
            <input type="number" step="1" min="0" value={form.qty} onChange={e => set('qty', e.target.value)}
              className={inp} placeholder="0" />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">{t('modal_barcode')}</label>
            <input type="text" value={form.barcode} onChange={e => set('barcode', e.target.value)}
              className={`${inp} font-mono`} placeholder={t('modal_barcodePh')} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">{t('modal_stock')}</label>
              <input type="number" step="1" min="0" value={form.stock} onChange={e => set('stock', e.target.value)}
                className={fieldErrors.stock ? inpErr : inp} placeholder="0" />
              {fieldErrors.stock && <p className="mt-1 text-xs text-red-600">{fieldErrors.stock}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">{t('modal_minPrice')}</label>
              <input type="number" step="0.01" min="0" value={form.min_price} onChange={e => set('min_price', e.target.value)}
                className={inp} placeholder={t('modal_minPricePh')} />
            </div>
          </div>

          {/* QB sync status */}
          {isEdit && (
            !product?.qb_item_id
              ? <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  {t('modal_qbNotLinked')}
                </div>
              : (product.qb_active === 0 || product.qb_active === false)
              ? <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  {t('modal_qbInactive')}
                </div>
              : <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-xs text-green-700">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  {t('modal_qbSynced')} {product.qb_item_id}
                </div>
          )}

          {/* QBO legend */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {t('modal_qbReqs')}
            </p>
            <ul className="space-y-1">
              {[
                { label: t('modal_reqType'),     value: t('modal_reqTypeVal') },
                { label: t('modal_reqAccounts'), value: t('modal_reqAccountsVal') },
                { label: t('modal_reqSku'),      value: t('modal_reqSkuVal') },
                { label: t('modal_reqPrice'),    value: t('modal_reqPriceVal') },
              ].map(item => (
                <li key={item.label} className="flex gap-1.5 text-[11px] text-slate-500">
                  <span className="shrink-0 font-medium text-slate-600">{item.label}:</span>
                  <span>{item.value}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-slate-50 active:scale-[0.98]">
              {t('common_cancel')}
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark active:scale-[0.98] disabled:opacity-60">
              {saving ? t('common_saving') : isEdit ? t('modal_saveChanges') : t('modal_create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const inp = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-blue-100'
const inpErr = 'w-full rounded-lg border border-red-400 bg-red-50 px-3 py-2 text-sm transition focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-100'
