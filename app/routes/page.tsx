'use client'

import { useEffect, useState } from 'react'
import RoutesClient from './_components/RoutesClient'
import { getUserInfo } from '@/app/lib/auth'

export interface DayStop {
  id: number
  scheduled_date: string
  customer_id: string
  customer_name: string
  assigned_route_id: number | null
  assigned_route_name: string | null
  created_at: string
}

export default function RoutesPage() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Armar la lista de clientes por día es exclusivo de admin (2026-09-18)
    // — el almacenista sigue armando la ruta en sí (repartidor, orden,
    // carga del camión) desde Android/`/warehouse`, así que esta página no
    // le aporta nada y lo mandamos para allá.
    const user = getUserInfo()
    if (user?.role !== 'admin') { window.location.href = '/warehouse'; return }
    setReady(true)
  }, [])

  if (!ready) return null

  return <RoutesClient />
}
