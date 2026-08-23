import { useCallback, useEffect, useState } from 'react'
import { AppShell } from '../../components/AppShell'
import { Empty, Panel, Spinner } from '../../components/ui'
import { ChildSwitcher, LessonEntry } from './Home'
import { listChildren, openHomework, type Child, type LessonRow } from '../../lib/parent'

export default function Homework() {
  const [kids, setKids] = useState<Child[]>([])
  const [active, setActive] = useState('')
  const [rows, setRows] = useState<LessonRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      const cs = await listChildren()
      setKids(cs)
      setActive(cs[0]?.id ?? '')
      if (cs.length === 0) setLoading(false)
    })()
  }, [])

  const load = useCallback(async () => {
    const child = kids.find((k) => k.id === active)
    if (!child?.class_id) return
    setLoading(true)
    try {
      setRows(await openHomework(child.class_id))
    } finally {
      setLoading(false)
    }
  }, [active, kids])

  useEffect(() => {
    void load()
  }, [load])

  const today = new Date().toISOString().slice(0, 10)
  const due = rows.filter((r) => !r.homework_due_date || r.homework_due_date >= today)
  const past = rows.filter((r) => r.homework_due_date && r.homework_due_date < today)

  return (
    <AppShell>
      <div className="mb-4">
        <span className="eyebrow">Homework</span>
        <h1 className="text-[26px] mt-1">What is due</h1>
      </div>

      <ChildSwitcher children={kids} active={active} onChange={setActive} />

      {loading ? (
        <Spinner />
      ) : (
        <div className="space-y-4">
          <Panel title="Still due">
            {due.length === 0 ? (
              <Empty line="Nothing outstanding. Homework appears here as teachers set it." />
            ) : (
              <div className="divide-y divide-rule -my-3">
                {due.map((l) => (
                  <LessonEntry key={l.id} lesson={l} showDate />
                ))}
              </div>
            )}
          </Panel>

          {past.length > 0 && (
            <Panel title="Past the due date">
              <div className="divide-y divide-rule -my-3">
                {past.map((l) => (
                  <LessonEntry key={l.id} lesson={l} showDate />
                ))}
              </div>
            </Panel>
          )}
        </div>
      )}
    </AppShell>
  )
}
