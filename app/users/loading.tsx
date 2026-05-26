export default function UsersLoading() {
  return (
    <div className="animate-pulse">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="h-7 w-24 rounded-lg bg-slate-200" />
          <div className="mt-1.5 h-4 w-48 rounded bg-slate-100" />
        </div>
        <div className="h-10 w-36 rounded-lg bg-slate-200" />
      </div>
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 flex gap-6">
          {[100, 160, 60, 80].map((w, i) => (
            <div key={i} className="h-3 rounded bg-slate-200" style={{ width: w }} />
          ))}
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="border-b border-slate-100 px-4 py-4 flex gap-6 items-center">
            <div className="flex items-center gap-3 flex-1">
              <div className="h-8 w-8 rounded-full bg-slate-200" />
              <div className="h-4 w-28 rounded bg-slate-200" />
            </div>
            <div className="h-4 w-40 rounded bg-slate-100" />
            <div className="h-5 w-20 rounded-full bg-slate-100" />
            <div className="h-4 w-24 rounded bg-slate-100" />
            <div className="ml-auto flex gap-2">
              <div className="h-8 w-16 rounded-lg bg-slate-100" />
              <div className="h-8 w-20 rounded-lg bg-slate-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
