import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import ProductsClient from './_components/ProductsClient'
import type { CurrentUser } from '../layout'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

function decodeJwt(token: string): CurrentUser | null {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString())
    return { id: payload.id, email: payload.email, name: payload.name ?? null, role: payload.role }
  } catch { return null }
}

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

export default async function ProductsPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('jwt')?.value ?? ''
  const currentUser = decodeJwt(token)
  const isAdmin = currentUser?.role === 'admin'

  // Fetch outside try-catch so redirect() can propagate — Next.js redirect
  // throws internally and a catch block would swallow it.
  let res: Response
  try {
    res = await fetch(`${API}/api/products?limit=500`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
  } catch {
    return <ProductsClient products={[]} fetchError="No se pudo conectar al servidor" isAdmin={isAdmin} />
  }

  if (res.status === 401) redirect('/api/logout')

  let products: Product[] = []
  let fetchError = ''
  try {
    if (!res.ok) throw new Error(`Error ${res.status}`)
    const data = await res.json()
    products = data.data ?? []
  } catch (e) {
    fetchError = e instanceof Error ? e.message : 'Error al cargar productos'
  }

  return <ProductsClient products={products} fetchError={fetchError} isAdmin={isAdmin} />
}
