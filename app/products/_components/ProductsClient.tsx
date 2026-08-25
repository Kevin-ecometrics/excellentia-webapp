'use client'

import { useState, useEffect, useMemo } from 'react'
import type { Product } from '../page'
import ProductRow from './ProductRow'
import ProductModal from './ProductModal'
import PricingInfoModal from './PricingInfoModal'
import { getUserInfo, apiFetch, logout } from '@/app/lib/auth'
import { useLang } from '@/app/_components/LangProvider'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

interface Meta { page: number; limit: number; total: number; totalPages: number }

export default function ProductsClient() {
  const { t } = useLang()
  const [products, setProducts] = useState<Product[]>([])
  const [meta, setMeta] = useState<Meta>({ page: 1, limit: 10, total: 0, totalPages: 0 })
  const [fetchError, setFetchError] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [ready, setReady] = useState(false)
  const [search, setSearch] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [isInvoice, setIsInvoice] = useState(false)
  const [qtyMap, setQtyMap] = useState<Record<number, number>>({})
  const [rateMap, setRateMap] = useState<Record<number, number>>({})
  const [showPricingInfo, setShowPricingInfo] = useState(false)

  useEffect(() => {
    const user = getUserInfo()
    setIsAdmin(user?.role === 'admin')
  }, [])

  async function loadProducts() {
    try {
      const params = new URLSearchParams()
      params.set('page', String(meta.page))
      params.set('limit', String(meta.limit))
      params.set('sort', 'sku')
      if (search) params.set('search', search)

      const res = await apiFetch(`${API}/api/products?${params}`)
      if (res.status === 401) { logout(); return }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Error al cargar productos')
      }
      const data = await res.json()
      const m = data.meta ?? {}
      setProducts(data.data ?? [])
      setMeta({
        page: m.page || 1,
        limit: m.limit || 10,
        total: m.total || 0,
        totalPages: m.totalPages || Math.ceil((m.total || 0) / (m.limit || 10)),
      })
      setFetchError('')
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : 'Could not connect to the server')
    }
  }

  useEffect(() => {
    if (ready) loadProducts()
  }, [meta.page, meta.limit, search])

  useEffect(() => {
    loadProducts().finally(() => setReady(true))
  }, [])

  useEffect(() => {
    setRateMap(prev => {
      const next = { ...prev }
      for (const p of products) {
        if (!(p.id in next)) {
          next[p.id] = p.price
        }
      }
      return next
    })
  }, [products])

  function handleQtyChange(id: number, qty: number) {
    setQtyMap(prev => ({ ...prev, [id]: qty }))
  }

  function handleRateChange(id: number, rate: number) {
    setRateMap(prev => ({ ...prev, [id]: rate }))
  }

  function toggleInvoiceMode() {
    if (isInvoice) {
      setIsInvoice(false)
    } else {
      // Qty arranca en 0 (carrito vacío) — antes se pre-llenaba con
      // p.qty (unidades por caja de Case/Unit, un atributo del catálogo,
      // no una cantidad a facturar) y eso hacía que TODOS los productos
      // entraran como ítems de la factura apenas se activaba el modo,
      // sin que el usuario hubiera elegido nada todavía. Price sí arranca
      // en el precio del catálogo (por caja/lb/bucket según el producto)
      // como punto de partida editable por línea de factura.
      setQtyMap({})
      setRateMap(Object.fromEntries(products.map(p => [p.id, p.price])))
      setIsInvoice(true)
    }
  }

  const invoiceItems = useMemo(() => {
    return products.filter(p => (qtyMap[p.id] || 0) > 0)
  }, [products, qtyMap])

  const invoiceItemCount = invoiceItems.length

  const invoiceTotal = useMemo(() => {
    return invoiceItems.reduce((sum, p) => sum + (qtyMap[p.id] || 0) * (rateMap[p.id] || 0), 0)
  }, [invoiceItems, qtyMap, rateMap])

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

  const thCls = 'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500'
  const colSpan = 10 + (isAdmin ? 1 : 0) + (isInvoice ? 1 : 0)

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
          <button
            onClick={toggleInvoiceMode}
            className={`flex items-center gap-1.5 rounded-lg border px-4 py-2.5 text-sm font-semibold shadow-sm transition active:scale-[0.98] ${
              isInvoice
                ? 'border-primary bg-primary text-white'
                : 'border-slate-200 bg-white text-zinc-700 hover:bg-slate-50 hover:border-slate-300'
            }`}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
            {isInvoice ? t('prod_invModeOff') : t('prod_invModeOn')}
          </button>
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

      {/* Search */}
      <div className="mb-4 flex items-center gap-2">
        <div className="relative max-w-sm flex-1">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setMeta(prev => ({ ...prev, page: 1 })) }}
            placeholder={t('prod_search')}
            className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-4 text-sm shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <button
          onClick={() => setShowPricingInfo(true)}
          title={t('prod_infoBtn')}
          aria-label={t('prod_infoBtn')}
          className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-primary"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="16" x2="12" y2="12"/>
            <line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
        </button>
      </div>

      {showPricingInfo && <PricingInfoModal onClose={() => setShowPricingInfo(false)} />}

      {/* Invoice mode indicator */}
      {isInvoice && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm text-blue-700">
          <span className="font-medium">{t('prod_invTitle')}</span>
          {invoiceItemCount > 0 && (
            <span className="font-semibold">{invoiceItemCount} {t('prod_invItems')} · ${invoiceTotal.toFixed(2)}</span>
          )}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-300 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className={thCls}>{t('prod_colProduct')}</th>
              <th className={thCls}>{t('prod_colPrice')}</th>
              <th className={thCls}>{t('prod_colSku')}</th>
              <th className={thCls}>{t('prod_colBarcode')}</th>
              <th className={thCls}>{t('prod_colMinPrice')}</th>
              <th className={thCls}>{t('prod_colWeight')}</th>
              <th className={thCls}>{t('prod_colUnit')}</th>
              <th className={thCls}>{t('prod_colQty')}</th>
              {isInvoice && <th className={thCls}>{t('prod_colAmount')}</th>}
              <th className={thCls}>{t('prod_colStock')}</th>
              <th className={thCls}>{t('prod_colQb')}</th>
              {isAdmin && <th className={`${thCls} w-12`}></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {products.map(p => (
              <ProductRow key={p.id} product={p} isAdmin={isAdmin} onEdit={setEditProduct}
                isInvoice={isInvoice}
                qty={qtyMap[p.id] ?? 0}
                rate={rateMap[p.id] ?? p.price}
                onQtyChange={handleQtyChange}
                onRateChange={handleRateChange} />
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={colSpan} className="px-4 py-12 text-center text-sm text-slate-400">
                  {search
                    ? `${t('prod_noResults')} "${search}"`
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
              {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
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