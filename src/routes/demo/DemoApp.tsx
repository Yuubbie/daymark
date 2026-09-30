import { useMemo, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Wordmark } from '../../components/Logo'
import { AttendanceSummary, RegisterLegend } from '../../components/RegisterStrip'
import { Button, Empty, Field, Panel, StatusPill } from '../../components/ui'
import {
  IconClass,
  IconFlag,
  IconHomework,
  IconLesson,
  IconNotice,
  IconRegister,
  IconToday,
} from '../../components/Icons'
import {
  DEMO_CLAIM,
  DEMO_CLASS,
  DEMO_SCHOOL,
  DEMO_TERM,
  attendancePct,
  demoAdmin,
  demoBehaviour,
  demoEarlier,
  demoFees,
  demoFlaggedMarks,
  demoLessonsToday,
  demoMarks,
  demoNotices,
  demoStudents,
  demoTimetable,
  type DemoRole,
  type DemoStudent,
} from '../../lib/demo'
import type { AttendanceStatus } from '../../lib/types'

type Tab = string

const NAV: Record<DemoRole, { to: Tab; label: string; Icon: typeof IconToday }[]> = {
  parent: [
    { to: 'today', label: 'Today', Icon: IconToday },
    { to: 'homework', label: 'Homework', Icon: IconHomework },
    { to: 'notices', label: 'Notices', Icon: IconNotice },
    { to: 'fees', label: 'Fees', Icon: IconClass },
  ],
  teacher: [
    { to: 'register', label: 'Register', Icon: IconRegister },
    { to: 'lesson', label: 'Lesson', Icon: IconLesson },
    { to: 'class', label: 'Class', Icon: IconClass },
  ],
  admin: [
    { to: 'today', label: 'Today', Icon: IconToday },
    { to: 'flagged', label: 'Flagged', Icon: IconFlag },
    { to: 'classes', label: 'Classes', Icon: IconClass },
    { to: 'notices', label: 'Notices', Icon: IconNotice },
  ],
}

export default function DemoApp() {
  const [params] = useSearchParams()
  const preset = (params.get('role') as DemoRole | null) ?? null
  const [stage, setStage] = useState<'gate' | 'onboard' | 'app'>(preset ? 'onboard' : 'gate')
  const [role, setRole] = useState<DemoRole>(preset ?? 'parent')
  const [tab, setTab] = useState<Tab>(preset === 'teacher' ? 'register' : 'today')

  function enter(r: DemoRole) {
    setRole(r)
    setTab(r === 'teacher' ? 'register' : 'today')
    setStage('onboard')
  }

  function finishOnboard() {
    setStage('app')
  }

  if (stage === 'gate') {
    return <DemoGate onPick={enter} />
  }

  if (stage === 'onboard') {
    return <DemoOnboard role={role} onDone={finishOnboard} onBack={() => setStage('gate')} />
  }

  return (
    <DemoShell role={role} tab={tab} onTab={setTab} onExit={() => setStage('gate')}>
      {role === 'parent' && tab === 'today' && <ParentToday />}
      {role === 'parent' && tab === 'homework' && <ParentHomework />}
      {role === 'parent' && tab === 'notices' && <NoticesPanel />}
      {role === 'parent' && tab === 'fees' && <ParentFees />}
      {role === 'teacher' && tab === 'register' && <TeacherRegister />}
      {role === 'teacher' && tab === 'lesson' && <TeacherLesson />}
      {role === 'teacher' && tab === 'class' && <TeacherClass />}
      {role === 'admin' && tab === 'today' && <AdminToday />}
      {role === 'admin' && tab === 'flagged' && <AdminFlagged />}
      {role === 'admin' && tab === 'classes' && <AdminClasses />}
      {role === 'admin' && tab === 'notices' && <NoticesPanel admin />}
    </DemoShell>
  )
}

