'use client'

import { useState, useMemo } from 'react'
import type { CustomerStat } from '../page'
import { useLang } from '@/app/_components/LangProvider'
import { apiFetch, logout } from '@/app/lib/auth'

interface Props {
  customers: CustomerStat[]
  fetchError: string
}

interface CreditEntry {
  type: 'EARNED' | 'USED'
  reference_batch_id: string | null
  invoice_id: string | null
  amount: number
  created_at: string
}

interface CreditBalanceInfo {
  customer_id: string
  balance: number
  earned_total: number
  used_total: number
}

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}
function fmtDate(iso: string | null) {
  if (!iso) return ''
  try { return new Date(iso).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) }
  catch { return '' }
}

export default function CustomersClient({ customers, fetchError }: Props) {
  const { t } = useLang()
  const [search, setSearch] = useState('')
  const [creditModal, setCreditModal] = useState<CustomerStat | null>(null)
  const [creditHistory, setCreditHistory] = useState<CreditEntry[]>([])
  const [creditBalance, setCreditBalance] = useState<CreditBalanceInfo | null>(null)
  const [loadingCredits, setLoadingCredits] = useState(false)

  const filtered = useMemo(() =>
    customers.filter(c => c.customer_name.toLowerCase().includes(search.toLowerCase())),
    [customers, search]
  )

  const totalSpentAll   = customers.reduce((s, c) => s + Number(c.total_spent), 0)
  const totalBatchAll   = customers.reduce((s, c) => s + Number(c.batch_count), 0)
  const totalCreditsAll = customers.reduce((s, c) => s + Number(c.total_credits ?? 0), 0)

  async function openCreditHistory(customer: CustomerStat) {
    setCreditModal(customer)
    setCreditHistory([])
    setCreditBalance(null)
    setLoadingCredits(true)
    try {
      const res = await apiFetch(`${API}/api/customers/${customer.customer_id}/credits`)
      if (res.status === 401) { logout(); return }
      if (res.ok) {
        const data = await res.json()
        setCreditHistory(data.data ?? [])
        setCreditBalance(data.balance ?? null)
      }
    } catch { /* sin conexión */ }
    finally { setLoadingCredits(false) }
  }

  return (
    <div>
      {/* Credit history modal */}
      {creditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[rgba(0,51,50,.5)]" onClick={() => setCreditModal(null)} />
          <div className="relative w-full max-w-md rounded-lg bg-[#f9efe8] shadow-2xl overflow-hidden">
            <button onClick={() => setCreditModal(null)}
              className="absolute right-3 top-3 z-10 rounded-full p-1 text-[var(--ec-faint)] hover:bg-white">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
            <div className="p-5">
              <p className="text-[17px] font-extrabold text-[var(--ec-ink)]">{t('cust_creditHistory')}</p>
              <p className="text-xs text-[var(--ec-muted)] mt-1">{creditModal.customer_name}</p>
              <p className="mt-0.5 text-[11px] text-[var(--ec-faint)]">{t('cust_creditHistorySub')}</p>

              <div className="mt-4 rounded-md border border-[var(--ec-border)] bg-white overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[var(--ec-border)] bg-[var(--ec-surface-alt)]">
                      <th className="px-3 py-2 text-left font-bold text-[var(--ec-faint)] uppercase tracking-wide">{t('cust_creditDate')}</th>
                      <th className="px-3 py-2 text-left font-bold text-[var(--ec-faint)] uppercase tracking-wide">Type</th>
                      <th className="px-3 py-2 text-left font-bold text-[var(--ec-faint)] uppercase tracking-wide">{t('cust_creditOrder')}</th>
                      <th className="px-3 py-2 text-left font-bold text-[var(--ec-faint)] uppercase tracking-wide">{t('crd_colInvoice')}</th>
                      <th className="px-3 py-2 text-right font-bold text-[var(--ec-faint)] uppercase tracking-wide">{t('cust_creditAmount')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--ec-divider)]">
                    {loadingCredits ? (
                      <tr><td colSpan={5} className="px-3 py-6 text-center text-[var(--ec-faint)]">…</td></tr>
                    ) : creditHistory.length === 0 ? (
                      <tr><td colSpan={5} className="px-3 py-6 text-center text-[var(--ec-faint)]">{t('cust_noCredits')}</td></tr>
                    ) : creditHistory.map((c, i) => (
                      <tr key={i} className="hover:bg-[var(--ec-surface-alt)]/60">
                        <td className="px-3 py-2 font-mono text-[var(--ec-muted)]">{fmtDate(c.created_at)}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-semibold ${c.type === 'EARNED' ? 'bg-[var(--ec-danger-bg)] text-[var(--ec-danger)]' : 'bg-[var(--ec-success-bg)] text-[var(--ec-success-ink)]'}`}>
                            {c.type}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-mono text-[var(--ec-muted)]">
                          {c.reference_batch_id ? `#${c.reference_batch_id.slice(-8).toUpperCase()}` : '—'}
                        </td>
                        <td className="px-3 py-2 font-mono text-[var(--ec-muted)]">
                          {c.invoice_id ? `#${c.invoice_id}` : <span className="italic">{t('crd_noInvoice')}</span>}
                        </td>
                        <td className={`px-3 py-2 text-right font-mono font-semibold ${c.type === 'EARNED' ? 'text-[var(--ec-danger)]' : 'text-[var(--ec-success-ink)]'}`}>
                          {c.type === 'USED' ? fmt(-c.amount) : fmt(c.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {creditBalance && (
                    <tfoot>
                      <tr className="border-t border-[var(--ec-border)] bg-[var(--ec-surface-alt)]">
                        <td colSpan={4} className="px-3 py-2 text-right font-semibold text-[var(--ec-muted)]">Available Credit</td>
                        <td className={`px-3 py-2 text-right font-mono font-bold ${creditBalance.balance > 0 ? 'text-[var(--ec-success-ink)]' : 'text-[var(--ec-faint)]'}`}>
                          {fmt(creditBalance.balance)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[26px] sm:text-[31px] font-extrabold tracking-[-.028em] text-[var(--ec-ink)]">{t('cust_title')}</h1>
        <p className="mt-1.5 text-sm text-[var(--ec-muted)]">{customers.length} {t('cust_subtitle')}</p>
      </div>

      {fetchError && (
        <div className="mb-4 rounded bg-[var(--ec-danger-bg)] px-4 py-3 text-sm text-[var(--ec-danger)]">{fetchError}</div>
      )}

      {/* KPIs */}
      <div className="mb-5 grid grid-cols-2 sm:grid-cols-4 gap-px bg-[var(--ec-border)] border border-[var(--ec-border)] rounded-md overflow-hidden">
        <div className="bg-white p-4">
          <p className="text-[10.5px] font-bold uppercase tracking-[.14em] text-[var(--ec-faint)]">{t('cust_active')}</p>
          <p className="mt-1.5 text-2xl font-extrabold tracking-[-.03em] text-[var(--ec-ink)]">{customers.length}</p>
        </div>
        <div className="bg-white p-4 border-t-[3px] border-t-[var(--ec-success)]">
          <p className="text-[10.5px] font-bold uppercase tracking-[.14em] text-[var(--ec-success-ink)]">{t('cust_billed')}</p>
          <p className="mt-1.5 text-2xl font-extrabold tracking-[-.03em] text-[var(--ec-success-ink)]">{fmt(totalSpentAll)}</p>
        </div>
        <div className="bg-white p-4">
          <p className="text-[10.5px] font-bold uppercase tracking-[.14em] text-[var(--ec-faint)]">{t('cust_orders')}</p>
          <p className="mt-1.5 text-2xl font-extrabold tracking-[-.03em] text-[var(--ec-ink)]">{totalBatchAll}</p>
        </div>
        <div className={`bg-white p-4 ${totalCreditsAll > 0 ? 'border-t-[3px] border-t-[var(--ec-danger)]' : ''}`}>
          <p className={`text-[10.5px] font-bold uppercase tracking-[.14em] ${totalCreditsAll > 0 ? 'text-[var(--ec-danger)]' : 'text-[var(--ec-faint)]'}`}>{t('cust_creditsIssued')}</p>
          <p className={`mt-1.5 text-2xl font-extrabold tracking-[-.03em] ${totalCreditsAll > 0 ? 'text-[var(--ec-danger)]' : 'text-[var(--ec-ink)]'}`}>{fmt(totalCreditsAll)}</p>
        </div>
      </div>

      {/* Search */}
      <div className="mt-5 mb-4 relative max-w-sm">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ec-faint)] pointer-events-none">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder={t('cust_search')}
          className="w-full rounded border border-[var(--ec-border-strong)] bg-white py-2.5 pl-8 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-50"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-md border border-[var(--ec-border)] bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--ec-border)] bg-[var(--ec-surface-alt)]">
              <th className="px-4 py-3 text-left text-[10px] font-extrabold uppercase tracking-[.1em] text-[#7C7169]">{t('cust_colCustomer')}</th>
              <th className="px-4 py-3 text-left text-[10px] font-extrabold uppercase tracking-[.1em] text-[#7C7169]">{t('cust_colQbId')}</th>
              <th className="px-4 py-3 text-right text-[10px] font-extrabold uppercase tracking-[.1em] text-[#7C7169]">{t('cust_colOrders')}</th>
              <th className="px-4 py-3 text-right text-[10px] font-extrabold uppercase tracking-[.1em] text-[#7C7169]">{t('cust_colBilled')}</th>
              <th className="px-4 py-3 text-right text-[10px] font-extrabold uppercase tracking-[.1em] text-[#7C7169]">Available</th>
              <th className="px-4 py-3 text-right text-[10px] font-extrabold uppercase tracking-[.1em] text-[#7C7169]">{t('cust_colCredits')}</th>
              <th className="px-4 py-3 text-left text-[10px] font-extrabold uppercase tracking-[.1em] text-[#7C7169]">{t('cust_colLast')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--ec-divider)]">
            {filtered.map((c, i) => (
              <tr key={c.customer_id} className="hover:bg-[var(--ec-surface-alt)]/60 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded bg-primary text-[10px] font-extrabold text-[var(--ec-gold)] uppercase">
                      {c.customer_name[0]}
                    </div>
                    <div>
                      <p className="font-semibold text-[var(--ec-ink)]">{c.customer_name}</p>
                      {i === 0 && (
                        <span className="text-[10px] font-semibold text-[var(--ec-warn-ink)] bg-[var(--ec-warn-bg)] px-1.5 py-px rounded">{t('cust_topCustomer')}</span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-[11.5px] text-[var(--ec-muted)]">#{c.customer_id}</td>
                <td className="px-4 py-3 text-right font-mono text-[var(--ec-ink)]">{c.batch_count}</td>
                <td className="px-4 py-3 text-right font-mono font-semibold text-[var(--ec-ink)]">{fmt(Number(c.total_spent))}</td>
                <td className="px-4 py-3 text-right">
                  {Number(c.available_credit ?? 0) > 0 ? (
                    <button onClick={() => openCreditHistory(c)}
                      className="font-mono font-semibold text-[var(--ec-warn-ink)] bg-[var(--ec-warn-bg)] px-2.5 py-1 rounded border border-[var(--ec-warn-border)] hover:brightness-95" title={t('cust_viewCredits')}>
                      {fmt(Number(c.available_credit))}
                    </button>
                  ) : (
                    <span className="text-[var(--ec-border-strong)]">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {Number(c.total_credits ?? 0) > 0 ? (
                    <span className="text-xs font-mono text-[var(--ec-danger)] cursor-help" title="Total credits earned (including used)">
                      {fmt(Number(c.total_credits))}
                    </span>
                  ) : (
                    <span className="text-[var(--ec-border-strong)]">—</span>
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-[var(--ec-muted)] text-[10.5px]">{fmtDate(c.last_order_at)}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-[var(--ec-faint)]">
                  {search ? `${t('cust_noResults')} "${search}"` : t('cust_empty')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {filtered.length > 0 && (
        <p className="mt-3 text-xs font-mono text-[var(--ec-faint)] text-right">
          {t('cust_showing').replace('{n}', String(filtered.length)).replace('{total}', String(customers.length))}
        </p>
      )}
    </div>
  )
}
