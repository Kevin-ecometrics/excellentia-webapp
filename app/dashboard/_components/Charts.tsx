'use client'

import { useLang } from '@/app/_components/LangProvider'

interface HourBar { hour: number; count: number }
interface DayLine { day: string; sent: number; failed: number }

// ── Bar chart — pedidos por hora ─────────────────────────────────────────────
export function BarChart({ data }: { data: HourBar[] }) {
  const max = Math.max(...data.map(d => d.count), 1)
  const W = 480, H = 100, padB = 18, padT = 6
  const innerH = H - padB - padT
  const slotW = W / 24

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none">
      {data.map((d, i) => {
        const barH = (d.count / max) * innerH
        const x = i * slotW + slotW * 0.15
        const bw = slotW * 0.7
        const y = padT + innerH - barH
        return (
          <g key={i}>
            <rect x={x} y={y} width={bw} height={barH} fill="#1565C0" rx="2" opacity={d.count === 0 ? 0.15 : 0.85} />
            {i % 4 === 0 && (
              <text x={x + bw / 2} y={H - 4} textAnchor="middle" fontSize="8" fill="#94a3b8">
                {d.hour}h
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

// ── Line chart — tasa de sincronización ──────────────────────────────────────
export function LineChart({ data }: { data: DayLine[] }) {
  const { t } = useLang()
  const W = 480, H = 100, padT = 10, padB = 18, padL = 4, padR = 4
  const innerW = W - padL - padR
  const innerH = H - padT - padB
  const maxVal = Math.max(...data.flatMap(d => [d.sent, d.failed]), 1)
  const n = data.length

  // Cuando hay 1 solo punto lo centramos; cuando hay 0 no hay posición válida
  const px = (i: number) => n <= 1 ? W / 2 : padL + (i / (n - 1)) * innerW
  const py = (v: number) => padT + innerH - (v / maxVal) * innerH

  if (n === 0) return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <text x={W / 2} y={H / 2} textAnchor="middle" fontSize="11" fill="#94a3b8">{t('dash_noChartData')}</text>
    </svg>
  )

  const pathFor = (key: 'sent' | 'failed') =>
    data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${px(i).toFixed(1)} ${py(d[key]).toFixed(1)}`).join(' ')

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none">
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map(t => (
        <line key={t} x1={padL} x2={W - padR} y1={padT + innerH * (1 - t)} y2={padT + innerH * (1 - t)}
          stroke="#e2e8f0" strokeWidth="1" />
      ))}
      {/* Lines */}
      <path d={pathFor('sent')} fill="none" stroke="#2E7D32" strokeWidth="2" strokeLinejoin="round" />
      <path d={pathFor('failed')} fill="none" stroke="#C62828" strokeWidth="2" strokeLinejoin="round" />
      {/* Dots */}
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={px(i)} cy={py(d.sent)} r="3" fill="#2E7D32" />
          {d.failed > 0 && <circle cx={px(i)} cy={py(d.failed)} r="3" fill="#C62828" />}
          <text x={px(i)} y={H - 4} textAnchor="middle" fontSize="8" fill="#94a3b8">
            {d.day}
          </text>
        </g>
      ))}
    </svg>
  )
}
