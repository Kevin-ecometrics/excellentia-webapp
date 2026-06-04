'use client'

import { useEffect, useState } from 'react'
import OrdersClient from './_components/OrdersClient'
import { getToken, decodeJwt, logout } from '@/app/lib/auth'

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
  signature: string | null
  user_id: number | null
  user_email: string | null
  user_name: string | null
  created_at: string
}

export interface CompanyInfo {
  company_name: string
  subtitle: string
  address: string | null
  phone: string | null
  city: string | null
}

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [fetchError, setFetchError] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [company, setCompany] = useState<CompanyInfo>({ company_name: 'EXCELLENTIA', subtitle: 'Sale Ticket', address: null, phone: null, city: null })
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const token = getToken()
    const user = decodeJwt(token)
    setIsAdmin(user?.role === 'admin')

    const headers = { Authorization: `Bearer ${token}` }

    Promise.allSettled([
      fetch(`${API}/api/orders?limit=200`, { headers }),
      fetch(`${API}/api/settings`, { headers }),
    ]).then(async ([ordersRes, settingsRes]) => {
      if (ordersRes.status === 'fulfilled') {
        if (ordersRes.value.status === 401) { logout(); return }
        if (ordersRes.value.ok) {
          try { setOrders((await ordersRes.value.json()).data ?? []) } catch {}
        } else {
          setFetchError(`Error ${ordersRes.value.status}`)
        }
      } else {
        setFetchError('Could not connect to the server')
      }

      if (settingsRes.status === 'fulfilled' && settingsRes.value.ok) {
        try { const d = await settingsRes.value.json(); if (d.data) setCompany(d.data) } catch {}
      }

      setReady(true)
    })
  }, [])

  if (!ready) return null

  return <OrdersClient orders={orders} fetchError={fetchError} isAdmin={isAdmin} company={company} />
}
