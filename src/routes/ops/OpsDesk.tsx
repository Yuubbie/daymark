import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Wordmark } from '../../components/Logo'
import { Alert, Button, Empty, Panel, Spinner, Stat } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { fetchOpsSchools, schoolsToCsv, type OpsSchool } from '../../lib/ops'
import { ROLE_HOME } from '../../lib/types'

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10)
  return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}

function statusTone(status: string): string {
  if (status === 'active') return 'text-present'
  if (status === 'trial') return 'text-late'
  return 'text-ink-faint'
}

export default function OpsDesk() {
  const { session, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [rows, setRows] = useState<OpsSchool[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')

  useEffect(() => {
    void (async () => {
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
    })()
  }, [])

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return rows
    return rows.filter((r) =>
      [r.name, r.slug, r.phone, r.address, r.proprietor_name, r.proprietor_email, r.proprietor_phone]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle)),
    )
  }, [rows, q])

  const totals = useMemo(() => {
    const trial = rows.filter((r) => r.subscription_status === 'trial').length
    const active = rows.filter((r) => r.subscription_status === 'active').length
    const lapsed = rows.filter(
      (r) => r.subscription_status === 'lapsed' || r.subscription_status === 'past_due',
    ).length
    const students = rows.reduce((n, r) => n + (r.students || 0), 0)
    const parents = rows.reduce((n, r) => n + (r.parents || 0), 0)
    return { trial, active, lapsed, students, parents }
  }, [rows])

  function downloadCsv() {
    const blob = new Blob([schoolsToCsv(shown)], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `daymaark-schools-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  const office = profile?.role ? ROLE_HOME[profile.role] : '/admin'

  return (
    <div className="min-h-dvh bg-paper">
      <header className="bg-ink text-ink-invert">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center gap-3">
          <Wordmark size="sm" className="text-ink-invert" />
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-invert/50">
            Ops
          </span>
          <div className="ml-auto flex items-center gap-3">
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

      <main className="mx-auto max-w-6xl px-4 py-6 space-y-4">
        <div>
          <span className="eyebrow">Daymaark</span>
          <h1 className="text-[26px] mt-1">Schools</h1>
          <p className="mt-1 text-[13px] text-ink-faint">
            Signed in as {session?.user.email}. Schools and proprietors only. Parent contacts stay
            in the school.
          </p>
        </div>

        {error && <Alert>{error}</Alert>}

        {loading ? (
          <Spinner />
        ) : rows.length === 0 && !error ? (
          <Empty line="No schools yet. When a proprietor names a school on Welcome, it lands here." />
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <Stat value={rows.length} label="Schools" />
              <Stat value={totals.trial} label="Trial" />
              <Stat value={totals.active} label="Active" />
              <Stat value={totals.lapsed} label="Lapsed" />
              <Stat value={totals.students} label="Students" />
              <Stat value={totals.parents} label="Parents linked" />
            </div>

            <Panel
              title={`${shown.length} school${shown.length === 1 ? '' : 's'}`}
              action={
                <Button variant="secondary" onClick={downloadCsv} disabled={shown.length === 0}>
                  CSV
                </Button>
              }
            >
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search name, slug, phone, proprietor"
                className="w-full h-11 px-3 mb-3 bg-surface-alt border border-rule rounded-md text-[14px]"
              />
              <div className="overflow-x-auto -mx-4">
                <table className="w-full text-left text-[13px] min-w-[960px]">
                  <thead>
                    <tr className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint border-y border-rule">
                      <th className="px-4 py-2 font-normal">School</th>
                      <th className="px-4 py-2 font-normal">Proprietor</th>
                      <th className="px-4 py-2 font-normal">Status</th>
                      <th className="px-4 py-2 font-normal tnum">Roster</th>
                      <th className="px-4 py-2 font-normal">Last tick</th>
                      <th className="px-4 py-2 font-normal">Opened</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rule">
                    {shown.map((r) => (
                      <tr key={r.id}>
                        <td className="px-4 py-3 align-top">
                          <div className="font-semibold text-[14px]">{r.name}</div>
                          <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-faint mt-0.5">
                            {r.slug}
                            {r.phone ? ` · ${r.phone}` : ''}
                            {r.has_crest ? '' : ' · no crest'}
                          </div>
                          {r.address && (
                            <div className="text-[12px] text-ink-faint mt-0.5">{r.address}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div>{r.proprietor_name || '—'}</div>
                          <div className="text-[12px] text-ink-faint">{r.proprietor_email || '—'}</div>
                          {r.proprietor_phone && (
                            <div className="text-[12px] text-ink-faint">{r.proprietor_phone}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <span
                            className={`font-mono text-[10px] uppercase tracking-[0.1em] ${statusTone(r.subscription_status)}`}
                          >
                            {r.subscription_status}
                          </span>
                          <div className="text-[12px] text-ink-faint mt-0.5">
                            {r.subscription_status === 'trial'
                              ? `ends ${fmtDate(r.trial_ends_at)}`
                              : r.current_period_end
                                ? `to ${fmtDate(r.current_period_end)}`
                                : ''}
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top tnum text-[12px] text-ink-soft">
                          {r.students} students
                          <br />
                          {r.classes} classes · {r.staff} staff
                          <br />
                          {r.parents} parents
                        </td>
                        <td className="px-4 py-3 align-top text-[12px] text-ink-soft">
                          {fmtDate(r.last_register)}
                          {r.last_attempt && (
                            <div className="text-ink-faint">sat {fmtDate(r.last_attempt)}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top text-[12px] text-ink-soft">
                          {fmtDate(r.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {shown.length === 0 && (
                <p className="mt-3 text-[13px] text-ink-faint">Nothing matches that search.</p>
              )}
            </Panel>
          </>
        )}
      </main>
    </div>
  )
}
