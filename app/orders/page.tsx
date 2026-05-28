import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import OrdersClient from './_components/OrdersClient'
import type { CurrentUser } from '../layout'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

export interface OrderRow {
  id: number
  barcode: string
  product_name: string
  price: number
  quantity: number
  total: number
  status: 'PENDING' | 'SENT' | 'FAILED' | 'CANCELLED'
  batch_id: string | null
  qb_invoice_id: string | null
  customer_id: string | null
  customer_name: string | null
  user_id: number | null
  user_email: string | null
  user_name: string | null
  created_at: string
}

function decodeJwt(token: string): CurrentUser | null {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString())
    return { id: payload.id, email: payload.email, role: payload.role }
  } catch { return null }
}

export interface CompanyInfo {
  company_name: string
  subtitle: string
  address: string | null
  phone: string | null
  city: string | null
}

export default async function OrdersPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('jwt')?.value ?? ''
  const currentUser = decodeJwt(token)

  const [ordersRes, settingsRes] = await Promise.allSettled([
    fetch(`${API}/api/orders?limit=200`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }),
    fetch(`${API}/api/settings`,          { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }),
  ])

  if (ordersRes.status === 'fulfilled' && ordersRes.value.status === 401) redirect('/api/logout')

  let orders: OrderRow[] = []
  let fetchError = ''
  let company: CompanyInfo = { company_name: 'EXCELLENTIA', subtitle: 'Sale Ticket', address: null, phone: null, city: null }

  if (ordersRes.status === 'fulfilled' && ordersRes.value.ok) {
    try { orders = (await ordersRes.value.json()).data ?? [] } catch {}
  } else if (ordersRes.status === 'rejected') {
    fetchError = 'Could not connect to the server'
  }

  if (settingsRes.status === 'fulfilled' && settingsRes.value.ok) {
    try { const d = await settingsRes.value.json(); if (d.data) company = d.data } catch {}
  }

  return <OrdersClient orders={orders} fetchError={fetchError} isAdmin={currentUser?.role === 'admin'} company={company} />
}
