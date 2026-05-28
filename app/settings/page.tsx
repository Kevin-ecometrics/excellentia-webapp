import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import SettingsClient from './_components/SettingsClient'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

export interface CompanySettings {
  id: number
  company_name: string
  subtitle: string
  address: string | null
  phone: string | null
  city: string | null
  updated_at: string
}

export default async function SettingsPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('jwt')?.value ?? ''

  let res: Response
  try {
    res = await fetch(`${API}/api/settings`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
  } catch {
    return <SettingsClient settings={null} fetchError="Could not connect to the server" />
  }

  if (res.status === 401) redirect('/api/logout')
  if (res.status === 403) redirect('/dashboard')

  let settings: CompanySettings | null = null
  let fetchError = ''
  try {
    if (!res.ok) throw new Error(`Error ${res.status}`)
    const data = await res.json()
    settings = data.data
  } catch (e) {
    fetchError = e instanceof Error ? e.message : 'Error loading settings'
  }

  return <SettingsClient settings={settings} fetchError={fetchError} />
}
