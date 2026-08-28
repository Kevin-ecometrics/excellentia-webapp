'use client'

import { useEffect, useState } from 'react'
import SettingsClient from './_components/SettingsClient'
import { apiFetch, logout } from '@/app/lib/auth'

export interface CompanySettings {
  id: number
  company_name: string
  subtitle: string
  address: string | null
  phone: string | null
  city: string | null
  invoice_counter: number
  updated_at: string
}

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

export default function SettingsPage() {
  const [settings, setSettings] = useState<CompanySettings | null>(null)
  const [fetchError, setFetchError] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    apiFetch(`${API}/api/settings`)
      .then(res => {
        if (res.status === 401) { logout(); return null }
        if (res.status === 403) { window.location.href = '/dashboard'; return null }
        if (!res.ok) throw new Error(`Error ${res.status}`)
        return res.json()
      })
      .then(data => { if (data) setSettings(data.data) })
      .catch(e => setFetchError(e instanceof Error ? e.message : 'Could not connect to the server'))
      .finally(() => setReady(true))
  }, [])

  if (!ready) return null

  return <SettingsClient settings={settings} fetchError={fetchError} />
}
