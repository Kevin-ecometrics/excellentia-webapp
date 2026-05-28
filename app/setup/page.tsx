'use client';

import { useState } from 'react';

export default function SetupPage() {
  const [log, setLog]       = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [done, setDone]     = useState(false);
  const [error, setError]   = useState<string | null>(null);

  async function runSetup() {
    setLoading(true);
    setLog([]);
    setError(null);

    try {
      const res  = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/setup`);
      const data = await res.json();

      if (data.ok) {
        setLog(data.log ?? []);
        setDone(true);
      } else {
        setLog(data.log ?? []);
        setError(data.error ?? 'Unknown error');
      }
    } catch (e: any) {
      setError(`Could not connect to the server: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-lg">

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg ring-1 ring-black/5 overflow-hidden">

          {/* Header */}
          <div className="bg-zinc-900 px-6 py-5">
            <h1 className="text-white text-lg font-bold tracking-tight">
              Excellentia — Initial Setup
            </h1>
            <p className="text-zinc-400 text-sm mt-0.5">
              Initialize the database tables and the admin user.
            </p>
          </div>

          {/* Body */}
          <div className="p-6 space-y-5">

            {/* Advertencia */}
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
              <p className="font-semibold mb-1">Run once only</p>
              <p className="text-amber-700">
                This process creates the tables and the admin user if they don't exist.
                It is safe to call multiple times — it never deletes existing data.
              </p>
            </div>

            {/* Botón */}
            {!done && (
              <button
                onClick={runSetup}
                disabled={loading}
                className="w-full rounded-xl bg-zinc-900 py-3 text-sm font-semibold text-white
                           hover:bg-zinc-800 transition disabled:opacity-50 disabled:cursor-not-allowed
                           flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    Initializing…
                  </>
                ) : (
                  'Initialize database'
                )}
              </button>
            )}

            {/* Log */}
            {log.length > 0 && (
              <div className="rounded-xl bg-zinc-950 p-4 font-mono text-xs space-y-1 overflow-x-auto">
                {log.map((line, i) => (
                  <p key={i} className={
                    line.startsWith('✅') ? 'text-emerald-400' :
                    line.startsWith('⚠️') ? 'text-amber-400'  :
                    line.startsWith('❌') ? 'text-red-400'    :
                    line.startsWith('🎉') ? 'text-sky-400 font-semibold mt-2' :
                    line.startsWith('   ') ? 'text-zinc-300 pl-2' :
                    line === ''  ? 'h-2' :
                    'text-zinc-400'
                  }>
                    {line || ' '}
                  </p>
                ))}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                <p className="font-semibold">Error!</p>
                <p className="mt-0.5 font-mono text-xs">{error}</p>
              </div>
            )}

            {/* Success — next steps */}
            {done && !error && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-4 space-y-3">
                <p className="text-sm font-semibold text-emerald-800">
                  🎉 Setup complete
                </p>
                <ol className="text-sm text-emerald-700 space-y-2 list-none">
                  <li className="flex gap-2">
                    <span className="font-bold">1.</span>
                    <span>
                      Connect QuickBooks →{' '}
                      <a
                        href={`${process.env.NEXT_PUBLIC_API_URL}/api/qb/auth`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline font-medium"
                      >
                        Open OAuth flow
                      </a>
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold">2.</span>
                    <span>
                      Sync products →{' '}
                      <a href="/products" className="underline font-medium">
                        Go to Products
                      </a>
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold">3.</span>
                    <span>
                      Configure company →{' '}
                      <a href="/settings" className="underline font-medium">
                        Go to Settings
                      </a>
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold">4.</span>
                    <span>
                      Sign in →{' '}
                      <a href="/login" className="underline font-medium">
                        Go to Login
                      </a>
                    </span>
                  </li>
                </ol>
              </div>
            )}

          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">
          Excellentia · Order Management System
        </p>
      </div>
    </div>
  );
}
