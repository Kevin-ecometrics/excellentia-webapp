export default function UsersLoading() {
  return (
    <div className="animate-pulse">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="h-7 w-24 rounded bg-[var(--ec-border-strong)]" />
          <div className="mt-1.5 h-4 w-48 rounded bg-[var(--ec-surface-alt)]" />
        </div>
        <div className="h-10 w-36 rounded bg-[var(--ec-border-strong)]" />
      </div>
      <div className="rounded-md border border-[var(--ec-border)] bg-white overflow-hidden">
        <div className="border-b border-[var(--ec-border)] bg-[var(--ec-surface-alt)] px-4 py-3 flex gap-6">
          {[100, 160, 60, 80].map((w, i) => (
            <div key={i} className="h-3 rounded bg-[var(--ec-border-strong)]" style={{ width: w }} />
          ))}
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="border-b border-[var(--ec-divider)] px-4 py-4 flex gap-6 items-center">
            <div className="flex items-center gap-3 flex-1">
              <div className="h-8 w-8 rounded-full bg-[var(--ec-border-strong)]" />
              <div className="h-4 w-28 rounded bg-[var(--ec-border-strong)]" />
            </div>
            <div className="h-4 w-40 rounded bg-[var(--ec-surface-alt)]" />
            <div className="h-5 w-20 rounded-full bg-[var(--ec-surface-alt)]" />
            <div className="h-4 w-24 rounded bg-[var(--ec-surface-alt)]" />
            <div className="ml-auto flex gap-2">
              <div className="h-8 w-16 rounded bg-[var(--ec-surface-alt)]" />
              <div className="h-8 w-20 rounded bg-[var(--ec-surface-alt)]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
