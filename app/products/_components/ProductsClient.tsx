'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { Product } from '../page'
import ProductRow from './ProductRow'
import ProductModal from './ProductModal'
import { getToken } from '@/app/lib/auth'
import { useLang } from '@/app/_components/LangProvider'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

interface Props {
  products: Product[]
  fetchError: string
  isAdmin: boolean
}

export default function ProductsClient({ products, fetchError, isAdmin }: Props) {
  const router = useRouter()
  const { t } = useLang()
  const [search, setSearch] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const [editProduct, setEditProduct] = useState<Product | null>(null)

  const filtered = useMemo(() =>
    products.filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.barcode ?? '').toLowerCase().includes(search.toLowerCase())
    ),
    [products, search]
  )

  const stats = useMemo(() => ({
    total: products.length,
    withQb: products.filter(p => p.qb_item_id).length,
    withBarcode: products.filter(p => p.barcode).length,
    lowStock: products.filter(p => p.stock === 0).length,
  }), [products])

  async function handleSync() {
    setSyncing(true)
    setSyncMsg(null)
    try {
      const token = getToken()
      const res = await fetch(`${API}/api/qb/sync-products`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.status === 401) { document.cookie = 'jwt=; path=/; max-age=0'; window.location.href = '/login'; return }
      if (!res.ok) throw new Error(`Error ${res.status}`)
      setSyncMsg({ text: t('prod_syncDone'), ok: true })
      router.refresh()
    } catch (e) {
      setSyncMsg({ text: e instanceof Error ? e.message : t('prod_syncError'), ok: false })
    } finally {
      setSyncing(false)
      setTimeout(() => setSyncMsg(null), 4000)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">{t('prod_title')}</h1>
          <p className="mt-0.5 text-sm text-slate-500">{stats.total} {t('prod_total')}</p>
        </div>
        {isAdmin && (
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 shadow-sm hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98] transition disabled:opacity-60"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={syncing ? 'animate-spin' : ''}>
              <path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            {syncing ? t('prod_syncing') : t('prod_syncQb')}
          </button>
        )}
      </div>

      {/* Alerts */}
      {syncMsg && (
        <div className={`mb-4 rounded-lg px-4 py-3 text-sm font-medium ${syncMsg.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {syncMsg.text}
        </div>
      )}
      {fetchError && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{fetchError}</div>
      )}

      {/* Stats */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: t('prod_statTotal'),   value: stats.total,     cls: 'bg-primary-50 text-primary' },
          { label: t('prod_statSyncQb'),  value: stats.withQb,    cls: 'bg-green-50 text-green-700' },
          { label: t('prod_statCode'),    value: stats.withBarcode, cls: 'bg-white text-zinc-900' },
          { label: t('prod_statNoStock'), value: stats.lowStock,  cls: stats.lowStock > 0 ? 'bg-red-50 text-red-600' : 'bg-white text-zinc-900' },
        ].map(s => (
          <div key={s.label} className={`${s.cls} rounded-xl border border-slate-200 p-4`}>
            <p className="text-xs font-medium text-slate-500">{s.label}</p>
            <p className="mt-1 text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="mb-4 relative">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('prod_search')}
          className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-4 text-sm shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-blue-100"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-zinc-700">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-300 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{t('prod_colProduct')}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{t('prod_colPrice')}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{t('prod_colBarcode')}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{t('prod_colMinPrice')}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{t('prod_colWeight')}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{t('prod_colStock')}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{t('prod_colQb')}</th>
              {isAdmin && <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(p => (
              <ProductRow key={p.id} product={p} isAdmin={isAdmin} onEdit={setEditProduct} />
            ))}
              {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-400">
                  {search
                    ? `${t('prod_noResults')} "${search}"`
                    : t('prod_empty')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {filtered.length > 0 && (
        <p className="mt-3 text-xs text-slate-400 text-right">
          {t('prod_showing').replace('{n}', String(filtered.length)).replace('{total}', String(products.length))}
        </p>
      )}

      {editProduct && (
        <ProductModal
          product={editProduct}
          onClose={() => setEditProduct(null)}
          onSaved={() => { setEditProduct(null); router.refresh() }}
        />
      )}

    </div>
  )
}
