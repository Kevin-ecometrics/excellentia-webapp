export default function ProductsLoading() {
  return (
    <div className="animate-pulse">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="h-7 w-28 rounded bg-[var(--ec-border-strong)]" />
          <div className="mt-1.5 h-4 w-40 rounded bg-[var(--ec-surface-alt)]" />
        </div>
        <div className="h-10 w-36 rounded bg-[var(--ec-border-strong)]" />
      </div>
      <div className="mb-5 grid grid-cols-2 gap-px bg-[var(--ec-border)] border border-[var(--ec-border)] rounded-md overflow-hidden sm:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white p-4">
            <div className="h-3 w-16 rounded bg-[var(--ec-border-strong)]" />
            <div className="mt-2 h-7 w-10 rounded bg-[var(--ec-border-strong)]" />
          </div>
        ))}
      </div>
      <div className="mb-4 h-10 w-full rounded bg-[var(--ec-border-strong)]" />
      <div className="rounded-md border border-[var(--ec-border)] bg-white overflow-hidden">
        <div className="border-b border-[var(--ec-border)] bg-[var(--ec-surface-alt)] px-4 py-3 flex gap-6">
          {[160, 60, 100, 80, 60, 40].map((w, i) => (
            <div key={i} className="h-3 rounded bg-[var(--ec-border-strong)]" style={{ width: w }} />
          ))}
        </div>
        {[...Array(8)].map((_, i) => (
          <div key={i} className="border-b border-[var(--ec-divider)] px-4 py-3.5 flex gap-6 items-center">
            <div className="flex-1 h-4 rounded bg-[var(--ec-border-strong)]" />
            <div className="h-7 w-16 rounded bg-[var(--ec-surface-alt)]" />
            <div className="h-7 w-28 rounded bg-[var(--ec-surface-alt)]" />
            <div className="h-7 w-16 rounded bg-[var(--ec-surface-alt)]" />
            <div className="h-7 w-20 rounded bg-[var(--ec-surface-alt)]" />
            <div className="h-5 w-10 rounded bg-[var(--ec-surface-alt)]" />
          </div>
        ))}
      </div>
    </div>
  )
}
