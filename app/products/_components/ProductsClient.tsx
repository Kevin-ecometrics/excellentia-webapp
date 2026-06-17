'use client'

import { useState, useEffect, useMemo } from 'react'
import type { Product } from '../page'
import ProductRow from './ProductRow'
import ProductModal from './ProductModal'
import { getUserInfo, apiFetch, logout } from '@/app/lib/auth'
import { useLang } from '@/app/_components/LangProvider'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

interface Filters { search: string; category: string; qb: string; stock: string }
interface Meta { page: number; limit: number; total: number; totalPages: number }

export default function ProductsClient() {
  const { t } = useLang()
  const [products, setProducts] = useState<Product[]>([])
  const [meta, setMeta] = useState<Meta>({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [fetchError, setFetchError] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [ready, setReady] = useState(false)
  const [categories, setCategories] = useState<string[]>([])
  const [filters, setFilters] = useState<Filters>({ search: '', category: '', qb: '', stock: '' })
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)

  useEffect(() => {
    const user = getUserInfo()
    setIsAdmin(user?.role === 'admin')
  }, [])

  async function loadProducts() {
    try {
      const params = new URLSearchParams()
      params.set('page', String(meta.page))
      params.set('limit', String(meta.limit))
      if (filters.search) params.set('search', filters.search)
      if (filters.category) params.set('category', filters.category)
      if (filters.qb) params.set('qb', filters.qb)
      if (filters.stock) params.set('stock', filters.stock)

      const res = await apiFetch(`${API}/api/products?${params}`)
      if (res.status === 401) { logout(); return }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Error al cargar productos')
      }
      const data = await res.json()
      setProducts(data.data ?? [])
      setMeta(data.meta ?? { page: 1, limit: 20, total: 0, totalPages: 0 })
      setFetchError('')
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : 'Could not connect to the server')
    }
  }

  async function loadCategories() {
    try {
      const res = await apiFetch(`${API}/api/products/categories`)
      if (res.ok) {
        const data = await res.json()
        setCategories(data.data ?? [])
      }
    } catch {}
  }

  useEffect(() => {
    if (ready) loadProducts()
  }, [meta.page, meta.limit, filters])

  useEffect(() => {
    Promise.all([loadProducts(), loadCategories()]).finally(() => setReady(true))
  }, [])

  function updateFilter(key: keyof Filters, value: string) {
    setFilters(prev => ({ ...prev, [key]: value }))
    setMeta(prev => ({ ...prev, page: 1 }))
  }

  async function handleSync() {
    setSyncing(true)
    setSyncMsg(null)
    try {
      const res = await apiFetch(`${API}/api/qb/sync-products`, { method: 'POST' })
      if (res.status === 401) { logout(); return }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        console.warn('Sync QB error (non-critical):', body.error)
      }
      await loadProducts()
      setSyncMsg({ text: t('prod_syncDone'), ok: true })
    } catch (e) {
      console.warn('Sync QB exception (non-critical):', e)
      await loadProducts()
      setSyncMsg({ text: t('prod_syncDone'), ok: true })
    } finally {
      setSyncing(false)
      setTimeout(() => setSyncMsg(null), 4000)
    }
  }

  async function handleRefresh() {
    setRefreshing(true)
    await loadProducts()
    setRefreshing(false)
  }

  const stats = useMemo(() => ({
    total: meta.total,
    withQb: products.filter(p => p.qb_item_id).length,
    withBarcode: products.filter(p => p.barcode).length,
    lowStock: products.filter(p => p.stock === 0).length,
  }), [products, meta.total])

  const pageNumbers = useMemo(() => {
    const pages: number[] = []
    const total = meta.totalPages
    const current = meta.page
    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i)
    } else {
      pages.push(1)
      if (current > 3) pages.push(-1)
      const start = Math.max(2, current - 1)
      const end = Math.min(total - 1, current + 1)
      for (let i = start; i <= end; i++) pages.push(i)
      if (current < total - 2) pages.push(-1)
      pages.push(total)
    }
    return pages
  }, [meta.page, meta.totalPages])

  if (!ready) return null

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">{t('prod_title')}</h1>
          <p className="mt-0.5 text-sm text-slate-500">{t('prod_total')}: {meta.total}</p>
        </div>
        <div className="flex items-center gap-2">
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
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 shadow-sm hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98] transition disabled:opacity-60"
            title="Recargar lista"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={refreshing ? 'animate-spin' : ''}>
              <polyline points="23 4 23 10 17 10"/>
              <polyline points="1 20 1 14 7 14"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
            {refreshing ? '…' : t('common_refresh')}
          </button>
        </div>
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

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            value={filters.search}
            onChange={e => updateFilter('search', e.target.value)}
            placeholder={t('prod_search')}
            className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-4 text-sm shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
          {filters.search && (
            <button onClick={() => updateFilter('search', '')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-zinc-700">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Filter selects */}
      <div className="mb-4 flex flex-wrap gap-3">
        <select
          value={filters.category}
          onChange={e => updateFilter('category', e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-blue-100"
        >
          <option value="">{t('prod_filterCat')}</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <select
          value={filters.qb}
          onChange={e => updateFilter('qb', e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-blue-100"
        >
          <option value="">{t('prod_filterQb')}</option>
          <option value="synced">{t('prod_qbSynced')}</option>
          <option value="unsynced">{t('prod_qbUnsynced')}</option>
        </select>

        <select
          value={filters.stock}
          onChange={e => updateFilter('stock', e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-blue-100"
        >
          <option value="">{t('prod_filterStock')}</option>
          <option value="instock">{t('prod_stockIn')}</option>
          <option value="outofstock">{t('prod_stockOut')}</option>
          <option value="lowstock">{t('prod_stockLow')}</option>
        </select>
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
            {products.map(p => (
              <ProductRow key={p.id} product={p} isAdmin={isAdmin} onEdit={setEditProduct} />
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={isAdmin ? 8 : 7} className="px-4 py-12 text-center text-sm text-slate-400">
                  {filters.search
                    ? `${t('prod_noResults')} "${filters.search}"`
                    : t('prod_empty')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {meta.totalPages > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>
              {t('common_showing')} {Math.min((meta.page - 1) * meta.limit + 1, meta.total)}–{Math.min(meta.page * meta.limit, meta.total)} {t('common_of')} {meta.total}
            </span>
            <select
              value={meta.limit}
              onChange={e => setMeta(prev => ({ ...prev, limit: Number(e.target.value), page: 1 }))}
              className="ml-2 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs shadow-sm focus:outline-none"
            >
              {[20, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setMeta(prev => ({ ...prev, page: prev.page - 1 }))}
              disabled={meta.page <= 1}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 shadow-sm hover:bg-slate-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ← {t('prod_pagePrev')}
            </button>
            {pageNumbers.map((p, i) =>
              p === -1 ? (
                <span key={`e${i}`} className="px-2 text-slate-400">…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => setMeta(prev => ({ ...prev, page: p }))}
                  className={`min-w-[32px] rounded-lg border px-2.5 py-1.5 text-sm font-medium shadow-sm transition ${
                    p === meta.page
                      ? 'border-primary bg-primary text-white'
                      : 'border-slate-200 bg-white text-zinc-700 hover:bg-slate-50'
                  }`}
                >
                  {p}
                </button>
              )
            )}
            <button
              onClick={() => setMeta(prev => ({ ...prev, page: prev.page + 1 }))}
              disabled={meta.page >= meta.totalPages}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 shadow-sm hover:bg-slate-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {t('prod_pageNext')} →
            </button>
          </div>
        </div>
      )}

      {editProduct && (
        <ProductModal
          product={editProduct}
          onClose={() => setEditProduct(null)}
          onSaved={() => { setEditProduct(null); loadProducts() }}
        />
      )}
    </div>
  )
}
