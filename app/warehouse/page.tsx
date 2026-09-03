'use client'

import { useEffect, useState } from 'react'
import WarehouseClient from './_components/WarehouseClient'
import { getUserInfo, apiFetch, logout } from '@/app/lib/auth'

export interface RouteRow {
  id: number
  name: string
  scheduled_date: string
  driver_user_id: number | null
  driver_name: string | null
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  // Fase 115 — ruta directa (un solo destino, carga pre-asignada) vs no
  // directa (multi-parada, flujo de siempre). Se crea desde Android, acá es
  // solo lectura — no hay selector en RouteModal.tsx (edit-only).
  route_type: 'DIRECT' | 'MULTI_STOP'
  notes: string | null
  stop_count: number
  // Fase 112 (2026-08-31) — marca explícita de que el almacén ya revisó
  // devoluciones para esta ruta (null = todavía no, sea que haya algo para
  // devolver o no). Distingue "no revisado" de "revisado, nada que volvió".
  returns_reviewed_at: string | null
  created_at: string
  updated_at: string
}

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

export default function WarehousePage() {
  const [routes, setRoutes] = useState<RouteRow[]>([])
  const [fetchError, setFetchError] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const user = getUserInfo()
    if (user?.role === 'operator') { window.location.href = '/orders'; return }

    apiFetch(`${API}/api/routes`)
      .then(res => {
        if (res.status === 401) { logout(); return null }
        if (!res.ok) throw new Error(`Error ${res.status}`)
        return res.json()
      })
      .then(data => { if (data) setRoutes(data.data ?? []) })
      .catch(() => setFetchError('Could not connect to the server'))
      .finally(() => setReady(true))
  }, [])

  if (!ready) return null

  return <WarehouseClient initialRoutes={routes} fetchError={fetchError} />
}
