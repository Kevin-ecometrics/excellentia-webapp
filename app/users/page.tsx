import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import UsersClient from './_components/UsersClient'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

export interface UserRow {
  id: number
  email: string
  name: string | null
  role: 'admin' | 'operator'
  created_at: string
}

export default async function UsersPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('jwt')?.value ?? ''

  let res: Response
  try {
    res = await fetch(`${API}/api/users`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
  } catch {
    return <UsersClient users={[]} fetchError="No se pudo conectar al servidor" />
  }

  if (res.status === 401) redirect('/api/logout')
  if (res.status === 403) redirect('/dashboard')

  let users: UserRow[] = []
  let fetchError = ''
  try {
    if (!res.ok) throw new Error(`Error ${res.status}`)
    const data = await res.json()
    users = data.data ?? []
  } catch (e) {
    fetchError = e instanceof Error ? e.message : 'Error al cargar usuarios'
  }

  return <UsersClient users={users} fetchError={fetchError} />
}
