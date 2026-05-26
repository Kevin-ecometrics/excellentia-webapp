export default function SettingsLoading() {
  return (
    <div className="animate-pulse">
      <div className="mb-6">
        <div className="h-7 w-32 rounded-lg bg-slate-200" />
        <div className="mt-1.5 h-4 w-56 rounded bg-slate-100" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="h-4 w-32 rounded bg-slate-200" />
          {[...Array(5)].map((_, i) => (
            <div key={i}>
              <div className="mb-1.5 h-3 w-16 rounded bg-slate-200" />
              <div className="h-10 w-full rounded-lg bg-slate-100" />
            </div>
          ))}
          <div className="flex justify-end pt-2">
            <div className="h-10 w-36 rounded-lg bg-slate-200" />
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="h-4 w-36 rounded bg-slate-200 mb-5" />
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 space-y-2">
            <div className="mx-auto h-5 w-40 rounded bg-slate-200" />
            <div className="mx-auto h-4 w-28 rounded bg-slate-100" />
            <div className="mx-auto h-4 w-24 rounded bg-slate-100" />
            <div className="my-3 border-t border-dashed border-slate-200" />
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-1">
                <div className="h-3 w-32 rounded bg-slate-200" />
                <div className="h-3 w-20 rounded bg-slate-100" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
