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
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setCreditModal(null)} />
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 overflow-hidden">
            <button onClick={() => setCreditModal(null)}
              className="absolute right-3 top-3 z-10 rounded-full p-1 text-slate-400 hover:bg-slate-100">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
            <div className="p-5">
              <p className="text-sm font-bold text-zinc-900">{t('cust_creditHistory')}</p>
              <p className="text-xs text-slate-500">{creditModal.customer_name}</p>
              <p className="mt-0.5 text-[11px] text-slate-400">{t('cust_creditHistorySub')}</p>

              <div className="mt-4 rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="px-3 py-2 text-left font-semibold text-slate-400 uppercase tracking-wide">{t('cust_creditDate')}</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-400 uppercase tracking-wide">Type</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-400 uppercase tracking-wide">{t('cust_creditOrder')}</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-400 uppercase tracking-wide">{t('crd_colInvoice')}</th>
                      <th className="px-3 py-2 text-right font-semibold text-slate-400 uppercase tracking-wide">{t('cust_creditAmount')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {loadingCredits ? (
                      <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-400">…</td></tr>
                    ) : creditHistory.length === 0 ? (
                      <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-400">{t('cust_noCredits')}</td></tr>
                    ) : creditHistory.map((c, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-3 py-2 text-slate-500">{fmtDate(c.created_at)}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${c.type === 'EARNED' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                            {c.type}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-mono text-slate-500">
                          {c.reference_batch_id ? `#${c.reference_batch_id.slice(-8).toUpperCase()}` : '—'}
                        </td>
                        <td className="px-3 py-2 font-mono text-slate-500">
                          {c.invoice_id ? `#${c.invoice_id}` : <span className="italic">{t('crd_noInvoice')}</span>}
                        </td>
                        <td className={`px-3 py-2 text-right font-semibold ${c.type === 'EARNED' ? 'text-red-600' : 'text-green-600'}`}>
                          {c.type === 'USED' ? fmt(-c.amount) : fmt(c.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {creditBalance && (
                    <tfoot>
                      <tr className="border-t border-slate-100 bg-slate-50">
                        <td colSpan={4} className="px-3 py-2 text-right font-semibold text-slate-500">Available Credit</td>
                        <td className={`px-3 py-2 text-right font-bold ${creditBalance.balance > 0 ? 'text-green-600' : 'text-slate-400'}`}>
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
        <h1 className="text-2xl font-bold text-zinc-900">{t('cust_title')}</h1>
        <p className="mt-0.5 text-sm text-slate-500">{customers.length} {t('cust_subtitle')}</p>
      </div>

      {fetchError && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{fetchError}</div>
      )}

      {/* KPIs */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
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
        <div className={`rounded-xl border p-4 shadow-sm ${totalCreditsAll > 0 ? 'border-red-100 bg-red-50' : 'border-slate-200 bg-white'}`}>
          <p className={`text-xs font-medium ${totalCreditsAll > 0 ? 'text-red-600' : 'text-slate-500'}`}>{t('cust_creditsIssued')}</p>
          <p className={`mt-1 text-2xl font-bold ${totalCreditsAll > 0 ? 'text-red-700' : 'text-zinc-900'}`}>{fmt(totalCreditsAll)}</p>
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
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Available</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">{t('cust_colCredits')}</th>
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
                <td className="px-4 py-3 text-right">
                  {Number(c.available_credit ?? 0) > 0 ? (
                    <button onClick={() => openCreditHistory(c)}
                      className="font-semibold text-green-600 hover:underline" title={t('cust_viewCredits')}>
                      {fmt(Number(c.available_credit))}
                    </button>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {Number(c.total_credits ?? 0) > 0 ? (
                    <span className="text-xs text-red-500 cursor-help" title="Total credits earned (including used)">
                      {fmt(Number(c.total_credits))}
                    </span>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs">{fmtDate(c.last_order_at)}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-400">
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
