export default function CustomersLoading() {
  return (
    <div className="animate-pulse">
      <div className="mb-6">
        <div className="h-7 w-24 rounded bg-[var(--ec-border-strong)]" />
        <div className="mt-1.5 h-4 w-56 rounded bg-[var(--ec-surface-alt)]" />
      </div>
      <div className="mb-5 grid grid-cols-2 gap-px bg-[var(--ec-border)] border border-[var(--ec-border)] rounded-md overflow-hidden sm:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white p-4">
            <div className="h-3 w-20 rounded bg-[var(--ec-border-strong)]" />
            <div className="mt-2 h-7 w-16 rounded bg-[var(--ec-border-strong)]" />
          </div>
        ))}
      </div>
      <div className="mb-4 h-10 w-full rounded bg-[var(--ec-border-strong)]" />
      <div className="rounded-md border border-[var(--ec-border)] bg-white overflow-hidden">
        <div className="border-b border-[var(--ec-border)] bg-[var(--ec-surface-alt)] px-4 py-3 flex gap-6">
          {[140, 80, 60, 80, 100].map((w, i) => (
            <div key={i} className="h-3 rounded bg-[var(--ec-border-strong)]" style={{ width: w }} />
          ))}
        </div>
        {[...Array(6)].map((_, i) => (
          <div key={i} className="border-b border-[var(--ec-divider)] px-4 py-4 flex gap-6 items-center">
            <div className="flex items-center gap-3 flex-1">
              <div className="h-8 w-8 rounded-full bg-[var(--ec-border-strong)]" />
              <div className="h-4 w-36 rounded bg-[var(--ec-border-strong)]" />
            </div>
            <div className="h-4 w-16 rounded bg-[var(--ec-surface-alt)]" />
            <div className="h-4 w-12 rounded bg-[var(--ec-surface-alt)]" />
            <div className="h-4 w-20 rounded bg-[var(--ec-border-strong)]" />
            <div className="h-4 w-24 rounded bg-[var(--ec-surface-alt)]" />
          </div>
        ))}
      </div>
    </div>
  )
}
