import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Wordmark } from '../../components/Logo'
import { Alert, Button, Empty, Field, Modal, Spinner } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { fetchOpsSchools, removeOpsSchool, schoolsToCsv, type OpsSchool } from '../../lib/ops'
import { ROLE_HOME } from '../../lib/types'

type Filter = 'all' | 'trial' | 'active' | 'lapsed' | 'quiet'

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10)
  return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}

function daysLeft(iso: string | null | undefined): number | null {
  if (!iso) return null
  const d = new Date(iso).getTime()
  if (Number.isNaN(d)) return null
  return Math.ceil((d - Date.now()) / 86_400_000)
}

function statusOf(r: OpsSchool): 'trial' | 'active' | 'lapsed' {
  const s = r.subscription_status
  if (s === 'active') return 'active'
  if (s === 'lapsed' || s === 'past_due' || s === 'cancelled') return 'lapsed'
  return 'trial'
}

function StatusMark({ status }: { status: string }) {
  const s = status === 'active' ? 'active' : status === 'trial' ? 'trial' : 'lapsed'
  const cls =
    s === 'active'
      ? 'text-present border-present/30 bg-present/8'
      : s === 'trial'
        ? 'text-late border-late/35 bg-late/10'
        : 'text-ink-faint border-rule bg-surface-alt'
  return (
    <span
      className={`inline-flex items-center h-6 px-2 rounded-sm border text-[11px] font-mono uppercase tracking-[0.1em] ${cls}`}
    >
      {s}
    </span>
  )
}

