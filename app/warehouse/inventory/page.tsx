'use client'

import { useEffect, useState } from 'react'
import InventoryClient from './_components/InventoryClient'
import { getUserInfo } from '@/app/lib/auth'

// Sub-inventario — paridad con InventoryMovementsActivity de Android
// (Disponible + Historial). Mismo criterio de acceso que /warehouse (el
// backend ya gatea /api/warehouse/lots y /api/warehouse/movements con
// warehouseOnly = admin o almacenista) — si un operator llegó hasta acá es
// porque de alguna forma se saltó el redirect de /warehouse, así que se
// repite acá por las dudas.
export default function InventoryPage() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (getUserInfo()?.role === 'operator') { window.location.href = '/orders'; return }
    setReady(true)
  }, [])

  if (!ready) return null

  return <InventoryClient />
}
