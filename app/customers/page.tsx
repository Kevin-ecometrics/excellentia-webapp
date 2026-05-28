import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import CustomersClient from './_components/CustomersClient'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

export interface CustomerStat {
  customer_id: string
  customer_name: string
  batch_count: number
  total_spent: number
  last_order_at: string
}

export default async function CustomersPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('jwt')?.value ?? ''

  let res: Response
  try {
    res = await fetch(`${API}/api/customers/stats`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
  } catch {
    return <CustomersClient customers={[]} fetchError="Could not connect to the server" />
  }

  if (res.status === 401) redirect('/api/logout')
  if (res.status === 403) redirect('/dashboard')

  let customers: CustomerStat[] = []
  let fetchError = ''
  try {
    if (!res.ok) throw new Error(`Error ${res.status}`)
    const data = await res.json()
    customers = data.data ?? []
  } catch (e) {
    fetchError = e instanceof Error ? e.message : 'Error loading customers'
  }

  return <CustomersClient customers={customers} fetchError={fetchError} />
}
