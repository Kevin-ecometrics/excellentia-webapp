'use client'

import { useEffect, useState } from 'react'
import ProductsClient from './_components/ProductsClient'
import { getUserInfo, apiFetch, logout } from '@/app/lib/auth'

export interface Product {
  id: number
  barcode: string | null
  name: string
  price: number
  min_price: number | null
  category: string | null
  brand: string | null
  stock: number
  description: string | null
  weight_per_unit: number | null
  qb_item_id: string | null
}

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [fetchError, setFetchError] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const user = getUserInfo()
    setIsAdmin(user?.role === 'admin')

    apiFetch(`${API}/api/products?limit=500`)
      .then(res => {
        if (res.status === 401) { logout(); return null }
        if (!res.ok) throw new Error(`Error ${res.status}`)
        return res.json()
      })
      .then(data => { if (data) setProducts(data.data ?? []) })
      .catch(e => setFetchError(e instanceof Error ? e.message : 'Could not connect to the server'))
      .finally(() => setReady(true))
  }, [])

  if (!ready) return null

  return <ProductsClient products={products} fetchError={fetchError} isAdmin={isAdmin} />
}
