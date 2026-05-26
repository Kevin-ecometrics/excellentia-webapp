'use client'

import { useLang } from '@/app/_components/LangProvider'
import { BarChart, LineChart } from './Charts'

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

const statusBadge: Record<string, string> = {
  SENT: 'bg-green-100 text-green-700', PENDING: 'bg-amber-100 text-amber-700',
  FAILED: 'bg-red-100 text-red-700', CANCELLED: 'bg-slate-100 text-slate-500',
}

interface Kpis { ordersPeriod: number; revenuePeriod: number; revenueTotal: number; pending: number; sent: number; failed: number }
interface RecentOrder { id: number; product_name: string; customer_name: string | null; total: number; status: string; created_at: string; batch_id: string | null }
interface Top5Item { name: string; total: number; count: number }
interface Products { total: number; withQb: number; noBarcode: number; noWeight: number }

type Period = 'today' | 'yesterday' | 'week' | 'month' | 'custom'

interface Props {
  period: Period
  customFrom?: string
  customTo?: string
  kpis: Kpis | undefined
  byHour: { hour: number; count: number }[]
  byDay:  { day: string; sent: number; failed: number }[]
  top5:   Top5Item[]
  recent: RecentOrder[]
  products: Products | undefined
}

export default function DashboardClient({ period, customFrom, customTo, kpis: k, byHour, byDay, top5, recent, products: prod }: Props) {
  const { t, locale } = useLang()
  const maxTop = top5[0]?.total ?? 1

  const periodLabelMap: Record<Period, string> = {
    today:     t('dt_periodToday'),
    yesterday: t('dt_periodYesterday'),
    week:      t('dt_periodWeek'),
    month:     t('dt_periodMonth'),
    custom:    t('dt_periodCustom'),
  }
  const pLabel = period === 'custom' && customFrom && customTo
    ? `${customFrom.slice(5).replace('-','/')} → ${customTo.slice(5).replace('-','/')}`
    : periodLabelMap[period]

  function fmtDate(iso: string) {
    try {
      return new Date(iso).toLocaleString(locale === 'en' ? 'en-US' : 'es-MX', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
      })
    } catch { return '' }
  }

  const statusText: Record<string, string> = {
    SENT:      t('ord_labelSent'),
    PENDING:   t('ord_labelPending'),
    FAILED:    t('ord_labelFailed'),
    CANCELLED: t('ord_labelCancelled'),
  }

  const todayFormatted = new Date().toLocaleDateString(locale === 'en' ? 'en-US' : 'es-MX', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <div>
      {/* Title */}
      <div className="mb-2">
        <h1 className="text-xl font-bold text-zinc-900">{t('dash_title')}</h1>
        <p className="text-xs text-slate-400 mt-0.5">{todayFormatted}</p>
      </div>

      {/* KPI Cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl bg-white border border-slate-200 p-5 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{t('dash_revenue')} · {pLabel}</p>
          <p className="mt-2 text-2xl font-bold text-zinc-900">{fmt(k?.revenuePeriod ?? 0)}</p>
          <p className="mt-1 text-xs text-slate-400">{k?.ordersPeriod ?? 0} {t('dash_orders')}</p>
        </div>
        <div className="rounded-xl bg-white border border-slate-200 p-5 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{t('dash_totalSent')}</p>
          <p className="mt-2 text-2xl font-bold text-green-700">{fmt(k?.revenueTotal ?? 0)}</p>
          <p className="mt-1 text-xs text-slate-400">{k?.sent ?? 0} {t('dash_ordersSent')}</p>
        </div>
        <div className="rounded-xl border border-amber-100 bg-amber-50 p-5 shadow-sm">
          <p className="text-xs font-medium text-amber-600 uppercase tracking-wide">{t('dash_pending')}</p>
          <p className="mt-2 text-2xl font-bold text-amber-700">{k?.pending ?? 0}</p>
          <p className="mt-1 text-xs text-amber-400">{t('dash_pendingNote')}</p>
        </div>
        <div className={`rounded-xl border p-5 shadow-sm ${(k?.failed ?? 0) > 0 ? 'bg-red-50 border-red-100' : 'bg-white border-slate-200'}`}>
          <p className={`text-xs font-medium uppercase tracking-wide ${(k?.failed ?? 0) > 0 ? 'text-red-500' : 'text-slate-500'}`}>{t('dash_failed')}</p>
          <p className={`mt-2 text-2xl font-bold ${(k?.failed ?? 0) > 0 ? 'text-red-700' : 'text-zinc-900'}`}>{k?.failed ?? 0}</p>
          <p className={`mt-1 text-xs ${(k?.failed ?? 0) > 0 ? 'text-red-400' : 'text-slate-400'}`}>
            {(k?.failed ?? 0) > 0 ? t('dash_failedAlert') : t('dash_failedOk')}
          </p>
        </div>
      </div>

      {/* Charts row */}
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl bg-white border border-slate-200 p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-zinc-900">{t('dash_byHour')}</p>
              <p className="text-xs text-slate-400">{period === 'yesterday' ? t('dash_byHourYest') : t('dash_byHourSub')}</p>
            </div>
            <span className="text-xs font-medium text-primary bg-blue-50 px-2 py-1 rounded-md">{t('dash_today')}</span>
          </div>
          <BarChart data={byHour} />
        </div>
        <div className="rounded-xl bg-white border border-slate-200 p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-zinc-900">{t('dash_syncRate')}</p>
              <p className="text-xs text-slate-400">{pLabel}</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-green-700"><span className="h-2 w-4 rounded bg-green-600 inline-block"/>{t('dash_syncSuccess')}</span>
              <span className="flex items-center gap-1 text-red-700"><span className="h-2 w-4 rounded bg-red-600 inline-block"/>{t('dash_syncFail')}</span>
            </div>
          </div>
          <LineChart data={byDay} />
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl bg-white border border-slate-200 p-5 shadow-sm">
          <p className="mb-4 text-sm font-semibold text-zinc-900">{t('dash_top5')} · {pLabel}</p>
          {top5.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">{t('dash_noSales')}</p>
          ) : (
            <ul className="space-y-3">
              {top5.map((p, i) => (
                <li key={i} className="flex items-center gap-3">
                  <span className="w-5 text-xs font-bold text-slate-400 shrink-0">{i + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-900 truncate">{p.name}</p>
                    <div className="mt-1 h-1.5 w-full rounded-full bg-slate-100">
                      <div className="h-1.5 rounded-full bg-primary" style={{ width: `${(p.total / maxTop) * 100}%` }} />
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-zinc-900 shrink-0">{fmt(p.total)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl bg-white border border-slate-200 p-5 shadow-sm">
          <p className="mb-4 text-sm font-semibold text-zinc-900">{t('dash_recent')}</p>
          {recent.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">{t('dash_noActivity')}</p>
          ) : (
            <ul className="space-y-3">
              {recent.map(o => (
                <li key={o.id} className="flex items-start gap-3">
                  <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${
                    o.status === 'SENT' ? 'bg-green-500' : o.status === 'FAILED' ? 'bg-red-500' : 'bg-amber-400'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-900 truncate">{o.product_name}</p>
                    <p className="text-xs text-slate-400">
                      {o.customer_name ? `${o.customer_name} · ` : ''}{fmtDate(o.created_at)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-zinc-900">{fmt(Number(o.total))}</p>
                    <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${statusBadge[o.status] ?? 'bg-slate-100 text-slate-500'}`}>
                      {statusText[o.status] ?? o.status}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Products warning */}
      {prod && (prod.noBarcode > 0 || prod.noWeight > 0) && (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-3">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <p className="text-sm text-amber-800">
            <span className="font-semibold">{t('dash_incomplete')} </span>
            {[prod.noBarcode > 0 && `${prod.noBarcode} ${t('dash_noBarcode')}`, prod.noWeight > 0 && `${prod.noWeight} ${t('dash_noWeight')}`]
              .filter(Boolean).join(' · ')}
            {' — '}
            <a href="/products" className="underline font-medium">{t('dash_goProducts')}</a>
          </p>
        </div>
      )}
    </div>
  )
}
