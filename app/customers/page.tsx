'use client'

import { useEffect, useState } from 'react'
import CustomersClient from './_components/CustomersClient'
import { apiFetch, logout } from '@/app/lib/auth'

export interface CustomerStat {
  customer_id: string
  customer_name: string
  batch_count: number
  total_spent: number
  last_order_at: string
}

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerStat[]>([])
  const [fetchError, setFetchError] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    apiFetch(`${API}/api/customers/stats`)
      .then(res => {
        if (res.status === 401) { logout(); return null }
        if (res.status === 403) { window.location.href = '/dashboard'; return null }
        if (!res.ok) throw new Error(`Error ${res.status}`)
        return res.json()
      })
      .then(data => { if (data) setCustomers(data.data ?? []) })
      .catch(e => setFetchError(e instanceof Error ? e.message : 'Could not connect to the server'))
      .finally(() => setReady(true))
  }, [])

  if (!ready) return null

  return <CustomersClient customers={customers} fetchError={fetchError} />
}
