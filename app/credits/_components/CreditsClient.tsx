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
        <h1 className="text-[26px] sm:text-[31px] font-extrabold tracking-[-.028em] text-[var(--ec-ink)]">{t('crd_title')}</h1>
        <p className="mt-1.5 text-sm text-[var(--ec-muted)]">{summary.count} {t('crd_subtitle')}</p>
      </div>

      {fetchError && (
        <div className="mb-4 rounded bg-[var(--ec-danger-bg)] px-4 py-3 text-sm text-[var(--ec-danger)]">{fetchError}</div>
      )}

      {/* KPIs */}
      <div className="mb-5 grid grid-cols-2 gap-px bg-[var(--ec-border)] border border-[var(--ec-border)] rounded-md overflow-hidden">
        <div className="bg-white p-4 border-t-[3px] border-t-[var(--ec-danger)]">
          <p className="text-[10.5px] font-bold uppercase tracking-[.14em] text-[var(--ec-danger)]">{t('crd_totalIssued')}</p>
          <p className="mt-1.5 text-2xl font-extrabold tracking-[-.03em] text-[var(--ec-danger)]">{fmt(summary.totalAmount)}</p>
        </div>
        <div className="bg-white p-4">
          <p className="text-[10.5px] font-bold uppercase tracking-[.14em] text-[var(--ec-faint)]">{t('crd_count')}</p>
          <p className="mt-1.5 text-2xl font-extrabold tracking-[-.03em] text-[var(--ec-ink)]">{summary.count}</p>
        </div>
      </div>

      {/* Search */}
      <div className="mt-5 mb-4 relative max-w-sm">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ec-faint)] pointer-events-none">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder={t('crd_search')}
          className="w-full rounded border border-[var(--ec-border-strong)] bg-white py-2.5 pl-8 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-50"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-md border border-[var(--ec-border)] bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--ec-border)] bg-[var(--ec-surface-alt)]">
              <th className="px-4 py-3 text-left text-[10px] font-extrabold uppercase tracking-[.1em] text-[#7C7169]">{t('crd_colDate')}</th>
              <th className="px-4 py-3 text-left text-[10px] font-extrabold uppercase tracking-[.1em] text-[#7C7169]">{t('crd_colCustomer')}</th>
              <th className="px-4 py-3 text-left text-[10px] font-extrabold uppercase tracking-[.1em] text-[#7C7169]">{t('crd_colOrder')}</th>
              <th className="px-4 py-3 text-left text-[10px] font-extrabold uppercase tracking-[.1em] text-[#7C7169]">{t('crd_colInvoice')}</th>
              <th className="px-4 py-3 text-right text-[10px] font-extrabold uppercase tracking-[.1em] text-[#7C7169]">{t('crd_colAmount')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--ec-divider)]">
            {filtered.map(c => (
              <tr key={c.id} className="hover:bg-[var(--ec-surface-alt)]/60 transition-colors">
                <td className="px-4 py-3 font-mono text-[var(--ec-muted)] text-[10.5px]">{fmtDate(c.created_at)}</td>
                <td className="px-4 py-3 font-semibold text-[var(--ec-ink)]">
                  {c.customer_name ?? <span className="text-[var(--ec-faint)] italic font-normal">{t('crd_noCustomer')}</span>}
                </td>
                <td className="px-4 py-3 font-mono text-[11.5px] text-[var(--ec-muted)]">#{c.batch_id.slice(-8).toUpperCase()}</td>
                <td className="px-4 py-3 font-mono text-[11.5px] text-[var(--ec-muted)]">
                  {c.invoice_id ? `#${c.invoice_id}` : <span className="text-[var(--ec-faint)] italic">{t('crd_noInvoice')}</span>}
                </td>
                <td className="px-4 py-3 text-right font-mono font-bold text-[var(--ec-danger)]">{fmt(-c.amount)}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-sm text-[var(--ec-faint)]">
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
