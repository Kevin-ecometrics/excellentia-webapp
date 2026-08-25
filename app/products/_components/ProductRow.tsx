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
    product.stock === 0 ? 'text-red-500' :
    product.stock <= 5  ? 'text-amber-500' :
    'text-zinc-900'

  const qbInactive = !!product.qb_item_id && (product.qb_active === 0 || product.qb_active === false)

  const qbBadge = (
    <td className="px-4 py-3">
      {!product.qb_item_id ? (
        <span className="text-xs text-slate-400">—</span>
      ) : qbInactive ? (
        <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
          {t('prod_qbInactive')}
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 rounded-md bg-green-50 px-2 py-0.5 text-[11px] font-semibold text-green-700">
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
    <tr className="hover:bg-slate-50 transition-colors">
      <td className="px-4 py-3">
        <p className="font-medium text-zinc-900">{product.name}</p>
        {product.short_name && (
          <p className="mt-0.5 text-[11px] font-medium text-blue-500 truncate max-w-[200px]">{product.short_name}</p>
        )}
        {product.description && (
          <p className="mt-0.5 text-[11px] text-slate-400 truncate max-w-[200px]">{product.description}</p>
        )}
      </td>
      <td className="px-4 py-3 font-medium text-zinc-900">
        {isInvoice ? (
          <div>
            <input type="number" step="0.01" min="0" value={rate}
              onChange={e => onRateChange?.(product.id, parseFloat(e.target.value) || 0)}
              className="w-24 rounded border border-slate-300 px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-blue-100" />
            {isCaseUnit && caseSize && (
              <p className="mt-0.5 text-[10px] font-normal text-slate-400">${(rate / caseSize).toFixed(2)}{t('prod_perUnit')}</p>
            )}
          </div>
        ) : (
          `$${Number(product.price).toFixed(2)}`
        )}
      </td>
      <td className="px-4 py-3 font-mono text-sm text-slate-600">
        {product.sku ?? <span className="text-slate-400 italic">{t('prod_noSku')}</span>}
      </td>
      <td className="px-4 py-3 font-mono text-sm text-slate-600">
        {product.barcode ?? <span className="text-slate-400 italic">{t('prod_noBarcode')}</span>}
      </td>
      <td className="px-4 py-3 text-zinc-700">
        {product.min_price != null ? `$${Number(product.min_price).toFixed(2)}` : <span className="text-slate-400">—</span>}
      </td>
      <td className="px-4 py-3 text-zinc-700">
        {product.weight_per_unit != null ? `${Number(product.weight_per_unit)}` : <span className="text-slate-400">—</span>}
      </td>
      <td className="px-4 py-3 text-xs font-medium text-zinc-700">
        {product.unit === 'Case' || product.unit === 'Unit'
          ? 'Case/Unit'
          : (product.unit ?? <span className="text-slate-400">—</span>)}
        {isInvoice && hasContainer && caseSize && (
          <p className="mt-0.5 font-normal text-slate-400">
            {t(isBucket ? 'prod_containerBucket' : 'prod_containerCase').replace('{n}', String(caseSize))}
          </p>
        )}
      </td>
      <td className="px-4 py-3 text-zinc-700">
        {isInvoice ? (
          <div>
            <input type="number" step={qtyStep} min="0" value={qty}
              onChange={e => onQtyChange?.(product.id, parseFloat(e.target.value) || 0)}
              className="w-20 rounded border border-slate-300 px-2 py-1 text-sm text-center focus:border-primary focus:outline-none focus:ring-1 focus:ring-blue-100" />
            {hasContainer && caseSize && qty > 0 && (
              <p className="mt-0.5 text-[10px] text-slate-400 text-center">
                {qty} × {caseSize} = {qty * caseSize} {t('prod_units')}
              </p>
            )}
          </div>
        ) : (
          <span className="font-medium text-zinc-900">{product.qty}</span>
        )}
      </td>
      {isInvoice && (
        <td className="px-4 py-3 font-semibold text-zinc-900">
          ${(qty * rate).toFixed(2)}
        </td>
      )}
      <td className="px-4 py-3">
        <span className={`font-semibold ${stockColor}`}>{product.stock}</span>
      </td>
      {qbBadge}
      {isAdmin && (
        <td className="px-4 py-3">
          <button
            onClick={() => onEdit(product)}
            title="Edit product"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-zinc-700 transition"
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