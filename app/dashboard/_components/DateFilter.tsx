'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useLang } from '@/app/_components/LangProvider'

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

interface Props {
  current: string
  currentFrom?: string
  currentTo?: string
}

export default function DateFilter({ current, currentFrom, currentTo }: Props) {
  const router = useRouter()
  const { t } = useLang()
  const pickerRef = useRef<HTMLDivElement>(null)

  const presets = [
    { key: 'today',     label: t('dt_today') },
    { key: 'yesterday', label: t('dt_yesterday') },
    { key: 'week',      label: t('dt_week') },
    { key: 'month',     label: t('dt_month') },
  ]

  const [showPicker, setShowPicker] = useState(false)
  const [from, setFrom] = useState(currentFrom ?? todayStr())
  const [to,   setTo]   = useState(currentTo   ?? todayStr())

  // Update inputs when props change (navigation)
  useEffect(() => {
    if (current === 'custom') {
      setFrom(currentFrom ?? todayStr())
      setTo(currentTo   ?? todayStr())
    }
  }, [current, currentFrom, currentTo])

  // Cerrar picker al hacer clic fuera
  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false)
      }
    }
    if (showPicker) document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [showPicker])

  function apply() {
    if (!from || !to || from > to) return
    router.push(`/dashboard?filter=custom&from=${from}&to=${to}`)
    setShowPicker(false)
  }

  const isCustom = current === 'custom'
  const customLabel = isCustom && currentFrom && currentTo
    ? `${currentFrom.slice(5)} → ${currentTo.slice(5)}`
    : t('dt_range')

  return (
    <div className="flex items-center gap-1.5 flex-wrap justify-end sm:justify-start">
      {/* Preset chips */}
      <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm overflow-x-auto">
        {presets.map(f => (
          <Link
            key={f.key}
            href={`/dashboard?filter=${f.key}`}
            onClick={() => setShowPicker(false)}
            className={`rounded-lg px-2 sm:px-3 py-1.5 text-[11px] sm:text-xs font-semibold transition-all whitespace-nowrap ${
              current === f.key
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-zinc-900 hover:bg-slate-50'
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {/* Custom button */}
      <div className="relative" ref={pickerRef}>
        <button
          onClick={() => setShowPicker(v => !v)}
          className={`flex items-center gap-1 sm:gap-1.5 rounded-xl border px-2 sm:px-3 py-1.5 sm:py-2 text-[11px] sm:text-xs font-semibold shadow-sm transition-all whitespace-nowrap ${
            isCustom
              ? 'border-blue-500 bg-blue-600 text-white'
              : 'border-slate-200 bg-white text-slate-500 hover:text-zinc-900 hover:bg-slate-50'
          }`}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          {isCustom ? customLabel : t('dt_custom')}
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>

        {/* Picker dropdown */}
        {showPicker && (
          <div className="absolute right-0 top-full mt-2 z-50 w-72 rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{t('dt_rangeTitle')}</p>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">{t('dt_from')}</label>
                <input
                  type="date"
                  value={from}
                  max={to}
                  onChange={e => setFrom(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">{t('dt_to')}</label>
                <input
                  type="date"
                  value={to}
                  min={from}
                  max={todayStr()}
                  onChange={e => setTo(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            {from > to && (
              <p className="mt-2 text-xs text-red-500">{t('dt_dateError')}</p>
            )}

            <div className="mt-4 flex items-center justify-between gap-2">
              <button
                onClick={() => setShowPicker(false)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
              >
                {t('dt_cancel')}
              </button>
              <button
                onClick={apply}
                disabled={!from || !to || from > to}
                className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 active:scale-[0.98] transition disabled:opacity-50"
              >
                {t('dt_apply')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
