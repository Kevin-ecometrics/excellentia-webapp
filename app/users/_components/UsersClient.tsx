'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { UserRow } from '../page'
import { getToken } from '@/app/lib/auth'
import { useLang } from '@/app/_components/LangProvider'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

interface Props {
  users: UserRow[]
  fetchError: string
}

interface EditState {
  id: number
  email: string
  name: string
  role: 'operator' | 'admin'
  password: string
}

const roleBadge: Record<string, string> = {
  admin:    'bg-blue-100 text-blue-700',
  operator: 'bg-slate-100 text-slate-600',
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch { return '' }
}

// ── Confirmation modal ────────────────────────────────────────────────────
function DeleteModal({
  user,
  deleting,
  onConfirm,
  onCancel,
}: {
  user: UserRow
  deleting: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const { t } = useLang()
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={!deleting ? onCancel : undefined}
      />
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-start gap-4 rounded-t-2xl bg-red-50 px-6 py-5 border-b border-red-100">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6M14 11v6"/>
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
          </div>
          <div>
            <h2 className="text-base font-semibold text-zinc-900">{t('usr_delTitle')}</h2>
            <p className="mt-0.5 text-sm text-slate-500">{t('usr_delSubtitle')}</p>
          </div>
        </div>
        <div className="px-6 py-5">
          <p className="text-sm text-slate-600">{t('usr_delBody')}</p>
          <div className="mt-3 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-bold text-slate-600 uppercase">
              {user.email[0]}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-zinc-900">{user.email}</p>
              <p className="text-xs text-slate-400">{user.role === 'admin' ? t('usr_admin') : t('usr_operator')} · {fmtDate(user.created_at)}</p>
            </div>
          </div>
          <p className="mt-4 text-xs text-slate-400">{t('usr_delNote')}</p>
        </div>
        <div className="flex items-center justify-end gap-3 rounded-b-2xl border-t border-slate-100 bg-slate-50 px-6 py-4">
          <button onClick={onCancel} disabled={deleting}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-300 transition disabled:opacity-50">
            {t('common_cancel')}
          </button>
          <button onClick={onConfirm} disabled={deleting}
            className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700 active:scale-[0.98] transition disabled:opacity-60">
            {deleting ? (
              <>
                <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
                {t('usr_deleting')}
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                </svg>
                {t('usr_delConfirm')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Componente principal ─────────────────────────────────────────────────────
export default function UsersClient({ users, fetchError }: Props) {
  const router = useRouter()
  const { t } = useLang()

  // Create
  const [showForm, setShowForm] = useState(false)
  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [role, setRole]         = useState<'operator' | 'admin'>('operator')
  const [creating, setCreating] = useState(false)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Edit
  const [editing, setEditing] = useState<EditState | null>(null)
  const [saving, setSaving]   = useState(false)

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null)
  const [deleting, setDeleting]         = useState(false)

  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)

  function flash(text: string, ok: boolean) {
    setMsg({ text, ok })
    setTimeout(() => setMsg(null), 4000)
  }

  function startEdit(u: UserRow) {
    setEditing({ id: u.id, email: u.email, name: u.name ?? '', role: u.role, password: '' })
  }

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  function validateCreate(): boolean {
    const errs: Record<string, string> = {}
    if (!email.trim() || !EMAIL_RE.test(email.trim())) errs.email = t('val_emailInvalid')
    if (password.length < 6) errs.password = t('val_pwMin')
    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!validateCreate()) return
    setCreating(true)
    try {
      const res = await fetch(`${API}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ email: email.trim(), name: name.trim() || undefined, password, role }),
      })
      if (res.status === 401) { document.cookie = 'jwt=; path=/; max-age=0'; window.location.href = '/login'; return }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? `Error ${res.status}`)
      }
      flash(t('usr_created'), true)
      setName(''); setEmail(''); setPassword(''); setRole('operator'); setShowForm(false); setFormErrors({})
      router.refresh()
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Error creating user', false)
    } finally {
      setCreating(false)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!editing) return
    setSaving(true)
    try {
      const body: Record<string, string | null> = { email: editing.email, name: editing.name || null, role: editing.role }
      if (editing.password) body.password = editing.password

      const res = await fetch(`${API}/api/users/${editing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(body),
      })
      if (res.status === 401) { document.cookie = 'jwt=; path=/; max-age=0'; window.location.href = '/login'; return }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? `Error ${res.status}`)
      }
      flash(t('usr_updated'), true)
      setEditing(null)
      router.refresh()
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Error saving', false)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`${API}/api/users/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      if (res.status === 401) { document.cookie = 'jwt=; path=/; max-age=0'; window.location.href = '/login'; return }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? `Error ${res.status}`)
      }
      flash(`${deleteTarget.email} ${t('usr_deleted')}`, true)
      setDeleteTarget(null)
      router.refresh()
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Error deleting', false)
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      {/* Confirmation modal */}
      {deleteTarget && (
        <DeleteModal
          user={deleteTarget}
          deleting={deleting}
          onConfirm={handleDelete}
          onCancel={() => !deleting && setDeleteTarget(null)}
        />
      )}

      <div>
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">{t('usr_title')}</h1>
            <p className="mt-0.5 text-sm text-slate-500">{users.length} {t('usr_count')}</p>
          </div>
          <button
            onClick={() => { setShowForm(v => !v); setMsg(null) }}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm ring-1 ring-blue-600/20 hover:bg-blue-700 active:scale-[0.98] transition"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            {showForm ? t('common_cancel') : t('usr_new')}
          </button>
        </div>

        {/* Alerts */}
        {msg && (
          <div className={`mb-4 rounded-lg px-4 py-3 text-sm font-medium ${msg.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {msg.text}
          </div>
        )}
        {fetchError && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{fetchError}</div>
        )}

        {/* Create form */}
        {showForm && (
          <form onSubmit={handleCreate} className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-5">
            <p className="mb-4 text-sm font-semibold text-zinc-900">{t('usr_formTitle')}</p>
            <div className="grid gap-3 sm:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">{t('usr_name')}</label>
                <input
                  type="text" value={name}
                  onChange={e => setName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">{t('usr_email')}</label>
                <input
                  type="text" value={email}
                  onChange={e => { setEmail(e.target.value); setFormErrors(prev => ({ ...prev, email: '' })) }}
                    placeholder="operator@company.com"
                  className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${formErrors.email ? 'border-red-300 bg-red-50 focus:border-red-400 focus:ring-red-100' : 'border-slate-300 bg-white focus:border-primary focus:ring-blue-100'}`}
                />
                {formErrors.email && <p className="mt-1 text-xs text-red-600">{formErrors.email}</p>}
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">{t('usr_password')}</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'} value={password}
                    onChange={e => { setPassword(e.target.value); setFormErrors(prev => ({ ...prev, password: '' })) }}
                    placeholder={t('usr_pwPh')}
                    className={`w-full rounded-lg border px-3 py-2 pr-9 text-sm focus:outline-none focus:ring-2 ${formErrors.password ? 'border-red-300 bg-red-50 focus:border-red-400 focus:ring-red-100' : 'border-slate-300 bg-white focus:border-primary focus:ring-blue-100'}`}
                  />
                  <button type="button" onClick={() => setShowPw(v => !v)} tabIndex={-1}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-zinc-600 transition">
                    {showPw
                      ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    }
                  </button>
                </div>
                {formErrors.password
                  ? <p className="mt-1 text-xs text-red-600">{formErrors.password}</p>
                  : password.length > 0 && (
                    <div className="mt-1 flex items-center gap-1.5">
                      <div className="h-1 flex-1 rounded-full bg-slate-200 overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${password.length >= 10 ? 'bg-green-500 w-full' : password.length >= 6 ? 'bg-amber-400 w-2/3' : 'bg-red-400 w-1/3'}`} />
                      </div>
                      <span className={`text-[10px] font-medium ${password.length >= 10 ? 'text-green-600' : password.length >= 6 ? 'text-amber-600' : 'text-red-500'}`}>
                        {password.length >= 10 ? t('val_pwStrong') : password.length >= 6 ? t('val_pwFair') : t('val_pwWeak')}
                      </span>
                    </div>
                  )
                }
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">{t('usr_role')}</label>
                <select
                  value={role} onChange={e => setRole(e.target.value as 'operator' | 'admin')}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="operator">{t('usr_operator')}</option>
                  <option value="admin">{t('usr_admin')}</option>
                </select>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button type="submit" disabled={creating}
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 active:scale-[0.98] transition disabled:opacity-60">
                {creating ? t('usr_creating') : t('usr_create')}
              </button>
            </div>
          </form>
        )}

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-300 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{t('usr_colName')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{t('usr_colEmail')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{t('usr_colRole')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{t('usr_colCreated')}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map(u => (
                <React.Fragment key={u.id}>
                  {/* Fila normal */}
                  <tr className={`transition-colors ${editing?.id === u.id ? 'bg-amber-50' : 'hover:bg-slate-50'}`}>
                    {/* Nombre */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500 uppercase">
                          {(u.name ?? u.email)[0]}
                        </div>
                        <span className="font-medium text-zinc-900">
                          {u.name ?? <span className="text-slate-400 italic">{t('usr_noName')}</span>}
                        </span>
                      </div>
                    </td>
                    {/* Email */}
                    <td className="px-4 py-3 text-sm text-slate-600">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${roleBadge[u.role] ?? 'bg-slate-100 text-slate-500'}`}>
                        {u.role === 'admin' ? t('usr_admin') : t('usr_operator')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{fmtDate(u.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      {editing?.id === u.id ? (
                        <span className="text-xs font-medium text-amber-600">{t('usr_editing')}</span>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => startEdit(u)}
                            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50 hover:border-slate-300 transition">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                            {t('common_edit')}
                          </button>
                          <button onClick={() => { setEditing(null); setDeleteTarget(u) }}
                            className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 shadow-sm hover:bg-red-50 hover:border-red-300 transition">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"/>
                              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                            </svg>
                            {t('common_delete')}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>

                  {/* Expanded edit row */}
                  {editing?.id === u.id && (
                    <tr key={`edit-${u.id}`}>
                      <td colSpan={5} className="bg-amber-50 px-4 pb-4 pt-0">
                        <form onSubmit={handleSave} className="rounded-xl border border-amber-200 bg-white p-4">
                          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-amber-700">{t('usr_editTitle')}</p>
                          <div className="grid gap-3 sm:grid-cols-4">
                            <div>
                              <label className="mb-1 block text-xs font-medium text-slate-600">{t('usr_name')}</label>
                              <input
                                type="text" value={editing.name}
                                onChange={e => setEditing({ ...editing, name: e.target.value })}
                placeholder="John Doe"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-medium text-slate-600">{t('usr_email')}</label>
                              <input
                                type="email" required value={editing.email}
                                onChange={e => setEditing({ ...editing, email: e.target.value })}
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-medium text-slate-600">{t('usr_role')}</label>
                              <select
                                value={editing.role}
                                onChange={e => setEditing({ ...editing, role: e.target.value as 'operator' | 'admin' })}
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                              >
                                <option value="operator">{t('usr_operator')}</option>
                                <option value="admin">{t('usr_admin')}</option>
                              </select>
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-medium text-slate-600">
                                {t('usr_newPw')} <span className="font-normal text-slate-400">{t('usr_newPwOpt')}</span>
                              </label>
                              <input
                                type="password" minLength={6} value={editing.password}
                                onChange={e => setEditing({ ...editing, password: e.target.value })}
                                placeholder={t('usr_pwKeep')}
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                              />
                            </div>
                          </div>
                          <div className="mt-3 flex justify-end gap-2">
                            <button type="button" onClick={() => setEditing(null)}
                              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition">
                              {t('common_cancel')}
                            </button>
                            <button type="submit" disabled={saving}
                              className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-600 active:scale-[0.98] transition disabled:opacity-60">
                              {saving ? (
                                <>
                                  <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                                  </svg>
                                  {t('usr_saving')}
                                </>
                              ) : t('usr_saveChanges')}
                            </button>
                          </div>
                        </form>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              {users.length === 0 && !fetchError && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-sm text-slate-400">
                    {t('usr_empty')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
