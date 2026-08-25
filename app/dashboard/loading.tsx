export default function DashboardLoading() {
  return (
    <div className="animate-pulse">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="h-7 w-32 rounded bg-[var(--ec-border-strong)]" />
          <div className="mt-1.5 h-4 w-56 rounded bg-[var(--ec-surface-alt)]" />
        </div>
      </div>
      {/* KPI cards */}
      <div className="mb-6 grid grid-cols-2 gap-px bg-[var(--ec-border)] border border-[var(--ec-border)] rounded-md overflow-hidden lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white p-5">
            <div className="h-3 w-24 rounded bg-[var(--ec-border-strong)]" />
            <div className="mt-3 h-8 w-20 rounded bg-[var(--ec-border-strong)]" />
            <div className="mt-2 h-3 w-28 rounded bg-[var(--ec-surface-alt)]" />
          </div>
        ))}
      </div>
      {/* Charts */}
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="rounded-md border border-[var(--ec-border)] bg-white p-5">
            <div className="mb-4 h-4 w-32 rounded bg-[var(--ec-border-strong)]" />
            <div className="h-24 w-full rounded bg-[var(--ec-surface-alt)]" />
          </div>
        ))}
      </div>
      {/* Bottom */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="rounded-md border border-[var(--ec-border)] bg-white p-5">
            <div className="mb-4 h-4 w-36 rounded bg-[var(--ec-border-strong)]" />
            {[...Array(4)].map((_, j) => (
              <div key={j} className="mb-3 flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-[var(--ec-border-strong)]" />
                <div className="flex-1 h-3 rounded bg-[var(--ec-surface-alt)]" />
                <div className="h-3 w-16 rounded bg-[var(--ec-border-strong)]" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
