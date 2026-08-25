'use client'

import { useLang } from '@/app/_components/LangProvider'

interface Props {
  onClose: () => void
}

// Explica cómo se interpretan Price / Min Price / Weight / Qty según el `unit`
// del producto — misma regla que usa el backend para facturar (creditCalculator.ts
// computeDamageCredit) y Android para calcular el total al vender
// (ProductDetailActivity.recalcTotal): Lbs y Bucket cobran el `price` tal cual
// (× libras o × buckets vendidos); Case/Unit cobra el `price` por caja completa
// (× cajas vendidas) — el precio por unidad individual dentro de la caja
// (`price / qty`) es solo informativo, nunca lo que se cobra.
export default function PricingInfoModal({ onClose }: Props) {
  const { t } = useLang()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[rgba(0,51,50,.5)]" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl rounded-lg bg-[#f9efe8] p-6 shadow-2xl max-h-[85vh] overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-[var(--ec-ink)]">{t('prod_infoTitle')}</h2>
          <button onClick={onClose} className="rounded p-1.5 text-[var(--ec-faint)] hover:bg-white hover:text-[var(--ec-ink)] transition">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <p className="mb-5 text-sm text-[var(--ec-muted)]">{t('prod_infoIntro')}</p>

        <div className="grid gap-4 sm:grid-cols-3">
          {/* Lbs */}
          <div className="rounded-md border border-[var(--ec-border)] bg-white p-4">
            <p className="mb-2 inline-flex items-center rounded bg-primary-50 px-2 py-0.5 text-xs font-bold text-primary">Lbs</p>
            <ul className="space-y-2 text-xs text-[var(--ec-muted)]">
              <li><span className="font-semibold text-[var(--ec-ink)]">{t('prod_colPrice')}:</span> {t('prod_infoLbsPrice')}</li>
              <li><span className="font-semibold text-[var(--ec-ink)]">{t('prod_colMinPrice')}:</span> {t('prod_infoLbsMin')}</li>
              <li><span className="font-semibold text-[var(--ec-ink)]">{t('prod_colWeight')}:</span> {t('prod_infoLbsWeight')}</li>
            </ul>
            <p className="mt-3 rounded bg-[var(--ec-surface-alt)] px-2 py-1.5 font-mono text-[11px] text-[var(--ec-ink)]">
              {t('prod_infoLbsFormula')}
            </p>
          </div>

          {/* Case/Unit */}
          <div className="rounded-md border border-[var(--ec-border)] bg-white p-4">
            <p className="mb-2 inline-flex items-center rounded bg-[var(--ec-warn-bg)] px-2 py-0.5 text-xs font-bold text-[var(--ec-warn-ink)]">Case/Unit</p>
            <ul className="space-y-2 text-xs text-[var(--ec-muted)]">
              <li><span className="font-semibold text-[var(--ec-ink)]">{t('prod_colPrice')}:</span> {t('prod_infoCaseUnitPrice')}</li>
              <li><span className="font-semibold text-[var(--ec-ink)]">{t('prod_colQty')}:</span> {t('prod_infoCaseUnitQty')}</li>
              <li><span className="font-semibold text-[var(--ec-ink)]">{t('prod_infoRate')}:</span> {t('prod_infoCaseUnitRate')}</li>
              <li><span className="font-semibold text-[var(--ec-ink)]">{t('prod_colMinPrice')}:</span> {t('prod_infoCaseUnitMin')}</li>
            </ul>
            <p className="mt-3 rounded bg-[var(--ec-surface-alt)] px-2 py-1.5 font-mono text-[11px] text-[var(--ec-ink)]">
              {t('prod_infoCaseUnitFormula')}
            </p>
            <p className="mt-2 text-[11px] italic text-[var(--ec-faint)]">{t('prod_infoCaseUnitExample')}</p>
          </div>

          {/* Bucket */}
          <div className="rounded-md border border-[var(--ec-border)] bg-white p-4">
            <p className="mb-2 inline-flex items-center rounded bg-[var(--ec-success-bg)] px-2 py-0.5 text-xs font-bold text-[var(--ec-success-ink)]">Bucket</p>
            <ul className="space-y-2 text-xs text-[var(--ec-muted)]">
              <li><span className="font-semibold text-[var(--ec-ink)]">{t('prod_colPrice')}:</span> {t('prod_infoBucketPrice')}</li>
              <li><span className="font-semibold text-[var(--ec-ink)]">{t('prod_colMinPrice')}:</span> {t('prod_infoBucketMin')}</li>
              <li><span className="font-semibold text-[var(--ec-ink)]">{t('prod_colWeight')}:</span> {t('prod_infoBucketWeight')}</li>
            </ul>
            <p className="mt-3 rounded bg-[var(--ec-surface-alt)] px-2 py-1.5 font-mono text-[11px] text-[var(--ec-ink)]">
              {t('prod_infoBucketFormula')}
            </p>
          </div>
        </div>

        <p className="mt-5 text-[11px] text-[var(--ec-faint)]">{t('prod_infoNote')}</p>
      </div>
    </div>
  )
}
