'use client'

import { useLang } from '@/app/_components/LangProvider'

interface Props {
  title: string
  body: React.ReactNode
  confirming: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmModal({ title, body, confirming, onConfirm, onCancel }: Props) {
  const { t } = useLang()
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[rgba(0,51,50,.5)]" onClick={!confirming ? onCancel : undefined} />
      <div className="relative w-full max-w-sm rounded-lg bg-white shadow-2xl">
        <div className="flex items-start gap-4 rounded-t-lg bg-[var(--ec-warn-bg)] px-6 py-5 border-b border-[var(--ec-warn-border)]">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--ec-warn-ink)]/15">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--ec-warn-ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <h2 className="text-base font-bold text-[var(--ec-ink)]">{title}</h2>
        </div>
        <div className="px-6 py-5">
          <p className="text-sm text-[var(--ec-muted)]">{body}</p>
        </div>
        <div className="flex items-center justify-end gap-3 rounded-b-lg border-t border-[var(--ec-border)] bg-[var(--ec-surface-alt)] px-6 py-4">
          <button onClick={onCancel} disabled={confirming}
            className="rounded border border-[var(--ec-border-strong)] bg-white px-4 py-2.5 text-sm font-bold text-[var(--ec-ink)] hover:bg-[var(--ec-surface-alt)] transition disabled:opacity-50">
            {t('common_cancel')}
          </button>
          <button onClick={onConfirm} disabled={confirming}
            className="rounded bg-primary px-4 py-2.5 text-sm font-extrabold text-white hover:bg-primary-dark active:scale-[0.98] transition disabled:opacity-60">
            {confirming ? t('common_saving') : t('wh_confirm')}
          </button>
        </div>
      </div>
    </div>
  )
}
