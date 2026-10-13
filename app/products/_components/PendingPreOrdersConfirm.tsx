'use client'

import { apiFetch } from '@/app/lib/auth'
import { useLang } from '@/app/_components/LangProvider'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

export interface PendingPreOrder {
  pre_order_id: number
  customer_name: string
  scheduled_date: string | null
  status: string
  lines: number
}

// Pre-órdenes pendientes (DRAFT/CONFIRMED) que contienen el producto. Cambiar su
// nombre o barcode las actualiza solas en el backend; este aviso es informativo, así
// que si la consulta falla devuelve [] y el guardado sigue sin bloquearse.
export async function fetchPendingPreOrders(productId: number): Promise<PendingPreOrder[]> {
  try {
    const res = await apiFetch(`${API}/api/products/${productId}/pending-preorders`)
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data.data) ? data.data : []
  } catch {
    return []
  }
}

interface Props {
  preOrders: PendingPreOrder[]
  saving: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function PendingPreOrdersConfirm({ preOrders, saving, onConfirm, onCancel }: Props) {
  const { t } = useLang()
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[rgba(0,51,50,.5)]" onClick={!saving ? onCancel : undefined} />
      <div className="relative w-full max-w-sm rounded-lg bg-white shadow-2xl">
        <div className="rounded-t-lg border-b border-[var(--ec-warn-border)] bg-[var(--ec-warn-bg)] px-6 py-5">
          <h2 className="text-base font-bold text-[var(--ec-ink)]">{t('prod_preOrdersTitle')}</h2>
        </div>
        <div className="px-6 py-5">
          <p className="text-sm text-[var(--ec-muted)]">
            {t('prod_preOrdersBody').replace('{n}', String(preOrders.length))}
          </p>
          <ul className="mt-3 max-h-48 space-y-1.5 overflow-y-auto">
            {preOrders.map(po => (
              <li key={po.pre_order_id} className="flex items-center justify-between gap-3 rounded border border-[var(--ec-border)] px-3 py-2 text-xs">
                <span className="font-bold text-[var(--ec-ink)]">#{po.pre_order_id} · {po.customer_name}</span>
                <span className="shrink-0 text-[var(--ec-muted)]">
                  {po.scheduled_date ? po.scheduled_date.slice(0, 10) : '—'} · {t('prod_preOrdersLines').replace('{n}', String(po.lines))}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex items-center justify-end gap-3 rounded-b-lg border-t border-[var(--ec-border)] bg-[var(--ec-surface-alt)] px-6 py-4">
          <button type="button" onClick={onCancel} disabled={saving}
            className="rounded border border-[var(--ec-border-strong)] bg-white px-4 py-2.5 text-sm font-bold text-[var(--ec-ink)] transition hover:bg-[var(--ec-surface-alt)] disabled:opacity-50">
            {t('common_cancel')}
          </button>
          <button type="button" onClick={onConfirm} disabled={saving}
            className="rounded bg-primary px-4 py-2.5 text-sm font-extrabold text-white transition hover:bg-primary-dark active:scale-[0.98] disabled:opacity-60">
            {saving ? t('common_saving') : t('prod_preOrdersConfirm')}
          </button>
        </div>
      </div>
    </div>
  )
}
