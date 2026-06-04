'use client'

import { useEffect, useState } from 'react'
import Sidebar from './Sidebar'
import { getToken, decodeJwt } from '@/app/lib/auth'
import type { CurrentUser } from '@/app/lib/auth'

export default function ClientShell({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null | undefined>(undefined)

  useEffect(() => {
    const token = getToken()
    setUser(token ? decodeJwt(token) : null)
  }, [])

  if (user === undefined) return <>{children}</>

  if (!user) return <>{children}</>

  return (
    <div className="flex min-h-dvh">
      <Sidebar user={user} />
      <main className="flex-1 overflow-auto p-8 max-w-[1200px] mx-auto w-full">
        {children}
      </main>
    </div>
  )
}
