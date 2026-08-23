import { useEffect, useState } from 'react'
import { AppShell } from '../../components/AppShell'
import { Empty, Panel, Spinner } from '../../components/ui'
import { listNotices, type Notice } from '../../lib/parent'

export default function Notices() {
  const [rows, setRows] = useState<Notice[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      try {
        setRows(await listNotices())
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  return (
    <AppShell>
      <div className="mb-4">
        <span className="eyebrow">From the school</span>
        <h1 className="text-[26px] mt-1">Notices</h1>
      </div>

      {loading ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <Panel>
          <Empty line="Nothing from the school yet. Announcements appear here as they are posted." />
        </Panel>
      ) : (
        <div className="space-y-3">
          {rows.map((n) => (
            <Panel key={n.id}>
              <div className="flex items-baseline gap-2">
                <span className="eyebrow">{n.class_id ? 'Class' : 'Whole school'}</span>
                <span className="tnum text-[11px] text-ink-faint ml-auto">
                  {n.published_at.slice(0, 10)}
                </span>
              </div>
              <h2 className="text-[17px] mt-1.5">{n.title}</h2>
              <p className="text-[14px] text-ink-soft mt-1.5 leading-relaxed whitespace-pre-line">
                {n.body}
              </p>
            </Panel>
          ))}
        </div>
      )}
    </AppShell>
  )
}
