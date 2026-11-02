import { useEffect, useState } from 'react'
import { AppShell } from '../../components/AppShell'
import { Empty, Panel, Spinner } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { listNotices, type Notice } from '../../lib/parent'

function when(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function StudentNotices() {
  const { school } = useAuth()
  const [rows, setRows] = useState<Notice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        setRows(await listNotices())
      } catch (e) {
        setError((e as Error).message)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  return (
    <AppShell>
      <div className="mb-4">
        <span className="eyebrow">{school?.name}</span>
        <h1 className="text-[26px] mt-1">Notices</h1>
      </div>
      {loading ? (
        <Spinner />
      ) : error ? (
        <Empty line={error} />
      ) : rows.length === 0 ? (
        <Panel title="From the office">
          <Empty line="No notices have been posted yet." />
        </Panel>
      ) : (
        <div className="space-y-3">
          {rows.map((n) => (
            <article key={n.id} className="bg-surface border border-rule rounded-lg p-4">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-[16px] font-semibold">{n.title}</h2>
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint whitespace-nowrap">
                  {when(n.published_at)}
                </span>
              </div>
              <p className="mt-2 text-[14px] text-ink-soft whitespace-pre-line">{n.body}</p>
            </article>
          ))}
        </div>
      )}
    </AppShell>
  )
}
