'use client'

import { useLang } from '@/app/_components/LangProvider'
import { BarChart, LineChart } from './Charts'

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

const statusBadge: Record<string, string> = {
  SENT: 'bg-[var(--ec-success-bg)] text-[var(--ec-success-ink)]', PENDING: 'bg-[var(--ec-warn-bg)] text-[var(--ec-warn-ink)]',
  FAILED: 'bg-[var(--ec-danger-bg)] text-[var(--ec-danger)]', CANCELLED: 'bg-[var(--ec-surface-alt)] text-[var(--ec-faint)]',
}

interface Kpis { ordersPeriod: number; revenuePeriod: number; revenueTotal: number; pending: number; sent: number; failed: number; creditsPeriod: number }
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
  const { t } = useLang()
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
      return new Date(iso).toLocaleString('en-US', {
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

  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <div>
      {/* Title */}
      <div className="mb-5">
        <h1 className="text-[26px] sm:text-[31px] font-extrabold tracking-[-.028em] text-[var(--ec-ink)]">{t('dash_title')}</h1>
        <p className="text-xs text-[var(--ec-faint)] mt-1">{todayFormatted}</p>
      </div>

      {/* KPI Cards */}
      <div className="mb-4 sm:mb-6 grid grid-cols-2 lg:grid-cols-5 gap-px bg-[var(--ec-border)] border border-[var(--ec-border)] rounded-md overflow-hidden">
        <div className="bg-white p-3 sm:p-5">
          <p className="text-[10px] sm:text-[10.5px] font-bold text-[var(--ec-faint)] uppercase tracking-[.14em]">{t('dash_revenue')} · {pLabel}</p>
          <p className="mt-1.5 sm:mt-2 text-lg sm:text-[26px] font-extrabold text-[var(--ec-ink)] tracking-[-.03em]">{fmt(k?.revenuePeriod ?? 0)}</p>
          <p className="mt-0.5 sm:mt-1 text-[11px] sm:text-xs text-[var(--ec-faint)]">{k?.ordersPeriod ?? 0} {t('dash_orders')}</p>
        </div>
        <div className="bg-white p-3 sm:p-5 border-t-[3px] border-t-[var(--ec-success)]">
          <p className="text-[10px] sm:text-[10.5px] font-bold text-[var(--ec-success-ink)] uppercase tracking-[.14em]">{t('dash_totalSent')}</p>
          <p className="mt-1.5 sm:mt-2 text-lg sm:text-[26px] font-extrabold text-[var(--ec-success-ink)] tracking-[-.03em]">{fmt(k?.revenueTotal ?? 0)}</p>
          <p className="mt-0.5 sm:mt-1 text-[11px] sm:text-xs text-[var(--ec-success)]">{k?.sent ?? 0} {t('dash_ordersSent')}</p>
        </div>
        <div className="bg-white p-3 sm:p-5 border-t-[3px] border-t-[var(--ec-gold)]">
          <p className="text-[10px] sm:text-[10.5px] font-bold text-[var(--ec-warn-ink)] uppercase tracking-[.14em]">{t('dash_pending')}</p>
          <p className="mt-1.5 sm:mt-2 text-lg sm:text-[26px] font-extrabold text-[var(--ec-warn-ink)] tracking-[-.03em]">{k?.pending ?? 0}</p>
          <p className="mt-0.5 sm:mt-1 text-[11px] sm:text-xs text-[var(--ec-warn-ink)]/70">{t('dash_pendingNote')}</p>
        </div>
        <div className={`bg-white p-3 sm:p-5 ${(k?.failed ?? 0) > 0 ? 'border-t-[3px] border-t-[var(--ec-danger)]' : ''}`}>
          <p className={`text-[10px] sm:text-[10.5px] font-bold uppercase tracking-[.14em] ${(k?.failed ?? 0) > 0 ? 'text-[var(--ec-danger)]' : 'text-[var(--ec-faint)]'}`}>{t('dash_failed')}</p>
          <p className={`mt-1.5 sm:mt-2 text-lg sm:text-[26px] font-extrabold tracking-[-.03em] ${(k?.failed ?? 0) > 0 ? 'text-[var(--ec-danger)]' : 'text-[var(--ec-ink)]'}`}>{k?.failed ?? 0}</p>
          <p className={`mt-0.5 sm:mt-1 text-[11px] sm:text-xs ${(k?.failed ?? 0) > 0 ? 'text-[var(--ec-danger)]/70' : 'text-[var(--ec-faint)]'}`}>
            {(k?.failed ?? 0) > 0 ? t('dash_failedAlert') : t('dash_failedOk')}
          </p>
        </div>
        <div className={`bg-white p-3 sm:p-5 ${(k?.creditsPeriod ?? 0) > 0 ? 'border-t-[3px] border-t-[var(--ec-danger)]' : ''}`}>
          <p className={`text-[10px] sm:text-[10.5px] font-bold uppercase tracking-[.14em] ${(k?.creditsPeriod ?? 0) > 0 ? 'text-[var(--ec-danger)]' : 'text-[var(--ec-faint)]'}`}>{t('dash_creditsIssued')}</p>
          <p className={`mt-1.5 sm:mt-2 text-lg sm:text-[26px] font-extrabold tracking-[-.03em] ${(k?.creditsPeriod ?? 0) > 0 ? 'text-[var(--ec-danger)]' : 'text-[var(--ec-ink)]'}`}>{fmt(k?.creditsPeriod ?? 0)}</p>
          <p className={`mt-0.5 sm:mt-1 text-[11px] sm:text-xs ${(k?.creditsPeriod ?? 0) > 0 ? 'text-[var(--ec-danger)]/70' : 'text-[var(--ec-faint)]'}`}>{t('dash_creditsNote')}</p>
        </div>
      </div>

      {/* Charts row */}
      <div className="mb-4 sm:mb-6 grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2">
        <div className="rounded-md bg-white border border-[var(--ec-border)] p-3 sm:p-5">
          <div className="mb-3 sm:mb-4 flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-xs sm:text-[13.5px] font-bold text-[var(--ec-ink)]">{t('dash_byHour')}</p>
              <p className="text-[11px] sm:text-xs text-[var(--ec-faint)]">{period === 'yesterday' ? t('dash_byHourYest') : t('dash_byHourSub')}</p>
            </div>
            <span className="text-[10px] sm:text-xs font-semibold text-primary bg-primary-50 px-2 py-1 rounded shrink-0">{t('dash_today')}</span>
          </div>
          <BarChart data={byHour} />
        </div>
        <div className="rounded-md bg-white border border-[var(--ec-border)] p-3 sm:p-5">
          <div className="mb-3 sm:mb-4 flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-xs sm:text-[13.5px] font-bold text-[var(--ec-ink)]">{t('dash_syncRate')}</p>
              <p className="text-[11px] sm:text-xs text-[var(--ec-faint)]">{pLabel}</p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs shrink-0">
              <span className="flex items-center gap-1 text-[var(--ec-success-ink)]"><span className="h-2 w-3 sm:w-4 rounded-sm bg-[var(--ec-success-ink)] inline-block"/>{t('dash_syncSuccess')}</span>
              <span className="flex items-center gap-1 text-[var(--ec-danger)]"><span className="h-2 w-3 sm:w-4 rounded-sm bg-[var(--ec-danger)] inline-block"/>{t('dash_syncFail')}</span>
            </div>
          </div>
          <LineChart data={byDay} />
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2">
        <div className="rounded-md bg-white border border-[var(--ec-border)] p-3 sm:p-5">
          <p className="mb-3 sm:mb-4 text-xs sm:text-[13.5px] font-bold text-[var(--ec-ink)]">{t('dash_top5')} · {pLabel}</p>
          {top5.length === 0 ? (
            <p className="text-xs sm:text-sm text-[var(--ec-faint)] py-4 text-center">{t('dash_noSales')}</p>
          ) : (
            <ul className="space-y-2 sm:space-y-3">
              {top5.map((p, i) => (
                <li key={i} className="flex items-center gap-2 sm:gap-3">
                  <span className="w-4 sm:w-5 text-[11px] sm:text-xs font-bold text-[var(--ec-faint)] shrink-0">{i + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-[var(--ec-ink)] truncate">{p.name}</p>
                    <div className="mt-1 h-1.5 w-full rounded-full bg-[var(--ec-surface-alt)]">
                      <div className="h-1.5 rounded-full bg-primary" style={{ width: `${(p.total / maxTop) * 100}%` }} />
                    </div>
                  </div>
                  <span className="text-xs sm:text-sm font-semibold text-[var(--ec-ink)] shrink-0">{fmt(p.total)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-md bg-white border border-[var(--ec-border)] p-3 sm:p-5">
          <p className="mb-3 sm:mb-4 text-xs sm:text-[13.5px] font-bold text-[var(--ec-ink)]">{t('dash_recent')}</p>
          {recent.length === 0 ? (
            <p className="text-xs sm:text-sm text-[var(--ec-faint)] py-4 text-center">{t('dash_noActivity')}</p>
          ) : (
            <ul className="space-y-2 sm:space-y-3">
              {recent.map(o => (
                <li key={o.id} className="flex items-start gap-2 sm:gap-3">
                  <span className={`mt-1 sm:mt-0.5 h-2 w-2 shrink-0 rounded-full ${
                    o.status === 'SENT' ? 'bg-[var(--ec-success)]' : o.status === 'FAILED' ? 'bg-[var(--ec-danger)]' : 'bg-[var(--ec-gold)]'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-[var(--ec-ink)] truncate">{o.product_name}</p>
                    <p className="text-[11px] sm:text-xs text-[var(--ec-faint)]">
                      {o.customer_name ? `${o.customer_name} · ` : ''}{fmtDate(o.created_at)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs sm:text-sm font-semibold text-[var(--ec-ink)]">{fmt(Number(o.total))}</p>
                    <span className={`inline-block rounded px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold ${statusBadge[o.status] ?? 'bg-[var(--ec-surface-alt)] text-[var(--ec-faint)]'}`}>
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
        <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 rounded-md border border-[var(--ec-warn-border)] bg-[var(--ec-warn-bg)] px-4 sm:px-5 py-3">
          <svg className="shrink-0 mt-0.5 sm:mt-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8A6410" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <p className="text-xs sm:text-sm text-[var(--ec-warn-ink)]">
            <span className="font-semibold">{t('dash_incomplete')} </span>
            {[prod.noBarcode > 0 && `${prod.noBarcode} ${t('dash_noBarcode')}`, prod.noWeight > 0 && `${prod.noWeight} ${t('dash_noWeight')}`]
              .filter(Boolean).join(' · ')}
            {' — '}
            <a href="/products" className="underline font-medium whitespace-nowrap">{t('dash_goProducts')}</a>
          </p>
        </div>
      )}
    </div>
  )
}
