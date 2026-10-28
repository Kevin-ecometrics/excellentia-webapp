'use client'

import { useEffect, useState } from 'react'
import CreditsClient from './_components/CreditsClient'
import { apiFetch, logout } from '@/app/lib/auth'

export interface CreditRow {
  id: number
  customer_id: string | null
  customer_name: string | null
  // EARNED = crédito generado (producto dañado/caducado recogido);
  // USED = saldo aplicado en una venta. Ver GET /api/credits.
  type: 'EARNED' | 'USED'
  // NULL en ajustes manuales sin venta (ej. el saldo de Pancho Villa en cero,
  // 2026-10-26) — reference_batch_id es nullable.
  batch_id: string | null
  invoice_id: string | null
  amount: number
  created_at: string
  // Nota libre (ej. reversa de un crédito por cancelar la venta, Fase 117).
  note: string | null
  // Fecha de la venta del batch (misma que /orders); null si el crédito no
  // tiene venta asociada (agendado con "Agregar crédito").
  sale_date: string | null
  // Número de factura reservado de esa venta (aunque todavía no esté en QBO).
  invoice_number: number | null
  sale_status: string | null
  // Motivos de los productos de un crédito EARNED ("a, b"); null en USED o en
  // créditos registrados antes de los motivos (2026-10-26).
  reasons: string | null
}

export interface CreditsSummary {
  count: number
  totalAmount: number
  totalEarned: number
  countEarned: number
  totalUsed: number
  countUsed: number
}

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

const EMPTY_SUMMARY: CreditsSummary = { count: 0, totalAmount: 0, totalEarned: 0, countEarned: 0, totalUsed: 0, countUsed: 0 }

export default function CreditsPage() {
  const [credits, setCredits] = useState<CreditRow[]>([])
  const [summary, setSummary] = useState<CreditsSummary>(EMPTY_SUMMARY)
  const [fetchError, setFetchError] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    apiFetch(`${API}/api/credits?limit=500`)
      .then(res => {
        if (res.status === 401) { logout(); return null }
        if (res.status === 403) { window.location.href = '/dashboard'; return null }
        if (!res.ok) throw new Error(`Error ${res.status}`)
        return res.json()
      })
      .then(data => {
        if (data) {
          setCredits(data.data ?? [])
          setSummary({ ...EMPTY_SUMMARY, ...(data.summary ?? {}) })
        }
      })
      .catch(e => setFetchError(e instanceof Error ? e.message : 'Could not connect to the server'))
      .finally(() => setReady(true))
  }, [])

  if (!ready) return null

  return <CreditsClient credits={credits} summary={summary} fetchError={fetchError} />
}
