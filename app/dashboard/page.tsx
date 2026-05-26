import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import DateFilter from './_components/DateFilter'
import DashboardClient from './_components/DashboardClient'
import type { CurrentUser } from '../layout'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

function decodeJwt(token: string): CurrentUser | null {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString())
    return { id: payload.id, email: payload.email, role: payload.role }
  } catch { return null }
}

type Period = 'today' | 'yesterday' | 'week' | 'month' | 'custom'

interface Stats {
  period: Period
  kpis: { ordersPeriod: number; revenuePeriod: number; revenueTotal: number; pending: number; sent: number; failed: number }
  byHour: { hour: number; count: number }[]
  byDay:  { day: string; sent: number; failed: number }[]
  top5:   { name: string; total: number; count: number }[]
  recent: { id: number; product_name: string; customer_name: string | null; total: number; status: string; created_at: string; batch_id: string | null }[]
  products: { total: number; withQb: number; noBarcode: number; noWeight: number }
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; from?: string; to?: string }>
}) {
  const cookieStore = await cookies()
  const token = cookieStore.get('jwt')?.value ?? ''
  const currentUser = decodeJwt(token)
  const isAdmin = currentUser?.role === 'admin'

  if (!isAdmin) redirect('/orders')

  const { filter, from: customFrom, to: customTo } = await searchParams
  const validPeriods = ['today','yesterday','week','month','custom']
  const period = (validPeriods.includes(filter ?? '') ? filter : 'today') as Period

  const statsUrl = new URL(`${API}/api/stats`)
  statsUrl.searchParams.set('period', period)
  if (period === 'custom' && customFrom && customTo) {
    statsUrl.searchParams.set('from', customFrom)
    statsUrl.searchParams.set('to', customTo)
  }

  let stats: Stats | null = null
  try {
    const res = await fetch(statsUrl.toString(), {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    if (res.status === 401) redirect('/api/logout')
    if (res.ok) stats = await res.json()
  } catch {}

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
