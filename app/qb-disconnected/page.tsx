export default function QbDisconnectedPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-10 shadow-sm border border-slate-200 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.181 8.68a4.503 4.503 0 0 1 1.903 6.405m-9.768-3.782L3 9m4.136 2.682L3 15M12 3c4.97 0 9 4.03 9 9s-4.03 9-9 9-9-4.03-9-9 4.03-9 9-9Zm0 4.5v4.5l2.25 2.25" />
          </svg>
        </div>

        <h1 className="mb-2 text-xl font-semibold text-slate-800">
          QuickBooks desconectado
        </h1>
        <p className="mb-8 text-sm text-slate-500">
          La conexión con QuickBooks Online ha sido revocada. Los datos existentes se conservan, pero la sincronización automática está detenida hasta que vuelvas a conectar.
        </p>

        <div className="flex flex-col gap-3">
          <a
            href="/dashboard"
            className="block w-full rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-700 transition-colors"
          >
            Ir al dashboard
          </a>
          <a
            href="/api/qb/auth"
            className="block w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Volver a conectar QuickBooks
          </a>
        </div>
      </div>
    </div>
  )
}
