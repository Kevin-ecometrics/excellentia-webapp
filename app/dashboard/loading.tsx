export default function DashboardLoading() {
  return (
    <div className="animate-pulse">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="h-7 w-32 rounded-lg bg-slate-200" />
          <div className="mt-1.5 h-4 w-56 rounded bg-slate-100" />
        </div>
      </div>
      {/* KPI cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="h-3 w-24 rounded bg-slate-200" />
            <div className="mt-3 h-8 w-20 rounded-lg bg-slate-200" />
            <div className="mt-2 h-3 w-28 rounded bg-slate-100" />
          </div>
        ))}
      </div>
      {/* Charts */}
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 h-4 w-32 rounded bg-slate-200" />
            <div className="h-24 w-full rounded-lg bg-slate-100" />
          </div>
        ))}
      </div>
      {/* Bottom */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 h-4 w-36 rounded bg-slate-200" />
            {[...Array(4)].map((_, j) => (
              <div key={j} className="mb-3 flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-slate-200" />
                <div className="flex-1 h-3 rounded bg-slate-100" />
                <div className="h-3 w-16 rounded bg-slate-200" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