export default function OpsDesk() {
  const { session, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [rows, setRows] = useState<OpsSchool[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [openId, setOpenId] = useState<string | null>(null)
  const [removing, setRemoving] = useState<OpsSchool | null>(null)
  const [confirmName, setConfirmName] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      setRows(await fetchOpsSchools())
    } catch (e) {
      const msg = (e as Error).message
      setError(
        /could not find the function|does not exist|forbidden/i.test(msg)
          ? 'Paste APPLY_RUN17.sql in the Supabase SQL Editor, then hard-refresh.'
          : msg,
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return rows.filter((r) => {
      const s = statusOf(r)
      if (filter === 'trial' && s !== 'trial') return false
      if (filter === 'active' && s !== 'active') return false
      if (filter === 'lapsed' && s !== 'lapsed') return false
      if (filter === 'quiet' && r.last_register) return false
      if (!needle) return true
      return [r.name, r.slug, r.phone, r.address, r.proprietor_name, r.proprietor_email, r.proprietor_phone]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle))
    })
  }, [rows, q, filter])

  const totals = useMemo(() => {
    const trial = rows.filter((r) => statusOf(r) === 'trial').length
    const active = rows.filter((r) => statusOf(r) === 'active').length
    const lapsed = rows.filter((r) => statusOf(r) === 'lapsed').length
    const quiet = rows.filter((r) => !r.last_register).length
    const students = rows.reduce((n, r) => n + (r.students || 0), 0)
    const parents = rows.reduce((n, r) => n + (r.parents || 0), 0)
    return { trial, active, lapsed, quiet, students, parents }
  }, [rows])

  function downloadCsv() {
    const blob = new Blob([schoolsToCsv(shown)], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `daymaark-schools-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  async function confirmRemove() {
    if (!removing) return
    setBusy(true)
    setError(null)
    try {
      await removeOpsSchool(removing.id, confirmName)
      setNotice(`${removing.name} is gone.`)
      setRemoving(null)
      setConfirmName('')
      setOpenId(null)
      await load()
    } catch (e) {
      const msg = (e as Error).message
      setError(
        /could not find the function|does not exist/i.test(msg)
          ? 'Paste APPLY_RUN18.sql, then try again.'
          : msg,
      )
    } finally {
      setBusy(false)
    }
  }

  const office = profile?.role ? ROLE_HOME[profile.role] : '/admin'
  const filters: { id: Filter; label: string; n: number }[] = [
    { id: 'all', label: 'All', n: rows.length },
    { id: 'trial', label: 'Trial', n: totals.trial },
    { id: 'active', label: 'Active', n: totals.active },
    { id: 'lapsed', label: 'Lapsed', n: totals.lapsed },
    { id: 'quiet', label: 'Never marked', n: totals.quiet },
  ]

  return (
    <div className="min-h-dvh bg-paper">
      <header className="bg-ink text-ink-invert">
        <div className="mx-auto max-w-5xl px-5 h-16 flex items-center gap-4">
          <Wordmark size="sm" className="text-ink-invert" />
          <span className="h-5 w-px bg-ink-invert/20" />
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-brass">Ops</span>
          <div className="ml-auto flex items-center gap-5">
            <span className="hidden sm:inline font-mono text-[10px] uppercase tracking-[0.1em] text-ink-invert/45 truncate max-w-[28ch]">
              {session?.user.email}
            </span>
            <Link
              to={office}
              className="font-mono text-[11px] uppercase tracking-[0.1em] text-ink-invert/70 hover:text-ink-invert"
            >
              School office
            </Link>
            <button
              type="button"
              className="font-mono text-[11px] uppercase tracking-[0.1em] text-ink-invert/70 hover:text-ink-invert"
              onClick={() => void signOut().then(() => navigate('/login', { replace: true }))}
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-10 space-y-8">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <span className="eyebrow">The register of schools</span>
            <h1 className="text-[34px] mt-1">Every school, one sheet.</h1>
            <p className="mt-2 text-[14px] text-ink-soft max-w-[52ch]">
              Proprietors and the schools they named. Parent contacts stay in the school. CSV is
              the sales list.
            </p>
          </div>
          <Button variant="secondary" onClick={downloadCsv} disabled={shown.length === 0}>
            Download CSV
          </Button>
        </div>

        {error && <Alert>{error}</Alert>}
        {notice && !error && (
          <p className="text-[13px] text-present font-semibold">{notice}</p>
        )}

        {loading ? (
          <Spinner />
        ) : rows.length === 0 && !error ? (
          <Empty line="No schools yet. When a proprietor names a school on Welcome, it lands here." />
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px bg-rule border border-rule rounded-lg overflow-hidden">
              {[
                [rows.length, 'Schools'],
                [totals.trial, 'Trial'],
                [totals.active, 'Active'],
                [totals.lapsed, 'Lapsed'],
                [totals.students, 'Students'],
                [totals.parents, 'Parents linked'],
              ].map(([n, label]) => (
                <div key={String(label)} className="bg-surface px-4 py-5">
                  <div className="tnum text-[28px] leading-none font-semibold">{n}</div>
                  <div className="eyebrow mt-2">{label}</div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {filters.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id)}
                  className={`h-8 px-3 rounded-sm border font-mono text-[10px] uppercase tracking-[0.12em] transition-colors ${
                    filter === f.id
                      ? 'border-ink bg-ink text-ink-invert'
                      : 'border-rule bg-surface text-ink-faint hover:text-ink hover:border-rule-strong'
                  }`}
                >
                  {f.label}
                  <span className="tnum ml-2 opacity-70">{f.n}</span>
                </button>
              ))}
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search name, phone, proprietor"
                className="ml-auto w-full sm:w-[280px] h-8 px-3 bg-surface border border-rule rounded-sm text-[13px] placeholder:text-ink-faint"
              />
            </div>

            <div className="space-y-2">
              {shown.length === 0 ? (
                <p className="py-10 text-center text-[13px] text-ink-faint">Nothing matches.</p>
              ) : (
                shown.map((r) => {
                  const open = openId === r.id
                  const left = daysLeft(r.subscription_status === 'trial' ? r.trial_ends_at : r.current_period_end)
                  return (
                    <article
                      key={r.id}
                      className={`bg-surface border rounded-lg overflow-hidden transition-colors ${
                        open ? 'border-ink' : 'border-rule hover:border-rule-strong'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setOpenId(open ? null : r.id)}
                        className="w-full text-left px-5 py-4 grid grid-cols-1 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] gap-3 sm:gap-6 items-start"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-[17px] font-semibold truncate">{r.name}</h2>
                            <StatusMark status={r.subscription_status} />
                          </div>
                          <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-faint mt-1 truncate">
                            {r.slug}
                            {r.has_crest ? '' : ' · no crest'}
                          </div>
                        </div>
                        <div className="min-w-0">
                          <div className="text-[13px] truncate">{r.proprietor_name || 'No proprietor named'}</div>
                          <div className="text-[12px] text-ink-faint truncate">
                            {r.proprietor_email || r.phone || '—'}
                          </div>
                        </div>
                        <div className="sm:text-right">
                          <div className="tnum text-[13px] font-semibold">
                            {r.students} <span className="font-normal text-ink-faint">students</span>
                          </div>
                          <div className="text-[12px] text-ink-faint mt-0.5">
                            {r.last_register ? `Last tick ${fmtDate(r.last_register)}` : 'Never marked'}
                          </div>
                        </div>
                      </button>

                      {open && (
                        <div className="border-t border-rule px-5 py-5 bg-paper/60">
                          <div className="grid sm:grid-cols-3 gap-6">
                            <div>
                              <span className="eyebrow block mb-2">School</span>
                              <dl className="space-y-1.5 text-[13px]">
                                <div>
                                  <dt className="text-ink-faint">Phone</dt>
                                  <dd>{r.phone || '—'}</dd>
                                </div>
                                <div>
                                  <dt className="text-ink-faint">Address</dt>
                                  <dd>{r.address || '—'}</dd>
                                </div>
                                <div>
                                  <dt className="text-ink-faint">Opened</dt>
                                  <dd>{fmtDate(r.created_at)}</dd>
                                </div>
                                <div>
                                  <dt className="text-ink-faint">Crest</dt>
                                  <dd>{r.has_crest ? 'Yes' : 'No'}</dd>
                                </div>
                              </dl>
                            </div>
                            <div>
                              <span className="eyebrow block mb-2">Proprietor</span>
                              <dl className="space-y-1.5 text-[13px]">
                                <div>
                                  <dt className="text-ink-faint">Name</dt>
                                  <dd>{r.proprietor_name || '—'}</dd>
                                </div>
                                <div>
                                  <dt className="text-ink-faint">Email</dt>
                                  <dd className="break-all">{r.proprietor_email || '—'}</dd>
                                </div>
                                <div>
                                  <dt className="text-ink-faint">Phone</dt>
                                  <dd>{r.proprietor_phone || '—'}</dd>
                                </div>
                              </dl>
                            </div>
                            <div>
                              <span className="eyebrow block mb-2">Activity</span>
                              <dl className="space-y-1.5 text-[13px]">
                                <div>
                                  <dt className="text-ink-faint">Roster</dt>
                                  <dd>
                                    {r.students} students · {r.classes} classes · {r.staff} staff ·{' '}
                                    {r.parents} parents
                                  </dd>
                                </div>
                                <div>
                                  <dt className="text-ink-faint">Register</dt>
                                  <dd>{r.last_register ? fmtDate(r.last_register) : 'Never marked'}</dd>
                                </div>
                                <div>
                                  <dt className="text-ink-faint">Last paper</dt>
                                  <dd>{r.last_attempt ? fmtDate(r.last_attempt) : '—'}</dd>
                                </div>
                                <div>
                                  <dt className="text-ink-faint">Billing</dt>
                                  <dd>
                                    {statusOf(r)}
                                    {left !== null
                                      ? left >= 0
                                        ? ` · ${left} day${left === 1 ? '' : 's'} left`
                                        : ` · ${Math.abs(left)} day${Math.abs(left) === 1 ? '' : 's'} overdue`
                                      : ''}
                                  </dd>
                                </div>
                              </dl>
                            </div>
                          </div>
                          <div className="mt-6 pt-4 border-t border-rule flex justify-end">
                            <Button
                              variant="danger"
                              onClick={() => {
                                setConfirmName('')
                                setRemoving(r)
                              }}
                            >
                              Remove school
                            </Button>
                          </div>
                        </div>
                      )}
                    </article>
                  )
                })
              )}
            </div>
          </>
        )}
      </main>

      <Modal
        open={Boolean(removing)}
        onClose={() => {
          if (!busy) {
            setRemoving(null)
            setConfirmName('')
          }
        }}
        title="Remove school"
      >
        {removing && (
          <div className="space-y-4">
            <p className="text-[14px] text-ink-soft leading-relaxed">
              This takes {removing.name} off Daymaark. Roster, register, papers. Type the name
              exactly. Your login stays.
            </p>
            <Field
              label="School name"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder={removing.name}
            />
            <Button
              variant="danger"
              full
              loading={busy}
              disabled={confirmName.trim().toLowerCase() !== removing.name.trim().toLowerCase()}
              onClick={() => void confirmRemove()}
            >
              Remove {removing.name}
            </Button>
          </div>
        )}
      </Modal>
    </div>
  )
}
