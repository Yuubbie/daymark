import { useCallback, useEffect, useState } from 'react'
import { AppShell } from '../../components/AppShell'
import { Button, Empty, Panel, Spinner } from '../../components/ui'
import { ChildSwitcher, LessonEntry } from './Home'
import { listChildren, openHomework, type Child, type LessonRow } from '../../lib/parent'

/* ---------------------------------------------------------------------------
   Homework.

   A parent needs what is due now. History matters, but a wall of overdue
   entries reads as an accusation rather than information, so the past is
   folded away behind a count and only opens if they ask for it.
--------------------------------------------------------------------------- */

const PAST_PREVIEW = 3

function todayISO() {
  const d = new Date()
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

export default function Homework() {
  const [kids, setKids] = useState<Child[]>([])
  const [active, setActive] = useState('')
  const [rows, setRows] = useState<LessonRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showAllPast, setShowAllPast] = useState(false)

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
    setShowAllPast(false)
    try {
      setRows(await openHomework(child.class_id))
    } finally {
      setLoading(false)
    }
  }, [active, kids])

  useEffect(() => {
    void load()
  }, [load])

  const today = todayISO()
  const due = rows.filter((r) => !r.homework_due_date || r.homework_due_date >= today)
  const past = rows.filter((r) => r.homework_due_date && r.homework_due_date < today)
  const shown = showAllPast ? past : past.slice(0, PAST_PREVIEW)

  return (
    <AppShell>
      <div className="mb-4">
        <span className="eyebrow">Homework</span>
        <h1 className="text-[26px] mt-1">
          {due.length === 0
            ? 'Nothing due right now'
            : `${due.length} ${due.length === 1 ? 'thing' : 'things'} due`}
        </h1>
      </div>

      <ChildSwitcher children={kids} active={active} onChange={setActive} />

      {loading ? (
        <Spinner />
      ) : (
        <div className="space-y-4">
          <Panel title="Due now">
            {due.length === 0 ? (
              <Empty line="Nothing outstanding at the moment. New homework shows up here as teachers set it." />
            ) : (
              <div className="divide-y divide-rule -my-3">
                {due.map((l) => (
                  <LessonEntry key={l.id} lesson={l} showDate />
                ))}
              </div>
            )}
          </Panel>

          {past.length > 0 && (
            <Panel title={`Earlier, ${past.length}`}>
              <div className="divide-y divide-rule -my-3">
                {shown.map((l) => (
                  <LessonEntry key={l.id} lesson={l} showDate />
                ))}
              </div>

              {past.length > PAST_PREVIEW && (
                <div className="mt-4 pt-4 border-t border-rule">
                  <Button variant="secondary" onClick={() => setShowAllPast((v) => !v)}>
                    {showAllPast
                      ? 'Show less'
                      : `Show all ${past.length} from this term`}
                  </Button>
                </div>
              )}
            </Panel>
          )}
        </div>
      )}
    </AppShell>
  )
}
