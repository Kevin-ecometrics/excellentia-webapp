'use client'

import { useEffect, useState } from 'react'
import SettlementClient from './_components/SettlementClient'
import { getUserInfo } from '@/app/lib/auth'

// Fase 112 — Liquidación diaria: admin-only a pedido del usuario (el
// almacenista arma/carga rutas y revisa devoluciones desde Android, pero el
// cierre a QBO lo hace el admin acá, en la webapp). El backend ya gatea esto
// con adminOnly (warehouseInventory.ts) — este redirect es solo para no
// mostrar la pantalla vacía/con error a alguien que igual no puede usarla.
export default function SettlementPage() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (getUserInfo()?.role !== 'admin') { window.location.href = '/warehouse'; return }
    setReady(true)
  }, [])

  if (!ready) return null

  return <SettlementClient />
}
