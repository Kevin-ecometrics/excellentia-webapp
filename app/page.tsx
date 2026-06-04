'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getToken, decodeJwt } from '@/app/lib/auth'

export default function Home() {
  const router = useRouter()
  useEffect(() => {
    const token = getToken()
    const user = token ? decodeJwt(token) : null
    if (user) {
      router.replace('/dashboard')
    } else {
      router.replace('/login')
    }
  }, [router])
  return null
}
