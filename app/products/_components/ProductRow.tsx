'use client'

import type { Product } from '../page'
import { useLang } from '@/app/_components/LangProvider'

interface Props {
  product: Product
  isAdmin: boolean
  onEdit: (product: Product) => void
  qty?: number
  rate?: number
  isInvoice?: boolean
  onQtyChange?: (id: number, qty: number) => void
  onRateChange?: (id: number, rate: number) => void
}

export function ProductRow({ product, isAdmin, onEdit, qty = 0, rate = 0, isInvoice = false, onQtyChange, onRateChange }: Props) {
  const { t } = useLang()
  const stockColor =
    product.stock === 0 ? 'text-[var(--ec-danger)]' :
    product.stock <= 5  ? 'text-[var(--ec-warn-ink)]' :
    'text-[var(--ec-ink)]'

  const qbInactive = !!product.qb_item_id && (product.qb_active === 0 || product.qb_active === false)

  const qbBadge = (
    <td className="px-4 py-3">
      {!product.qb_item_id ? (
        <span className="text-xs text-[var(--ec-faint)]">—</span>
      ) : qbInactive ? (
        <span className="inline-flex items-center gap-1 rounded bg-[var(--ec-danger-bg)] px-2 py-0.5 text-[11px] font-semibold text-[var(--ec-danger)]">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
          {t('prod_qbInactive')}
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 rounded bg-[var(--ec-success-bg)] px-2 py-0.5 text-[11px] font-semibold text-[var(--ec-success-ink)]">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          QB
        </span>
      )}
    </td>
  )

  const qtyStep = product.unit === 'Lbs' ? '0.01' : '1'

  // Mismo desglose que muestra la app Android para Case/Unit
  // (ProductDetailActivity.showProduct()/recalcTotal(): "$X.XX / Case/Unit of
  // N ($Y.YY/unit)" y "N packs × cq = totalUnits units") — evita que Qty (acá,
  // cajas a facturar) se confunda con el tamaño de la caja (product.qty).
  const isCaseUnit = product.unit === 'Case' || product.unit === 'Unit' || product.unit === 'Case/Unit'
  const isBucket = product.unit === 'Bucket'
  // Bucket usa el mismo campo product.qty que Case/Unit para "unidades por
  // bucket" — a diferencia de Case/Unit, el backend (creditCalculator.ts) no
  // lo usa para dividir el precio (Bucket cobra el price completo tal cual),
  // así que acá es puramente informativo, no entra en ningún cálculo de $.
  const hasContainer = isCaseUnit || isBucket
  const caseSize = product.qty && product.qty > 0 ? product.qty : null

  return (
    <tr className="hover:bg-[var(--ec-surface-alt)]/60 transition-colors">
      <td className="px-4 py-3">
        <p className="font-semibold text-[var(--ec-ink)]">{product.name}</p>
        {product.short_name && (
          <p className="mt-0.5 text-[11px] font-medium text-primary truncate max-w-[200px]">{product.short_name}</p>
        )}
        {product.description && (
          <p className="mt-0.5 text-[11px] text-[var(--ec-faint)] truncate max-w-[200px]">{product.description}</p>
        )}
      </td>
      <td className="px-4 py-3 font-mono font-medium text-[var(--ec-ink)]">
        {isInvoice ? (
          <div>
            <input type="number" step="0.01" min="0" value={rate}
              onChange={e => onRateChange?.(product.id, parseFloat(e.target.value) || 0)}
              className="w-24 rounded border border-[var(--ec-border-strong)] px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary-50" />
            {isCaseUnit && caseSize && (
              <p className="mt-0.5 text-[10px] font-normal text-[var(--ec-faint)]">${(rate / caseSize).toFixed(2)}{t('prod_perUnit')}</p>
            )}
          </div>
        ) : (
          `$${Number(product.price).toFixed(2)}`
        )}
      </td>
      <td className="px-4 py-3 font-mono text-sm text-[var(--ec-muted)]">
        {product.sku ?? <span className="text-[var(--ec-faint)] italic">{t('prod_noSku')}</span>}
      </td>
      <td className="px-4 py-3 font-mono text-sm text-[var(--ec-muted)]">
        {product.barcode ?? <span className="text-[var(--ec-faint)] italic">{t('prod_noBarcode')}</span>}
      </td>
      <td className="px-4 py-3 font-mono text-[var(--ec-ink)]">
        {product.min_price != null ? `$${Number(product.min_price).toFixed(2)}` : <span className="text-[var(--ec-faint)]">—</span>}
      </td>
      <td className="px-4 py-3 font-mono text-[var(--ec-ink)]">
        {product.weight_per_unit != null ? `${Number(product.weight_per_unit)}` : <span className="text-[var(--ec-faint)]">—</span>}
      </td>
      <td className="px-4 py-3 text-xs font-medium text-[var(--ec-ink)]">
        {product.unit === 'Case' || product.unit === 'Unit'
          ? 'Case/Unit'
          : (product.unit ?? <span className="text-[var(--ec-faint)]">—</span>)}
        {isInvoice && hasContainer && caseSize && (
          <p className="mt-0.5 font-normal text-[var(--ec-faint)]">
            {t(isBucket ? 'prod_containerBucket' : 'prod_containerCase').replace('{n}', String(caseSize))}
          </p>
        )}
      </td>
      <td className="px-4 py-3 font-mono text-[var(--ec-ink)]">
        {isInvoice ? (
          <div>
            <input type="number" step={qtyStep} min="0" value={qty}
              onChange={e => onQtyChange?.(product.id, parseFloat(e.target.value) || 0)}
              className="w-20 rounded border border-[var(--ec-border-strong)] px-2 py-1 text-sm text-center focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary-50" />
            {hasContainer && caseSize && qty > 0 && (
              <p className="mt-0.5 text-[10px] text-[var(--ec-faint)] text-center">
                {qty} × {caseSize} = {qty * caseSize} {t('prod_units')}
              </p>
            )}
          </div>
        ) : (
          <span className="font-medium text-[var(--ec-ink)]">{product.qty}</span>
        )}
      </td>
      {isInvoice && (
        <td className="px-4 py-3 font-mono font-semibold text-[var(--ec-ink)]">
          ${(qty * rate).toFixed(2)}
        </td>
      )}
      <td className="px-4 py-3">
        <span className={`font-mono font-semibold ${stockColor}`}>{product.stock}</span>
      </td>
      {qbBadge}
      {isAdmin && (
        <td className="px-4 py-3">
          <button
            onClick={() => onEdit(product)}
            title="Edit product"
            className="rounded p-1.5 text-[var(--ec-faint)] hover:bg-[var(--ec-surface-alt)] hover:text-[var(--ec-ink)] transition"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
        </td>
      )}
    </tr>
  )
}

export default ProductRow