'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import DateFilter from './_components/DateFilter'
import DashboardClient from './_components/DashboardClient'
import { getUserInfo, apiFetch, logout } from '@/app/lib/auth'
import { Suspense } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

type Period = 'today' | 'yesterday' | 'week' | 'month' | 'custom'

interface Stats {
  period: Period
  kpis: { ordersPeriod: number; revenuePeriod: number; revenueTotal: number; pending: number; sent: number; failed: number; creditsPeriod: number }
  byHour: { hour: number; count: number }[]
  byDay:  { day: string; sent: number; failed: number }[]
  top5:   { name: string; total: number; count: number }[]
  recent: { id: number; product_name: string; customer_name: string | null; total: number; status: string; created_at: string; batch_id: string | null }[]
  products: { total: number; withQb: number; noBarcode: number; noWeight: number }
}

function DashboardInner() {
  const searchParams = useSearchParams()
  const filter = searchParams.get('filter') ?? 'today'
  const customFrom = searchParams.get('from') ?? undefined
  const customTo = searchParams.get('to') ?? undefined

  const validPeriods = ['today', 'yesterday', 'week', 'month', 'custom']
  const period = (validPeriods.includes(filter) ? filter : 'today') as Period

  const [stats, setStats] = useState<Stats | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const user = getUserInfo()
    if (user?.role !== 'admin') { window.location.href = '/orders'; return }

    const url = new URL(`${API}/api/stats`)
    url.searchParams.set('period', period)
    if (period === 'custom' && customFrom && customTo) {
      url.searchParams.set('from', customFrom)
      url.searchParams.set('to', customTo)
    }

    apiFetch(url.toString())
      .then(res => {
        if (res.status === 401) { logout(); return null }
        if (!res.ok) throw new Error(`Error ${res.status}`)
        return res.json()
      })
      .then(data => { if (data) setStats(data) })
      .catch(() => {})
      .finally(() => setReady(true))
  }, [period, customFrom, customTo])

  if (!ready) return null

  const byHour = stats?.byHour ?? Array.from({ length: 24 }, (_, h) => ({ hour: h, count: 0 }))

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div />
        <DateFilter current={period} currentFrom={customFrom} currentTo={customTo} />
      </div>
      <DashboardClient
        period={period}
        customFrom={customFrom}
        customTo={customTo}
        kpis={stats?.kpis}
        byHour={byHour}
        byDay={stats?.byDay ?? []}
        top5={stats?.top5 ?? []}
        recent={stats?.recent ?? []}
        products={stats?.products}
      />
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <DashboardInner />
    </Suspense>
  )
}
