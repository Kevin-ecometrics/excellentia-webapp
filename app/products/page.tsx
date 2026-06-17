'use client'

import ProductsClient from './_components/ProductsClient'

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

export default function ProductsPage() {
  return <ProductsClient />
}
