import type { TranslationKey } from '@/app/lib/i18n'

export interface WeekdayOption {
  date: string
  labelKey: TranslationKey
}

const WEEKDAY_KEYS: TranslationKey[] = ['weekday_mon', 'weekday_tue', 'weekday_wed', 'weekday_thu', 'weekday_fri']

function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Rutas de reparto corren de lunes a viernes — 5 opciones nada más, sin
// fin de semana. Siempre la semana de HOY: si hoy es sábado o domingo,
// igual arranca en el lunes que ya pasó (no salta a la semana que viene) —
// simple y predecible, sin navegación de semanas todavía.
export function currentWeekdays(): WeekdayOption[] {
  const now = new Date()
  const day = now.getDay() // 0=domingo..6=sábado
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday)
  return WEEKDAY_KEYS.map((labelKey, i) => ({
    date: toDateStr(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i)),
    labelKey,
  }))
}
