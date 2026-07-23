'use client'

import { useEffect, useState } from 'react'
import CreditsClient from './_components/CreditsClient'
import { apiFetch, logout } from '@/app/lib/auth'

export interface CreditRow {
  id: number
  customer_id: string | null
  customer_name: string | null
  batch_id: string
  invoice_id: string | null
  amount: number
  created_at: string
}

export interface CreditsSummary {
  count: number
  totalAmount: number
}

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

export default function CreditsPage() {
  const [credits, setCredits] = useState<CreditRow[]>([])
  const [summary, setSummary] = useState<CreditsSummary>({ count: 0, totalAmount: 0 })
  const [fetchError, setFetchError] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    apiFetch(`${API}/api/credits?limit=200`)
      .then(res => {
        if (res.status === 401) { logout(); return null }
        if (res.status === 403) { window.location.href = '/dashboard'; return null }
        if (!res.ok) throw new Error(`Error ${res.status}`)
        return res.json()
      })
      .then(data => {
        if (data) {
          setCredits(data.data ?? [])
          setSummary(data.summary ?? { count: 0, totalAmount: 0 })
        }
      })
      .catch(e => setFetchError(e instanceof Error ? e.message : 'Could not connect to the server'))
      .finally(() => setReady(true))
  }, [])

  if (!ready) return null

  return <CreditsClient credits={credits} summary={summary} fetchError={fetchError} />
}
