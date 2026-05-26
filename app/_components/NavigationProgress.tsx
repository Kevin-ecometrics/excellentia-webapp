'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

export default function NavigationProgress() {
  const pathname = usePathname()
  const [width, setWidth]     = useState(0)
  const [visible, setVisible] = useState(false)
  const t1 = useRef<ReturnType<typeof setTimeout> | null>(null)
  const t2 = useRef<ReturnType<typeof setTimeout> | null>(null)
  const t3 = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Detectar clic en links internos → iniciar barra
  useEffect(() => {
    function start(e: MouseEvent) {
      const a = (e.target as HTMLElement).closest('a[href]')
      if (!a) return
      const href = a.getAttribute('href') ?? ''
      if (href.startsWith('http') || href.startsWith('#') || href === pathname) return

      clearAll()
      setVisible(true)
      setWidth(10)
      t1.current = setTimeout(() => setWidth(35), 150)
      t2.current = setTimeout(() => setWidth(65), 500)
      t3.current = setTimeout(() => setWidth(80), 1200)
    }

    document.addEventListener('click', start)
    return () => { document.removeEventListener('click', start); clearAll() }
  }, [pathname])

  // Pathname cambió → completar barra
  useEffect(() => {
    clearAll()
    setWidth(100)
    const done = setTimeout(() => { setVisible(false); setWidth(0) }, 350)
    return () => clearTimeout(done)
  }, [pathname])

  function clearAll() {
    ;[t1, t2, t3].forEach(r => { if (r.current) clearTimeout(r.current) })
  }

  if (!visible && width === 0) return null

  return (
    <div
      className="fixed top-0 left-0 z-[9999] h-[3px] bg-blue-500 transition-all ease-out"
      style={{
        width: `${width}%`,
        transitionDuration: width === 100 ? '200ms' : '600ms',
        boxShadow: '0 0 8px rgba(59,130,246,0.7)',
        opacity: visible ? 1 : 0,
      }}
    />
  )
}
