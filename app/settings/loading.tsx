export default function SettingsLoading() {
  return (
    <div className="animate-pulse">
      <div className="mb-6">
        <div className="h-7 w-32 rounded bg-[var(--ec-border-strong)]" />
        <div className="mt-1.5 h-4 w-56 rounded bg-[var(--ec-surface-alt)]" />
      </div>
      <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-2">
        <div className="rounded-md border border-[var(--ec-border)] bg-white p-6 space-y-4">
          <div className="h-4 w-32 rounded bg-[var(--ec-border-strong)]" />
          {[...Array(5)].map((_, i) => (
            <div key={i}>
              <div className="mb-1.5 h-3 w-16 rounded bg-[var(--ec-border-strong)]" />
              <div className="h-10 w-full rounded bg-[var(--ec-surface-alt)]" />
            </div>
          ))}
          <div className="flex justify-end pt-2">
            <div className="h-10 w-36 rounded bg-[var(--ec-border-strong)]" />
          </div>
        </div>
        <div className="rounded-md border border-[var(--ec-border)] bg-white p-6">
          <div className="h-4 w-36 rounded bg-[var(--ec-border-strong)] mb-5" />
          <div className="rounded border border-dashed border-[var(--ec-border)] bg-[#f9efe8] p-4 space-y-2">
            <div className="mx-auto h-5 w-40 rounded bg-[var(--ec-border-strong)]" />
            <div className="mx-auto h-4 w-28 rounded bg-[var(--ec-surface-alt)]" />
            <div className="mx-auto h-4 w-24 rounded bg-[var(--ec-surface-alt)]" />
            <div className="my-3 border-t border-dashed border-[var(--ec-border-strong)]" />
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-1">
                <div className="h-3 w-32 rounded bg-[var(--ec-border-strong)]" />
                <div className="h-3 w-20 rounded bg-[var(--ec-surface-alt)]" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
