export default function ProductsLoading() {
  return (
    <div className="animate-pulse">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="h-7 w-28 rounded-lg bg-slate-200" />
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
      <div className="mb-4 h-10 w-full rounded-lg bg-slate-200" />
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 flex gap-6">
          {[160, 60, 100, 80, 60, 40].map((w, i) => (
            <div key={i} className="h-3 rounded bg-slate-200" style={{ width: w }} />
          ))}
        </div>
        {[...Array(8)].map((_, i) => (
          <div key={i} className="border-b border-slate-100 px-4 py-3.5 flex gap-6 items-center">
            <div className="flex-1 h-4 rounded bg-slate-200" />
            <div className="h-7 w-16 rounded-lg bg-slate-100" />
            <div className="h-7 w-28 rounded-lg bg-slate-100" />
            <div className="h-7 w-16 rounded-lg bg-slate-100" />
            <div className="h-7 w-20 rounded-lg bg-slate-100" />
            <div className="h-5 w-10 rounded-md bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  )
}
