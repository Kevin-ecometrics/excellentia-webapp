'use client'

import { useState, useMemo } from 'react'
import type { CustomerStat } from '../page'
import { useLang } from '@/app/_components/LangProvider'

interface Props {
  customers: CustomerStat[]
  fetchError: string
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}
function fmtDate(iso: string) {
  try { return new Date(iso).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) }
  catch { return '' }
}

export default function CustomersClient({ customers, fetchError }: Props) {
  const { t } = useLang()
  const [search, setSearch] = useState('')

  const filtered = useMemo(() =>
    customers.filter(c => c.customer_name.toLowerCase().includes(search.toLowerCase())),
    [customers, search]
  )

  const totalSpentAll  = customers.reduce((s, c) => s + Number(c.total_spent), 0)
  const totalBatchAll  = customers.reduce((s, c) => s + Number(c.batch_count), 0)

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">{t('cust_title')}</h1>
        <p className="mt-0.5 text-sm text-slate-500">{customers.length} {t('cust_subtitle')}</p>
      </div>

      {fetchError && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{fetchError}</div>
      )}

      {/* KPIs */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500">{t('cust_active')}</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900">{customers.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-green-50 p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500">{t('cust_billed')}</p>
          <p className="mt-1 text-2xl font-bold text-green-700">{fmt(totalSpentAll)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500">{t('cust_orders')}</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900">{totalBatchAll}</p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4 relative">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder={t('cust_search')}
          className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-8 pr-4 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-blue-100"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{t('cust_colCustomer')}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{t('cust_colQbId')}</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">{t('cust_colOrders')}</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">{t('cust_colBilled')}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{t('cust_colLast')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((c, i) => (
              <tr key={c.customer_id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-50 text-xs font-bold text-primary uppercase">
                      {c.customer_name[0]}
                    </div>
                    <div>
                      <p className="font-medium text-zinc-900">{c.customer_name}</p>
                      {i === 0 && (
                        <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-px rounded-full">{t('cust_topCustomer')}</span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-slate-400">#{c.customer_id}</td>
                <td className="px-4 py-3 text-right font-medium text-zinc-800">{c.batch_count}</td>
                <td className="px-4 py-3 text-right font-semibold text-zinc-900">{fmt(Number(c.total_spent))}</td>
                <td className="px-4 py-3 text-slate-500 text-xs">{fmtDate(c.last_order_at)}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-sm text-slate-400">
                  {search ? `${t('cust_noResults')} "${search}"` : t('cust_empty')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {filtered.length > 0 && (
        <p className="mt-3 text-xs text-slate-400 text-right">
          {t('cust_showing').replace('{n}', String(filtered.length)).replace('{total}', String(customers.length))}
        </p>
      )}
    </div>
  )
}
