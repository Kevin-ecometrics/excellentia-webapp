'use client'

import { useEffect, useState } from 'react'
import UsersClient from './_components/UsersClient'
import { apiFetch, logout } from '@/app/lib/auth'

export interface UserRow {
  id: number
  email: string
  name: string | null
  role: 'admin' | 'operator'
  created_at: string
}

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [fetchError, setFetchError] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    apiFetch(`${API}/api/users`)
      .then(res => {
        if (res.status === 401) { logout(); return null }
        if (res.status === 403) { window.location.href = '/dashboard'; return null }
        if (!res.ok) throw new Error(`Error ${res.status}`)
        return res.json()
      })
      .then(data => { if (data) setUsers(data.data ?? []) })
      .catch(e => setFetchError(e instanceof Error ? e.message : 'Could not connect to the server'))
      .finally(() => setReady(true))
  }, [])

  if (!ready) return null

  return <UsersClient users={users} fetchError={fetchError} />
}
