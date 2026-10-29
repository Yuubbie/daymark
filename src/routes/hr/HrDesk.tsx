import { useEffect, useState } from 'react'
import { AppShell } from '../../components/AppShell'
import { Alert, Empty, Panel, Row, Spinner } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { listHrRoster, markStaffDay, type HrRow } from '../../lib/office'
import { isHrDesk, type StaffDayStatus } from '../../lib/types'

function todayISO() {
  const d = new Date()
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

const OPTIONS: { key: StaffDayStatus; label: string; cls: string }[] = [
  { key: 'present', label: 'In', cls: 'bg-present text-ink-invert border-present' },
  { key: 'absent', label: 'Out', cls: 'bg-absent text-ink-invert border-absent' },
  { key: 'sick', label: 'Sick', cls: 'bg-late text-ink border-late' },
]

export default function HrDesk() {
  const { profile } = useAuth()
  const canMark = isHrDesk(profile?.role)
  const [date, setDate] = useState(todayISO())
  const [rows, setRows] = useState<HrRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      setRows(await listHrRoster(date))
    } catch (e) {
      const msg = (e as Error).message
      setError(
        /could not find the function|schema cache/i.test(msg)
          ? 'Paste APPLY_RUN21.sql in the SQL Editor, then hard-refresh.'
          : msg,
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [date])

  async function mark(id: string, status: StaffDayStatus) {
    if (!canMark) return
    setError(null)
    try {
      await markStaffDay(id, date, status)
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)))
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const present = rows.filter((r) => r.status === 'present').length
  const absent = rows.filter((r) => r.status === 'absent').length
  const sick = rows.filter((r) => r.status === 'sick').length

  return (
    <AppShell>
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <span className="eyebrow">Staff register</span>
          <h1 className="text-[26px] mt-1">HR</h1>
          <p className="mt-2 text-[14px] text-ink-soft max-w-[48ch]">
            Who is in, who is out, who called in sick. Parents and students never see this sheet.
          </p>
        </div>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="h-11 px-3 border border-rule-strong rounded-md bg-surface text-[14px]"
        />
      </div>

      {error && (
        <div className="mb-4">
          <Alert>{error}</Alert>
        </div>
      )}

      <div className="grid grid-cols-3 gap-px bg-rule border border-rule rounded-lg overflow-hidden mb-4">
        {[
          [present, 'Present'],
          [absent, 'Absent'],
          [sick, 'Sick'],
        ].map(([n, label]) => (
          <div key={String(label)} className="bg-surface px-4 py-4">
            <div className="tnum text-[24px] leading-none font-semibold">{n}</div>
            <div className="eyebrow mt-2">{label}</div>
          </div>
        ))}
      </div>

      <Panel title="Today">
        {loading ? (
          <Spinner />
        ) : rows.length === 0 ? (
          <Empty line="Invite staff from People, then mark them here each morning." />
        ) : (
          <div className="divide-y divide-rule -my-3">
            {rows.map((r) => (
              <Row
                key={r.id}
                left={
                  <>
                    <div className="text-[15px]">{r.full_name || r.email || 'Staff'}</div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint mt-0.5">
                      {r.role}
                    </div>
                  </>
                }
                right={
                  canMark ? (
                    <div className="flex gap-1">
                      {OPTIONS.map((o) => (
                        <button
                          key={o.key}
                          type="button"
                          onClick={() => void mark(r.id, o.key)}
                          className={`h-8 min-w-10 px-2 rounded-sm border text-[11px] font-mono uppercase tracking-[0.08em] ${
                            r.status === o.key
                              ? o.cls
                              : 'bg-surface text-ink-faint border-rule hover:border-rule-strong'
                          }`}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <span
                      className={`font-mono text-[11px] uppercase tracking-[0.1em] ${
                        r.status === 'present'
                          ? 'text-present'
                          : r.status === 'absent'
                            ? 'text-absent'
                            : r.status === 'sick'
                              ? 'text-late'
                              : 'text-ink-faint'
                      }`}
                    >
                      {r.status ?? '—'}
                    </span>
                  )
                }
              />
            ))}
          </div>
        )}
      </Panel>
    </AppShell>
  )
}
