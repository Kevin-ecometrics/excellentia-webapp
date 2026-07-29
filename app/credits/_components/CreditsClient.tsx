'use client'

import { useState, useMemo } from 'react'
import type { CreditRow, CreditsSummary } from '../page'
import { useLang } from '@/app/_components/LangProvider'

interface Props {
  credits: CreditRow[]
  summary: CreditsSummary
  fetchError: string
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}
function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('en-US', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
    })
  } catch { return '' }
}

export default function CreditsClient({ credits, summary, fetchError }: Props) {
  const { t } = useLang()
  const [search, setSearch] = useState('')

  const filtered = useMemo(() =>
    credits.filter(c => (c.customer_name ?? '').toLowerCase().includes(search.toLowerCase())),
    [credits, search]
  )

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">{t('crd_title')}</h1>
        <p className="mt-0.5 text-sm text-slate-500">{summary.count} {t('crd_subtitle')}</p>
      </div>

      {fetchError && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{fetchError}</div>
      )}

      {/* KPIs */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-red-100 bg-red-50 p-4 shadow-sm">
          <p className="text-xs font-medium text-red-600">{t('crd_totalIssued')}</p>
          <p className="mt-1 text-2xl font-bold text-red-700">{fmt(summary.totalAmount)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500">{t('crd_count')}</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900">{summary.count}</p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4 relative">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder={t('crd_search')}
          className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-8 pr-4 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-blue-100"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{t('crd_colDate')}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{t('crd_colCustomer')}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{t('crd_colOrder')}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{t('crd_colInvoice')}</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">{t('crd_colAmount')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(c => (
              <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 text-slate-500 text-xs">{fmtDate(c.created_at)}</td>
                <td className="px-4 py-3 font-medium text-zinc-900">
                  {c.customer_name ?? <span className="text-slate-400 italic">{t('crd_noCustomer')}</span>}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-slate-500">#{c.batch_id.slice(-8).toUpperCase()}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-500">
                  {c.invoice_id ? `#${c.invoice_id}` : <span className="text-slate-300 italic">{t('crd_noInvoice')}</span>}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-red-600">{fmt(-c.amount)}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-sm text-slate-400">
                  {search ? `${t('crd_noResults')} "${search}"` : t('crd_empty')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
