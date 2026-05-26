export default function OrdersLoading() {
  return (
    <div className="animate-pulse">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="h-7 w-24 rounded-lg bg-slate-200" />
          <div className="mt-1.5 h-4 w-40 rounded bg-slate-100" />
        </div>
        <div className="h-10 w-36 rounded-lg bg-slate-200" />
      </div>
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="h-3 w-16 rounded bg-slate-200" />
            <div className="mt-2 h-7 w-10 rounded bg-slate-200" />
          </div>
        ))}
      </div>
      <div className="mb-4 flex gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-8 w-24 rounded-full bg-slate-200" />
        ))}
      </div>
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 flex gap-4">
          {[120, 80, 60, 60, 60, 80, 60].map((w, i) => (
            <div key={i} className={`h-3 rounded bg-slate-200`} style={{ width: w }} />
          ))}
        </div>
        {[...Array(6)].map((_, i) => (
          <div key={i} className="border-b border-slate-100 px-4 py-4 flex gap-4 items-center">
            <div className="h-4 w-28 rounded bg-slate-200" />
            <div className="h-4 w-24 rounded bg-slate-100" />
            <div className="h-5 w-12 rounded-full bg-slate-100" />
            <div className="h-4 w-16 rounded bg-slate-200" />
            <div className="h-5 w-20 rounded-full bg-slate-100" />
            <div className="h-4 w-24 rounded bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  )
}