function DemoBanner() {
  return (
    <div className="bg-brass-wash border-b border-brass/30 text-[12px] text-ink px-4 py-2 flex items-center justify-between gap-3">
      <span>
        Live demo · {DEMO_SCHOOL}. Changes stay on this device.
      </span>
      <Link to="/" className="underline underline-offset-2 decoration-brass shrink-0">
        Back to site
      </Link>
    </div>
  )
}

function DemoGate({ onPick }: { onPick: (r: DemoRole) => void }) {
  return (
    <div className="min-h-dvh bg-paper">
      <DemoBanner />
      <div className="mx-auto max-w-3xl px-5 py-12">
        <Wordmark size="md" />
        <span className="eyebrow block mt-8">Live demo</span>
        <h1 className="text-[32px] sm:text-[40px] mt-2">Walk a school day. Pick a seat.</h1>
        <p className="mt-3 text-[15px] text-ink-soft max-w-[48ch] leading-relaxed">
          Greenfield Academy, JSS 1A, First Term. No account. Onboarding is the same path a real
          parent or proprietor takes.
        </p>
        <div className="mt-8 grid sm:grid-cols-3 gap-3">
          {(
            [
              ['parent', 'Parent', 'Claim a child. See today.'],
              ['teacher', 'Teacher', 'Mark the register in 20s.'],
              ['admin', 'Proprietor', 'Who posted. Who is slipping.'],
            ] as const
          ).map(([r, t, b]) => (
            <button
              key={r}
              onClick={() => onPick(r)}
              className="text-left bg-surface border border-rule rounded-lg p-4 hover:border-brass transition-colors"
            >
              <div className="eyebrow">{t}</div>
              <div className="text-[16px] font-semibold mt-2">{b}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function DemoOnboard({
  role,
  onDone,
  onBack,
}: {
  role: DemoRole
  onDone: () => void
  onBack: () => void
}) {
  const [step, setStep] = useState(0)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [school, setSchool] = useState('Greenfield Academy')

  const steps =
    role === 'parent'
      ? ['Welcome', 'Claim code', 'Your child']
      : role === 'teacher'
        ? ['Welcome', 'Your class', 'Ready']
        : ['Welcome', 'Name the school', 'Ready']

  function next() {
    setError(null)
    if (role === 'parent' && step === 1) {
      if (code.trim().toUpperCase() !== DEMO_CLAIM) {
        setError(`Use the sample code ${DEMO_CLAIM}.`)
        return
      }
    }
    if (step >= steps.length - 1) {
      onDone()
      return
    }
    setStep((s) => s + 1)
  }

  return (
    <div className="min-h-dvh bg-paper">
      <DemoBanner />
      <div className="mx-auto max-w-md px-5 py-10">
        <button onClick={onBack} className="eyebrow hover:text-ink">
          All roles
        </button>
        <div className="mt-6 flex gap-1.5">
          {steps.map((s, i) => (
            <span
              key={s}
              className={`h-1 flex-1 rounded-sm ${i <= step ? 'bg-brass' : 'bg-rule'}`}
            />
          ))}
        </div>
        <p className="eyebrow mt-4">
          Step {step + 1} of {steps.length}
        </p>

        {role === 'parent' && step === 0 && (
          <Block title="You are a parent at Greenfield." body="The school sent a claim code home with Adaeze. Enter it once. Her day opens." />
        )}
        {role === 'parent' && step === 1 && (
          <form
            className="mt-4 space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              next()
            }}
          >
            <h2 className="text-[24px]">Enter the code.</h2>
            <Field
              label="Claim code"
              mono
              required
              placeholder={DEMO_CLAIM}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              hint={`Sample code: ${DEMO_CLAIM}`}
              error={error ?? undefined}
            />
            <Button type="submit" full>
              Link my child
            </Button>
          </form>
        )}
        {role === 'parent' && step === 2 && (
          <Block
            title="Adaeze Okonkwo is linked."
            body={`${DEMO_CLASS}. Attendance, lessons and homework will show on Today.`}
          />
        )}

        {role === 'teacher' && step === 0 && (
          <Block title="You teach JSS 1A." body="Form teacher. Mathematics. The register is the first thing you open." />
        )}
        {role === 'teacher' && step === 1 && (
          <Block title="Eight students this morning." body="Mark all present, then correct Bola (late) and Tunde (absent). Twenty seconds." />
        )}
        {role === 'teacher' && step === 2 && (
          <Block title="Ready for the register." body="Marks save as you tap. If data drops, they queue." />
        )}

        {role === 'admin' && step === 0 && (
          <Block title="You run the school." body="Today is about who posted, who did not, and which children are slipping." />
        )}
        {role === 'admin' && step === 1 && (
          <form
            className="mt-4 space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              next()
            }}
          >
            <h2 className="text-[24px]">Name the school.</h2>
            <Field label="School name" required value={school} onChange={(e) => setSchool(e.target.value)} />
            <Button type="submit" full>
              Continue
            </Button>
          </form>
        )}
        {role === 'admin' && step === 2 && (
          <Block title={`${school} is live.`} body="Term is set. 248 students. Walk the dashboard as a proprietor would at 2pm." />
        )}

        {!(role === 'parent' && step === 1) && !(role === 'admin' && step === 1) && (
          <div className="mt-6">
            <Button full onClick={next}>
              {step >= steps.length - 1 ? 'Enter the app' : 'Continue'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

function Block({ title, body }: { title: string; body: string }) {
  return (
    <div className="mt-4">
      <h2 className="text-[24px]">{title}</h2>
      <p className="mt-3 text-[15px] text-ink-soft leading-relaxed">{body}</p>
    </div>
  )
}

function DemoShell({
  role,
  tab,
  onTab,
  onExit,
  children,
}: {
  role: DemoRole
  tab: Tab
  onTab: (t: Tab) => void
  onExit: () => void
  children: ReactNode
}) {
  const items = NAV[role]
  const label = role === 'admin' ? 'proprietor' : role

  return (
    <div className="min-h-dvh bg-paper">
      <DemoBanner />
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-[248px] bg-ink text-ink-invert flex-col z-20 pt-[34px]">
        <div className="px-6 py-6">
          <Wordmark size="sm" className="text-ink-invert" />
        </div>
        <div className="px-6 pb-5">
          <div className="text-[13px] font-semibold">{DEMO_SCHOOL}</div>
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-invert/45 mt-0.5">
            {label}
          </div>
        </div>
        <nav className="flex-1 px-3 space-y-0.5">
          {items.map(({ to, label: l, Icon }) => (
            <button
              key={to}
              onClick={() => onTab(to)}
              className={`flex items-center gap-3 h-10 w-full px-3 rounded-md text-[14px] text-left
                ${tab === to ? 'bg-ink-invert/10 font-semibold' : 'text-ink-invert/60 hover:text-ink-invert'}`}
            >
              <Icon className={tab === to ? 'text-brass' : ''} />
              {l}
            </button>
          ))}
        </nav>
        <div className="px-3 pb-5">
          <button
            onClick={onExit}
            className="h-10 px-3 text-[14px] text-ink-invert/50 hover:text-ink-invert"
          >
            Switch role
          </button>
        </div>
      </aside>

      <header className="lg:hidden sticky top-0 z-10 bg-ink text-ink-invert">
        <div className="px-4 h-14 flex items-center gap-3">
          <Wordmark size="xs" className="text-ink-invert" />
          <span className="h-5 w-px bg-ink-invert/20" />
          <div className="min-w-0">
            <div className="text-[13px] font-semibold truncate">{DEMO_SCHOOL}</div>
            <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-invert/50">
              {label}
            </div>
          </div>
          <button onClick={onExit} className="ml-auto text-[11px] font-mono uppercase tracking-[0.1em] text-ink-invert/60">
            Switch
          </button>
        </div>
      </header>

      <main className="lg:pl-[248px]">
        <div className="mx-auto w-full max-w-3xl px-4 lg:px-10 py-5 lg:py-10 pb-24 lg:pb-12">
          {children}
        </div>
      </main>

      <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-surface border-t border-rule z-10">
        <div className="flex pb-[env(safe-area-inset-bottom)]">
          {items.map(({ to, label: l, Icon }) => (
            <button
              key={to}
              onClick={() => onTab(to)}
              className={`flex-1 h-16 flex flex-col items-center justify-center gap-1 text-[10px]
                font-mono uppercase tracking-[0.1em] border-t-2
                ${tab === to ? 'border-brass text-ink' : 'border-transparent text-ink-faint'}`}
            >
              <Icon className={tab === to ? 'text-brass' : ''} />
              {l}
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}

function ParentToday() {
  const pct = attendancePct(demoMarks) ?? 94
  const today = new Date().toLocaleDateString('en-NG', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  return (
    <div className="space-y-4">
      <div>
        <span className="eyebrow">{today}</span>
        <h1 className="text-[26px] mt-1">Adaeze Okonkwo</h1>
        <p className="text-[13px] text-ink-faint mt-0.5">{DEMO_CLASS}</p>
      </div>
      <Panel title={DEMO_TERM}>
        <AttendanceSummary pct={pct} marks={demoMarks} caption="48 school days" />
        <div className="mt-4 pt-4 border-t border-rule">
          <RegisterLegend />
        </div>
      </Panel>
      <Panel title="Today at school">
        <div className="divide-y divide-rule -my-3">
          {demoLessonsToday.map((l) => (
            <LessonRow key={l.id} subject={l.subject} topic={l.topic} summary={l.summary} homework={l.homework} due={l.homework_due_date} />
          ))}
        </div>
      </Panel>
      <Panel title="Timetable">
        <div className="divide-y divide-rule -my-3">
          {demoTimetable.map((r) => (
            <div key={r.time} className="flex items-center py-2.5">
              <span className="tnum text-[13px] text-ink-faint w-14">{r.time}</span>
              <span className="text-[14px] font-semibold">{r.subject}</span>
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="House points">
        <div className="flex items-baseline gap-2 mb-3">
          <span className="tnum text-[32px] font-semibold">+2</span>
          <span className="eyebrow">this week</span>
        </div>
        <div className="divide-y divide-rule -my-1">
          {demoBehaviour.map((b) => (
            <div key={b.id} className="flex items-start gap-3 py-2.5">
              <span className={`tnum text-[14px] font-semibold ${b.points > 0 ? 'text-present' : 'text-absent'}`}>
                {b.points > 0 ? `+${b.points}` : b.points}
              </span>
              <div>
                <div className="text-[14px]">{b.note}</div>
                <div className="text-[12px] text-ink-faint">{b.date}</div>
              </div>
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="Earlier this week">
        <div className="divide-y divide-rule -my-3">
          {demoEarlier.map((l) => (
            <LessonRow key={l.id} subject={l.subject} topic={l.topic} summary={l.summary} homework={l.homework} due={l.homework_due_date} date={l.date} />
          ))}
        </div>
      </Panel>
    </div>
  )
}

function LessonRow({
  subject,
  topic,
  summary,
  homework,
  due,
  date,
}: {
  subject: string
  topic: string
  summary?: string
  homework?: string
  due?: string
  date?: string
}) {
  return (
    <div className="py-3.5">
      <div className="flex items-baseline gap-2">
        <span className="eyebrow">{subject}</span>
        {date && <span className="tnum text-[11px] text-ink-faint ml-auto">{date}</span>}
      </div>
      <div className="text-[15px] font-semibold mt-1">{topic}</div>
      {summary && <p className="text-[13px] text-ink-soft mt-1 leading-relaxed">{summary}</p>}
      {homework && (
        <div className="mt-2.5 border-l-2 border-brass pl-3">
          <span className="eyebrow">Homework</span>
          <p className="text-[14px] mt-0.5">{homework}</p>
          {due && <p className="tnum text-[12px] text-ink-faint mt-0.5">Due {due}</p>}
        </div>
      )}
    </div>
  )
}

function ParentHomework() {
  const open = demoLessonsToday.filter((l) => l.homework)
  return (
    <div>
      <span className="eyebrow">Due</span>
      <h1 className="text-[26px] mt-1">Homework</h1>
      <div className="mt-4 space-y-4">
        <Panel title="Open">
          {open.length === 0 ? (
            <Empty line="Nothing due." />
          ) : (
            <div className="divide-y divide-rule -my-3">
              {open.map((l) => (
                <LessonRow key={l.id} subject={l.subject} topic={l.topic} homework={l.homework} due={l.homework_due_date} />
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  )
}

function NoticesPanel({ admin }: { admin?: boolean }) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [list, setList] = useState(demoNotices)
  return (
    <div>
      <span className="eyebrow">School</span>
      <h1 className="text-[26px] mt-1">Notices</h1>
      {admin && (
        <Panel title="Post a notice" className="mt-4">
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault()
              if (!title.trim()) return
              setList((rows) => [
                { id: `n${Date.now()}`, title: title.trim(), body: body.trim(), date: 'Just now' },
                ...rows,
              ])
              setTitle('')
              setBody('')
            }}
          >
            <Field label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
            <Field label="Body" value={body} onChange={(e) => setBody(e.target.value)} />
            <Button type="submit">Post</Button>
          </form>
        </Panel>
      )}
      <div className="mt-4 space-y-3">
        {list.map((n) => (
          <Panel key={n.id}>
            <div className="eyebrow">{n.date}</div>
            <h2 className="text-[16px] mt-1">{n.title}</h2>
            <p className="text-[14px] text-ink-soft mt-1">{n.body}</p>
          </Panel>
        ))}
      </div>
    </div>
  )
}

function ParentFees() {
  const remaining = demoFees.due
  return (
    <div>
      <span className="eyebrow">{demoFees.term}</span>
      <h1 className="text-[26px] mt-1">Fees</h1>
      <div className="mt-4 space-y-4">
        <Panel title="Statement">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="tnum text-[22px] font-semibold">N{demoFees.billed.toLocaleString()}</div>
              <div className="eyebrow mt-1">Billed</div>
            </div>
            <div>
              <div className="tnum text-[22px] font-semibold">N{demoFees.paid.toLocaleString()}</div>
              <div className="eyebrow mt-1">Paid</div>
            </div>
            <div>
              <div className="tnum text-[22px] font-semibold text-absent">N{remaining.toLocaleString()}</div>
              <div className="eyebrow mt-1">Due {demoFees.dueDate}</div>
            </div>
          </div>
        </Panel>
        <Panel title="Payments">
          <div className="divide-y divide-rule -my-3">
            {demoFees.history.map((h) => (
              <div key={h.date} className="flex items-center py-3">
                <div>
                  <div className="text-[14px] font-semibold">{h.note}</div>
                  <div className="text-[12px] text-ink-faint">{h.date}</div>
                </div>
                <span className="ml-auto tnum text-[14px]">N{h.amount.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  )
}

function TeacherRegister() {
  const [rows, setRows] = useState<DemoStudent[]>(demoStudents)
  const [state, setState] = useState<'idle' | 'saved'>('idle')
  const marked = rows.filter((s) => s.status).length

  function mark(id: string, status: AttendanceStatus) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)))
    setState('saved')
  }

  function allPresent() {
    setRows((rs) => rs.map((r) => (r.status ? r : { ...r, status: 'present' })))
    setState('saved')
  }

  const OPTIONS: { key: AttendanceStatus; label: string; cls: string }[] = [
    { key: 'present', label: 'P', cls: 'bg-present text-ink-invert border-present' },
    { key: 'late', label: 'L', cls: 'bg-late text-ink border-late' },
    { key: 'absent', label: 'A', cls: 'bg-absent text-ink-invert border-absent' },
    { key: 'excused', label: 'E', cls: 'bg-excused text-ink-invert border-excused' },
  ]

  return (
    <div>
      <span className="eyebrow">Register</span>
      <h1 className="text-[26px] mt-1">
        {new Date().toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long' })}
      </h1>
      <Panel
        className="mt-4"
        title={`${DEMO_CLASS} · ${marked} of ${rows.length} marked`}
        action={
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-present">
            {state === 'saved' ? 'Saved' : ''}
          </span>
        }
      >
        {marked < rows.length && (
          <div className="mb-3">
            <Button onClick={allPresent} full>
              Mark the rest present
            </Button>
          </div>
        )}
        <div className="divide-y divide-rule -my-2">
          {rows.map((s) => (
            <div key={s.id} className="flex items-center gap-3 py-2.5">
              <span className="text-[15px] min-w-0 truncate">
                {s.last_name}, {s.first_name}
              </span>
              <div className="ml-auto flex gap-1.5 shrink-0">
                {OPTIONS.map((o) => {
                  const on = s.status === o.key
                  return (
                    <button
                      key={o.key}
                      onClick={() => mark(s.id, o.key)}
                      className={`h-10 w-10 rounded-md border font-mono text-[13px] font-semibold
                        ${on ? o.cls : 'bg-surface border-rule-strong text-ink-faint'}`}
                    >
                      {o.label}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}

function TeacherLesson() {
  const [subject, setSubject] = useState('Mathematics')
  const [topic, setTopic] = useState('')
  const [summary, setSummary] = useState('')
  const [homework, setHomework] = useState('')
  const [posted, setPosted] = useState(false)

  return (
    <div>
      <span className="eyebrow">{DEMO_CLASS}</span>
      <h1 className="text-[26px] mt-1">Post today’s lesson</h1>
      {posted ? (
        <Panel className="mt-4" title="Posted">
          <p className="text-[14px] text-ink-soft">
            Parents in {DEMO_CLASS} can see this now. Post the next subject whenever you are done.
          </p>
          <div className="mt-4">
            <Button variant="secondary" onClick={() => setPosted(false)}>
              Post another
            </Button>
          </div>
        </Panel>
      ) : (
        <form
          className="mt-4 space-y-3.5"
          onSubmit={(e) => {
            e.preventDefault()
            setPosted(true)
          }}
        >
          <Field label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
          <Field
            label="Topic"
            required
            placeholder="Linear equations in one variable"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />
          <Field
            label="What we did"
            placeholder="Two sentences is enough."
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
          />
          <Field
            label="Homework"
            placeholder="Exercise 4.2, questions 1 to 8."
            value={homework}
            onChange={(e) => setHomework(e.target.value)}
          />
          <Button type="submit" full>
            Post lesson
          </Button>
        </form>
      )}
    </div>
  )
}

function TeacherClass() {
  return (
    <div>
      <span className="eyebrow">{DEMO_CLASS}</span>
      <h1 className="text-[26px] mt-1">Class</h1>
      <Panel className="mt-4" title="Students">
        <div className="divide-y divide-rule -my-3">
          {demoStudents.map((s) => (
            <div key={s.id} className="flex items-center py-3">
              <div>
                <div className="text-[14px] font-semibold">
                  {s.last_name}, {s.first_name}
                </div>
                <div className="tnum text-[12px] text-ink-faint">{s.admission}</div>
              </div>
              {s.status && (
                <span className="ml-auto">
                  <StatusPill status={s.status} />
                </span>
              )}
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}

function AdminToday() {
  return (
    <div>
      <span className="eyebrow">
        {new Date().toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long' })}
      </span>
      <h1 className="text-[26px] mt-1">{DEMO_SCHOOL}</h1>
      <div className="mt-4 space-y-4">
        <Panel title="Today">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
            <div>
              <div className="tnum text-[28px] font-semibold">{demoAdmin.students}</div>
              <div className="eyebrow mt-1.5">Students</div>
            </div>
            <div>
              <div className="tnum text-[28px] font-semibold">{demoAdmin.classes}</div>
              <div className="eyebrow mt-1.5">Classes</div>
            </div>
            <div>
              <div className="tnum text-[28px] font-semibold">{demoAdmin.markedToday}</div>
              <div className="eyebrow mt-1.5">Marked today</div>
            </div>
            <div>
              <div className="tnum text-[28px] font-semibold">{demoAdmin.lessonsToday}</div>
              <div className="eyebrow mt-1.5">Lessons posted</div>
            </div>
          </div>
          <p className="mt-5 pt-4 border-t border-rule text-[13px] text-ink-faint">
            Current term: <span className="text-ink">{DEMO_TERM}</span>
          </p>
        </Panel>
        <Panel title="Not posted today">
          <div className="divide-y divide-rule -my-3">
            {demoAdmin.missing.map((c) => (
              <div key={c} className="flex items-center py-3">
                <span className="text-[14px] font-semibold">{c}</span>
                <span className="ml-auto font-mono text-[11px] uppercase tracking-[0.1em] text-absent">
                  Nothing yet
                </span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Parents not linked">
          <p className="text-[14px] text-ink-soft">
            <span className="tnum font-semibold text-ink">{demoAdmin.unlinkedParents}</span> students
            have no parent account. Hand them a claim code.
          </p>
        </Panel>
      </div>
    </div>
  )
}

function AdminFlagged() {
  const pct = attendancePct(demoFlaggedMarks)
  return (
    <div>
      <span className="eyebrow">Watch</span>
      <h1 className="text-[26px] mt-1">Flagged</h1>
      <div className="mt-4 space-y-3">
        {demoAdmin.flagged.map((f, i) => (
          <Panel key={f.name}>
            <div className="flex items-baseline justify-between">
              <div>
                <div className="text-[15px] font-semibold">{f.name}</div>
                <div className="eyebrow mt-0.5">{f.klass}</div>
              </div>
              <span className="tnum text-[22px] font-semibold text-absent">{f.pct}%</span>
            </div>
            <p className="text-[13px] text-ink-soft mt-2">{f.reason}</p>
            <div className="mt-3">
              <AttendanceSummary pct={i === 0 ? pct : 71} marks={demoFlaggedMarks} />
            </div>
          </Panel>
        ))}
      </div>
    </div>
  )
}

function AdminClasses() {
  const classes = useMemo(
    () => [
      { name: 'JSS 1A', n: 32, posted: true },
      { name: 'JSS 1B', n: 30, posted: true },
      { name: 'JSS 2B', n: 28, posted: false },
      { name: 'Primary 4A', n: 36, posted: false },
    ],
    [],
  )
  return (
    <div>
      <span className="eyebrow">School</span>
      <h1 className="text-[26px] mt-1">Classes</h1>
      <Panel className="mt-4" title="Active">
        <div className="divide-y divide-rule -my-3">
          {classes.map((c) => (
            <div key={c.name} className="flex items-center py-3">
              <div>
                <div className="text-[14px] font-semibold">{c.name}</div>
                <div className="tnum text-[12px] text-ink-faint">{c.n} students</div>
              </div>
              <span
                className={`ml-auto font-mono text-[11px] uppercase tracking-[0.1em] ${c.posted ? 'text-present' : 'text-absent'}`}
              >
                {c.posted ? 'Posted' : 'Missing'}
              </span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}
