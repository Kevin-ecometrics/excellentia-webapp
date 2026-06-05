'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getUserInfo } from '@/app/lib/auth'

export default function Home() {
  const router = useRouter()
  useEffect(() => {
    const user = getUserInfo()
    if (user) {
      router.replace('/dashboard')
    } else {
      router.replace('/login')
    }
  }, [router])
  return null
}
