import { useState, type ReactNode } from 'react'
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
  IconSettings,
  IconTimetable,
  IconToday,
} from '../../components/Icons'
import {
  PLAN,
  adminClasses,
  attendancePct,
  demoAdmin,
  demoBehaviour,
  demoEarlier,
  demoFees,
  demoFlaggedMarks,
  demoLessonsToday,
  demoMarks,
  demoNotices,
  demoSchool,
  demoSchoolNotices,
  demoStudents,
  demoSubscription,
  demoTasks,
  demoTimetable,
  demoWeek,
  demoFeeClasses,
  demoExams,
  demoParentResults,
  studentAssignments,
  studentResults,
  type DemoRole,
  type DemoStudent,
} from '../../lib/demo'
import type { AttendanceStatus } from '../../lib/types'

type Tab = string

const NAV: Record<DemoRole, { to: Tab; label: string; Icon: typeof IconToday; mobile?: boolean }[]> = {
  proprietor: [
    { to: 'overview', label: 'Overview', Icon: IconToday },
    { to: 'finance', label: 'Finance', Icon: IconClass },
    { to: 'people', label: 'People', Icon: IconClass },
    { to: 'billing', label: 'Billing', Icon: IconSettings },
  ],
  admin: [
    { to: 'today', label: 'Today', Icon: IconToday },
    { to: 'flagged', label: 'Flagged', Icon: IconFlag },
    { to: 'classes', label: 'Classes', Icon: IconClass, mobile: false },
    { to: 'timetable', label: 'Timetable', Icon: IconTimetable },
    { to: 'fees', label: 'Fees', Icon: IconClass },
    { to: 'cbt', label: 'CBT', Icon: IconLesson, mobile: false },
    { to: 'tasks', label: 'Tasks', Icon: IconHomework, mobile: false },
    { to: 'notices', label: 'Notices', Icon: IconNotice, mobile: false },
  ],
  teacher: [
    { to: 'register', label: 'Register', Icon: IconRegister },
    { to: 'lesson', label: 'Lesson', Icon: IconLesson },
    { to: 'timetable', label: 'Timetable', Icon: IconTimetable },
    { to: 'results', label: 'Results', Icon: IconHomework },
    { to: 'notices', label: 'Notices', Icon: IconNotice, mobile: false },
  ],
  parent: [
    { to: 'today', label: 'Today', Icon: IconToday },
    { to: 'homework', label: 'Homework', Icon: IconHomework },
    { to: 'assessments', label: 'Assessments', Icon: IconHomework },
    { to: 'notices', label: 'Notices', Icon: IconNotice, mobile: false },
    { to: 'fees', label: 'Fees', Icon: IconClass },
  ],
  student: [
    { to: 'today', label: 'Today', Icon: IconToday },
    { to: 'assignments', label: 'Homework', Icon: IconHomework },
    { to: 'results', label: 'Results', Icon: IconClass },
  ],
}

const ROLE_META: Record<DemoRole, { title: string; blurb: string; name: string }> = {
  proprietor: { title: 'Proprietor', blurb: 'The whole school, money and outcomes.', name: 'Chief Uche Obi' },
  admin: { title: 'Admin', blurb: 'Day to day running. Who posted, who slipped.', name: 'Mrs. Grace Eze' },
  teacher: { title: 'Teacher', blurb: 'Register, lessons, results.', name: 'Mr. Emeka Okafor' },
  parent: { title: 'Parent', blurb: 'Your child, the same day.', name: 'Ngozi Okonkwo' },
  student: { title: 'Student', blurb: 'Assignments and your scores.', name: 'Adaeze Okonkwo' },
}

const ORDER: DemoRole[] = ['proprietor', 'admin', 'teacher', 'parent', 'student']

export default function DemoApp() {
  const [params] = useSearchParams()
  const preset = (params.get('role') as DemoRole | null) ?? null
  const [stage, setStage] = useState<'gate' | 'onboard' | 'app'>(preset ? 'onboard' : 'gate')
  const [role, setRole] = useState<DemoRole>(preset ?? 'proprietor')
  const [tab, setTab] = useState<Tab>(firstTab(preset ?? 'proprietor'))

  function firstTab(r: DemoRole) {
    return NAV[r][0].to
  }

  function enter(r: DemoRole) {
    setRole(r)
    setTab(firstTab(r))
    setStage('onboard')
  }

  if (stage === 'gate') return <DemoGate onPick={enter} />
  if (stage === 'onboard') {
    return (
      <DemoOnboard
        role={role}
        onDone={() => setStage('app')}
        onBack={() => setStage('gate')}
      />
    )
  }

  return (
    <DemoShell role={role} tab={tab} onTab={setTab} onExit={() => setStage('gate')}>
      {role === 'proprietor' && tab === 'overview' && <ProprietorOverview />}
      {role === 'proprietor' && tab === 'finance' && <ProprietorFinance />}
      {role === 'proprietor' && tab === 'people' && <ProprietorPeople />}
      {role === 'proprietor' && tab === 'billing' && <Billing />}
      {role === 'admin' && tab === 'today' && <AdminToday />}
      {role === 'admin' && tab === 'flagged' && <AdminFlagged />}
      {role === 'admin' && tab === 'classes' && <AdminClasses />}
      {role === 'admin' && tab === 'timetable' && <AdminTimetable />}
      {role === 'admin' && tab === 'fees' && <AdminFees />}
      {role === 'admin' && tab === 'cbt' && <AdminCbt />}
      {role === 'admin' && tab === 'tasks' && <AdminTasks />}
      {role === 'admin' && tab === 'notices' && <NoticesPanel admin />}
      {role === 'teacher' && tab === 'register' && <TeacherRegister />}
      {role === 'teacher' && tab === 'lesson' && <TeacherLesson />}
      {role === 'teacher' && tab === 'timetable' && <TeacherTimetable />}
      {role === 'teacher' && tab === 'class' && <TeacherClass />}
      {role === 'teacher' && tab === 'results' && <TeacherResults />}
      {role === 'teacher' && tab === 'notices' && <NoticesPanel />}
      {role === 'parent' && tab === 'today' && <ParentToday />}
      {role === 'parent' && tab === 'homework' && <ParentHomework />}
      {role === 'parent' && tab === 'assessments' && <ParentAssessments />}
      {role === 'parent' && tab === 'notices' && <NoticesPanel />}
      {role === 'parent' && tab === 'fees' && <ParentFees />}
      {role === 'student' && tab === 'today' && <StudentToday />}
      {role === 'student' && tab === 'assignments' && <StudentAssignments />}
      {role === 'student' && tab === 'results' && <StudentResults />}
    </DemoShell>
  )
}

function DemoBanner({ onBilling }: { onBilling?: () => void }) {
  return (
    <div className="bg-brass-wash border-b border-brass/30 text-[12px] text-ink px-4 py-2 flex items-center justify-between gap-3">
      <span className="truncate">
        Live demo · {demoSubscription.status === 'trial' ? `Trial, ${demoSubscription.daysLeft} days left` : 'Active'} · N200,000/year after 30 days
      </span>
      <div className="flex items-center gap-3 shrink-0">
        {onBilling && (
          <button onClick={onBilling} className="underline underline-offset-2 decoration-brass">
            Billing
          </button>
        )}
        <Link to="/" className="underline underline-offset-2 decoration-brass">
          Back to site
        </Link>
      </div>
    </div>
  )
}

function DemoGate({ onPick }: { onPick: (r: DemoRole) => void }) {
  return (
    <div className="min-h-dvh bg-paper">
      <DemoBanner />
      <div className="mx-auto max-w-4xl px-5 py-12">
        <Wordmark size="md" />
        <span className="eyebrow block mt-8">Live demo</span>
        <h1 className="text-[32px] sm:text-[44px] mt-2 max-w-[20ch]">
          One school. Five seats. Pick one.
        </h1>
        <p className="mt-3 text-[15px] text-ink-soft max-w-[52ch] leading-relaxed">
          {demoSubscription.status === 'trial'
            ? `Greenfield Academy is on day ${30 - demoSubscription.daysLeft} of its 30-day trial. The whole platform is live: enrolment, register, results, fees and billing.`
            : ''}
        </p>
        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {ORDER.map((r) => (
            <button
              key={r}
              onClick={() => onPick(r)}
              className="text-left bg-surface border border-rule rounded-lg p-4 hover:border-brass transition-colors"
            >
              <div className="eyebrow">{ROLE_META[r].title}</div>
              <div className="text-[14px] font-semibold mt-2">{ROLE_META[r].blurb}</div>
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

  const steps = ['Welcome', role === 'proprietor' ? 'Your school' : role === 'parent' ? 'Claim code' : 'Your seat', 'Ready']

  function next() {
    setError(null)
    if (role === 'parent' && step === 1 && code.trim().toUpperCase() !== 'ADAEZE01') {
      setError('Use the sample code ADAEZE01.')
      return
    }
    if (step >= steps.length - 1) {
      onDone()
      return
    }
    setStep((s) => s + 1)
  }

  const copy: Record<DemoRole, [string, string]> = {
    proprietor: ['You own the school.', 'You will see enrolment, finance, staff and the subscription in one place.'],
    admin: ['You run the day to day.', 'Register coverage, classes, tasks and family communication.'],
    teacher: ['You teach JSS 1A.', 'Register, lesson posting and results entry.'],
    parent: ['You are Adaeze’s parent.', 'Attendance, lessons, homework and fees.'],
    student: ['You are Adaeze, JSS 1A.', 'Assignments and your own results.'],
  }

  return (
    <div className="min-h-dvh bg-paper">
      <DemoBanner />
      <div className="mx-auto max-w-md px-5 py-10">
        <button onClick={onBack} className="eyebrow hover:text-ink">
          All seats
        </button>
        <div className="mt-6 flex gap-1.5">
          {steps.map((s, i) => (
            <span key={s} className={`h-1 flex-1 rounded-sm ${i <= step ? 'bg-brass' : 'bg-rule'}`} />
          ))}
        </div>
        <p className="eyebrow mt-4">
          {ROLE_META[role].title} · step {step + 1} of {steps.length}
        </p>

        {step === 0 && <Block title={copy[role][0]} body={copy[role][1]} />}

        {step === 1 && role === 'parent' && (
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
              placeholder="ADAEZE01"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              hint="Sample code: ADAEZE01"
              error={error ?? undefined}
            />
            <Button type="submit" full>
              Link my child
            </Button>
          </form>
        )}

        {step === 1 && role === 'proprietor' && (
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

        {step === 1 && (role === 'admin' || role === 'teacher' || role === 'student') && (
          <Block
            title={ROLE_META[role].name}
            body={
              role === 'student'
                ? 'JSS 1A. Two assignments open, results published.'
                : role === 'teacher'
                  ? 'Form teacher JSS 1A, Mathematics. Eight students in this morning’s register.'
                  : 'Head of administration. 248 students, 12 classes, 34 staff.'
            }
          />
        )}

        {step === 2 && (
          <Block
            title="You are in."
            body={
              role === 'proprietor'
                ? 'Greenfield Academy is on trial. Billing shows N200,000 for the year when the trial ends.'
                : 'Everything you see is sample data for a real school day.'
            }
          />
        )}

        {!(role === 'parent' && step === 1) && !(role === 'proprietor' && step === 1) && (
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
  return (
    <div className="min-h-dvh bg-paper">
      <DemoBanner onBilling={role === 'proprietor' ? () => onTab('billing') : undefined} />
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-[248px] bg-ink text-ink-invert flex-col z-20 pt-[34px]">
        <div className="px-6 py-6">
          <Wordmark size="sm" className="text-ink-invert" />
        </div>
        <div className="px-6 pb-5">
          <div className="text-[13px] font-semibold">{demoSchoolName()}</div>
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-invert/45 mt-0.5">
            {ROLE_META[role].title}
          </div>
        </div>
        <nav className="flex-1 px-3 space-y-0.5">
          {items.map(({ to, label, Icon }) => (
            <button
              key={to}
              onClick={() => onTab(to)}
              className={`flex items-center gap-3 h-10 w-full px-3 rounded-md text-[14px] text-left
                ${tab === to ? 'bg-ink-invert/10 font-semibold' : 'text-ink-invert/60 hover:text-ink-invert'}`}
            >
              <Icon className={tab === to ? 'text-brass' : ''} />
              {label}
            </button>
          ))}
        </nav>
        <div className="px-3 pb-5">
          <button onClick={onExit} className="h-10 px-3 text-[14px] text-ink-invert/50 hover:text-ink-invert">
            Switch seat
          </button>
        </div>
      </aside>

      <header className="lg:hidden sticky top-0 z-10 bg-ink text-ink-invert">
        <div className="px-4 h-14 flex items-center gap-3">
          <Wordmark size="xs" className="text-ink-invert" />
          <span className="h-5 w-px bg-ink-invert/20" />
          <div className="min-w-0">
            <div className="text-[13px] font-semibold truncate">{demoSchoolName()}</div>
            <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-invert/50">
              {ROLE_META[role].title}
            </div>
          </div>
          <button onClick={onExit} className="ml-auto text-[11px] font-mono uppercase tracking-[0.1em] text-ink-invert/60">
            Switch
          </button>
        </div>
      </header>

      <main className="lg:pl-[248px]">
        <div className="mx-auto w-full max-w-3xl px-4 lg:px-10 py-5 lg:py-10 pb-24 lg:pb-12">{children}</div>
      </main>

      <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-surface border-t border-rule z-10">
        <div className="flex pb-[env(safe-area-inset-bottom)]">
          {items.filter((i) => i.mobile !== false).map(({ to, label, Icon }) => (
            <button
              key={to}
              onClick={() => onTab(to)}
              className={`flex-1 h-16 flex flex-col items-center justify-center gap-1 text-[10px]
                font-mono uppercase tracking-[0.1em] border-t-2
                ${tab === to ? 'border-brass text-ink' : 'border-transparent text-ink-faint'}`}
            >
              <Icon className={tab === to ? 'text-brass' : ''} />
              {label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}

function demoSchoolName() {
  return 'Greenfield Academy'
}

/* ===========================================================================
   PROPRIETOR
=========================================================================== */

function ProprietorOverview() {
  const s = demoSchool
  return (
    <div className="space-y-4">
      <Head eyebrow="Proprietor" title="Greenfield Academy" sub={s.term} />
      <Panel title="The school today">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
          <Metric value={s.enrolment} label="Enrolment" />
          <Metric value={`${s.attendancePct}%`} label="Attendance" />
          <Metric value={s.staff} label="Staff" />
          <Metric value={`N${(s.collected / 1e6).toFixed(1)}m`} label="Collected" />
        </div>
      </Panel>
      <Panel title="Enrolment trend">
        <div className="flex items-end gap-4 h-40">
          {s.enrolmentTrend.map((e) => {
            const max = Math.max(...s.enrolmentTrend.map((x) => x.value))
            return (
              <div key={e.label} className="flex-1 flex flex-col items-center gap-2">
                <span className="tnum text-[13px]">{e.value}</span>
                <div className="w-full bg-ink rounded-sm" style={{ height: `${(e.value / max) * 100}%` }} />
                <span className="eyebrow">{e.label}</span>
              </div>
            )
          })}
        </div>
      </Panel>
      <Panel title="Attendance by year group">
        <div className="space-y-3">
          {s.classPerformance.map((c) => (
            <div key={c.name}>
              <div className="flex items-baseline justify-between">
                <span className="text-[14px] font-semibold">{c.name}</span>
                <span className="tnum text-[13px]">{c.pct}%</span>
              </div>
              <div className="mt-1.5 h-2 bg-surface-alt rounded-sm overflow-hidden">
                <div className="h-full bg-present" style={{ width: `${c.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="Published notices">
        <div className="divide-y divide-rule -my-3">
          {demoSchoolNotices.map((n) => (
            <div key={n.id} className="flex items-center py-3">
              <div>
                <div className="text-[14px] font-semibold">{n.title}</div>
                <div className="eyebrow mt-0.5">
                  {n.audience} · {n.date}
                </div>
              </div>
              <span className="ml-auto tnum text-[13px] text-ink-faint">{n.read}% read</span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}

function ProprietorFinance() {
  const s = demoSchool
  const margin = Math.round(((s.collected - s.expense) / s.collected) * 100)
  return (
    <div className="space-y-4">
      <Head eyebrow="Proprietor" title="Finance" sub={s.term} />
      <Panel title="Term position">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
          <Metric value={`N${(s.billed / 1e6).toFixed(1)}m`} label="Billed" />
          <Metric value={`N${(s.collected / 1e6).toFixed(1)}m`} label="Collected" />
          <Metric value={`N${(s.outstanding / 1e6).toFixed(1)}m`} label="Outstanding" />
          <Metric value={`${margin}%`} label="Margin" />
        </div>
      </Panel>
      <Panel title="Fee collection by class">
        <div className="space-y-3">
          {s.feeByClass.map((c) => (
            <div key={c.name}>
              <div className="flex items-baseline justify-between">
                <span className="text-[14px] font-semibold">{c.name}</span>
                <span className="tnum text-[13px]">{c.collected}%</span>
              </div>
              <div className="mt-1.5 h-2 bg-surface-alt rounded-sm overflow-hidden">
                <div
                  className={`h-full ${c.collected >= 85 ? 'bg-present' : c.collected >= 70 ? 'bg-late' : 'bg-absent'}`}
                  style={{ width: `${c.collected}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="Expenses this term">
        <div className="divide-y divide-rule -my-3">
          {[
            ['Salaries', 6200000],
            ['Facilities', 1400000],
            ['Books & materials', 900000],
            ['Utilities', 640000],
            ['Transport', 260000],
          ].map(([k, v]) => (
            <div key={k as string} className="flex items-center py-3">
              <span className="text-[14px]">{k}</span>
              <span className="ml-auto tnum text-[14px]">
                N{(v as number).toLocaleString()}
              </span>
            </div>
          ))}
          <div className="flex items-center py-3">
            <span className="text-[14px] font-semibold">Total</span>
            <span className="ml-auto tnum text-[14px] font-semibold">
              N{s.expense.toLocaleString()}
            </span>
          </div>
        </div>
      </Panel>
    </div>
  )
}

function ProprietorPeople() {
  const s = demoSchool
  const [invited, setInvited] = useState(false)
  return (
    <div className="space-y-4">
      <Head eyebrow="Proprietor" title="People" sub="Staff and families" />
      <Panel title="Day-to-day administrator">
        {invited ? (
          <p className="text-[14px] text-ink-soft">
            Invite sent to Mrs. Grace Eze. She signs up with that email and runs the school day. You stay proprietor.
          </p>
        ) : (
          <>
            <p className="text-[14px] text-ink-soft">
              You own the school. Appoint an admin to run classes, fees and the register.
            </p>
            <div className="mt-4">
              <Button onClick={() => setInvited(true)}>Invite admin</Button>
            </div>
          </>
        )}
      </Panel>
      <Panel title="Staff">
        <div className="grid grid-cols-3 gap-5">
          <Metric value={s.staff} label="Total" />
          <Metric value={s.staffOnLeave} label="On leave" />
          <Metric value={s.staffPending} label="Pending hire" />
        </div>
      </Panel>
      <Panel title="Parent engagement">
        <div className="grid grid-cols-3 gap-5">
          <Metric value="230" label="Linked parents" />
          <Metric value={demoAdmin.unlinkedParents} label="Unlinked" />
          <Metric value="92%" label="Opened last notice" />
        </div>
        <p className="mt-4 text-[13px] text-ink-faint">
          {demoAdmin.unlinkedParents} students still have no parent account. Hand them a claim code
          from the class page.
        </p>
      </Panel>
      <Panel title="Classes overview">
        <div className="divide-y divide-rule -my-3">
          {adminClasses.map((c) => (
            <div key={c.name} className="flex items-center py-3">
              <div>
                <div className="text-[14px] font-semibold">{c.name}</div>
                <div className="eyebrow mt-0.5">
                  {c.n} students · {c.teacher}
                </div>
              </div>
              <span className={`ml-auto tnum text-[13px] ${c.pct >= 90 ? 'text-present' : 'text-late'}`}>
                {c.pct}%
              </span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}

/* ===========================================================================
   BILLING
=========================================================================== */

function Billing() {
  const b = demoSubscription
  const [paying, setPaying] = useState(false)
  const [paid, setPaid] = useState(false)

  return (
    <div className="space-y-4">
      <Head eyebrow="Subscription" title="Billing" sub={`${b.plan} plan`} />
      <Panel title="Plan">
        <div className="flex items-baseline gap-2">
          <span className="tnum text-[40px] leading-none font-semibold">N{b.price.toLocaleString()}</span>
          <span className="text-[14px] text-ink-faint">/ {PLAN.per}</span>
        </div>
        <p className="mt-2 text-[14px] text-ink-soft">{PLAN.students}. Parents, teachers and students included.</p>
      </Panel>

      <Panel title="Trial">
        {paid ? (
          <div>
            <div className="flex items-center gap-2">
              <StatusPill status="present" />
              <span className="text-[14px] font-semibold">Active</span>
            </div>
            <p className="mt-2 text-[14px] text-ink-soft">
              Payment received. Greenfield Academy is covered to September 2027.
            </p>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between">
              <span className="eyebrow">Days left in trial</span>
              <span className="tnum text-[24px] font-semibold">{b.daysLeft}</span>
            </div>
            <div className="mt-3 h-2 bg-surface-alt rounded-sm overflow-hidden">
              <div className="h-full bg-brass" style={{ width: `${(b.daysLeft / PLAN.trialDays) * 100}%` }} />
            </div>
            <p className="mt-3 text-[13px] text-ink-soft">
              Trial ends {b.trialEnds}. Schools are not charged automatically. Pay when you are
              ready, or the account falls back to read-only.
            </p>
            <div className="mt-4">
              <Button
                full
                loading={paying}
                onClick={() => {
                  setPaying(true)
                  window.setTimeout(() => {
                    setPaying(false)
                    setPaid(true)
                  }, 900)
                }}
              >
                Pay N{b.price.toLocaleString()} for the year
              </Button>
            </div>
          </div>
        )}
      </Panel>

      <Panel title="What is included">
        <ul className="space-y-2 text-[14px] text-ink-soft">
          {[
            'Unlimited students, classes and staff',
            'Parent, teacher, admin, proprietor and student apps',
            'Attendance, lessons, homework and results',
            'Fees, invoicing and finance reporting',
            'Notices and same-day absence alerts',
            'Works offline in the register',
          ].map((f) => (
            <li key={f} className="flex gap-2">
              <span className="text-present">&#10003;</span>
              {f}
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Invoices">
        <div className="divide-y divide-rule -my-3">
          {b.invoices.map((i) => (
            <div key={i.id} className="flex items-center py-3">
              <div>
                <div className="text-[14px] font-semibold">{i.id}</div>
                <div className="text-[12px] text-ink-faint">{i.date}</div>
              </div>
              <div className="ml-auto text-right">
                <div className="tnum text-[14px]">N{i.amount.toLocaleString()}</div>
                <div className="eyebrow">{paid && i.id === 'INV-0001' ? 'Paid' : i.status}</div>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}

/* ===========================================================================
   ADMIN
=========================================================================== */

function AdminToday() {
  return (
    <div className="space-y-4">
      <Head eyebrow="Admin" title="Greenfield Academy" sub={DEMO_TERM_CONST} />
      <div className="space-y-4">
        <Panel title="Today">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
            <Metric value={demoAdmin.students} label="Students" />
            <Metric value={demoAdmin.classes} label="Classes" />
            <Metric value={demoAdmin.markedToday} label="Marked today" />
            <Metric value={demoAdmin.lessonsToday} label="Lessons posted" />
          </div>
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

const DEMO_TERM_CONST = 'First Term 2025/2026'

function AdminFlagged() {
  const pct = attendancePct(demoFlaggedMarks)
  return (
    <div>
      <Head eyebrow="Admin" title="Flagged" sub="Attendance falling" />
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
  return (
    <div>
      <Head eyebrow="Admin" title="Classes" sub={`${adminClasses.length} active`} />
      <Panel className="mt-4" title="Active">
        <div className="divide-y divide-rule -my-3">
          {adminClasses.map((c) => (
            <div key={c.name} className="flex items-center py-3">
              <div>
                <div className="text-[14px] font-semibold">{c.name}</div>
                <div className="eyebrow mt-0.5">
                  {c.n} students · {c.teacher}
                </div>
              </div>
              <span className={`ml-auto font-mono text-[11px] uppercase tracking-[0.1em] ${c.posted ? 'text-present' : 'text-absent'}`}>
                {c.posted ? 'Posted' : 'Missing'}
              </span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}

function AdminTimetable() {
  const [day, setDay] = useState(demoWeek[0].day)
  const [added, setAdded] = useState(false)
  const week = demoWeek.find((d) => d.day === day) ?? demoWeek[0]
  return (
    <div>
      <Head eyebrow="Admin" title="Timetable" sub="JSS 1A · this week" />
      <div className="mt-4 flex gap-2 overflow-x-auto">
        {demoWeek.map((d) => (
          <button
            key={d.day}
            onClick={() => setDay(d.day)}
            className={`h-9 px-3 rounded-md text-[13px] font-semibold shrink-0 ${
              day === d.day ? 'bg-ink text-ink-invert' : 'bg-surface border border-rule'
            }`}
          >
            {d.day}
          </button>
        ))}
      </div>
      <Panel className="mt-4" title={day}>
        <div className="divide-y divide-rule -my-3">
          {week.slots.map((s) => (
            <div key={s.time} className="flex items-center py-3">
              <span className="tnum text-[13px] text-ink-faint w-14">{s.time}</span>
              <span className="text-[14px] font-semibold">{s.subject}</span>
            </div>
          ))}
        </div>
      </Panel>
      <div className="mt-4">
        {added ? (
          <Panel title="Period added">
            <p className="text-[14px] text-ink-soft">Friday 11:20 Clubs is on the week. Admin still sees every class.</p>
          </Panel>
        ) : (
          <Button full onClick={() => setAdded(true)}>
            Add period
          </Button>
        )}
      </div>
    </div>
  )
}

function AdminFees() {
  const billed = demoFeeClasses.reduce((s, c) => s + c.billed, 0)
  const collected = demoFeeClasses.reduce((s, c) => s + c.collected, 0)
  const uncleared = demoFeeClasses.reduce((s, c) => s + c.uncleared, 0)
  return (
    <div>
      <Head eyebrow="Admin" title="Fees" sub={DEMO_TERM_CONST} />
      <Panel className="mt-4" title="This term">
        <div className="grid grid-cols-3 gap-4">
          <Metric value={`N${(billed / 1e6).toFixed(1)}m`} label="Billed" />
          <Metric value={`N${(collected / 1e6).toFixed(1)}m`} label="Collected" />
          <Metric value={uncleared} label="Uncleared" />
        </div>
      </Panel>
      <Panel className="mt-4" title="By class">
        <div className="divide-y divide-rule -my-3">
          {demoFeeClasses.map((c) => (
            <div key={c.name} className="flex items-center py-3">
              <div>
                <div className="text-[14px] font-semibold">{c.name}</div>
                <div className="eyebrow mt-0.5">{c.uncleared} uncleared</div>
              </div>
              <span className="ml-auto tnum text-[13px]">
                {Math.round((c.collected / c.billed) * 100)}%
              </span>
            </div>
          ))}
        </div>
      </Panel>
      <p className="mt-3 text-[12px] text-ink-faint">
        Unpaid families stay locked out of CBT and results until fees are marked cleared.
      </p>
    </div>
  )
}

function AdminCbt() {
  return (
    <div>
      <Head eyebrow="Admin" title="CBT" sub="Assessments and exams" />
      <Panel className="mt-4" title="This term">
        <div className="divide-y divide-rule -my-3">
          {demoExams.map((e) => (
            <div key={e.title} className="flex items-center py-3">
              <div>
                <div className="text-[14px] font-semibold">{e.title}</div>
                <div className="eyebrow mt-0.5">
                  {e.klass} · {e.duration} min
                </div>
              </div>
              <span className="ml-auto tnum text-[13px] text-ink-faint">
                {e.status === 'published' ? `${e.sitters} sitting` : e.status}
              </span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}

function AdminTasks() {
  const [tasks, setTasks] = useState(demoTasks)
  return (
    <div>
      <Head eyebrow="Admin" title="Tasks" sub="This week" />
      <Panel className="mt-4" title="Open">
        <div className="divide-y divide-rule -my-3">
          {tasks.map((t) => (
            <div key={t.id} className="flex items-center gap-3 py-3">
              <input
                type="checkbox"
                checked={t.done}
                onChange={() => setTasks((rows) => rows.map((r) => (r.id === t.id ? { ...r, done: !r.done } : r)))}
                className="h-4 w-4 accent-[color:var(--color-brass)]"
              />
              <div>
                <div className={`text-[14px] font-semibold ${t.done ? 'line-through text-ink-faint' : ''}`}>
                  {t.title}
                </div>
                <div className="eyebrow mt-0.5">
                  {t.who} · due {t.due}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}

function NoticesPanel({ admin }: { admin?: boolean }) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [list, setList] = useState(demoNotices)
  return (
    <div>
      <Head eyebrow="School" title="Notices" sub={admin ? 'Publish to families' : 'From the school'} />
      {admin && (
        <Panel title="Post a notice" className="mt-4">
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault()
              if (!title.trim()) return
              setList((rows) => [{ id: `n${Date.now()}`, title: title.trim(), body: body.trim(), date: 'Just now' }, ...rows])
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

/* ===========================================================================
   TEACHER
=========================================================================== */

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
      <Head
        eyebrow="Teacher"
        title={new Date().toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long' })}
        sub="Register"
      />
      <Panel
        className="mt-4"
        title={`JSS 1A · ${marked} of ${rows.length} marked`}
        action={<span className="font-mono text-[10px] uppercase tracking-[0.12em] text-present">{state === 'saved' ? 'Saved' : ''}</span>}
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
                      className={`h-10 w-10 rounded-md border font-mono text-[13px] font-semibold ${on ? o.cls : 'bg-surface border-rule-strong text-ink-faint'}`}
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
      <Head eyebrow="Teacher" title="Post today’s lesson" sub="JSS 1A" />
      {posted ? (
        <Panel className="mt-4" title="Posted">
          <p className="text-[14px] text-ink-soft">
            Parents in JSS 1A can see this now. Post the next subject when you are done.
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
          <Field label="Topic" required placeholder="Linear equations in one variable" value={topic} onChange={(e) => setTopic(e.target.value)} />
          <Field label="What we did" placeholder="Two sentences is enough." value={summary} onChange={(e) => setSummary(e.target.value)} />
          <Field label="Homework" placeholder="Exercise 4.2, questions 1 to 8." value={homework} onChange={(e) => setHomework(e.target.value)} />
          <Button type="submit" full>
            Post lesson
          </Button>
        </form>
      )}
    </div>
  )
}

function TeacherTimetable() {
  const [added, setAdded] = useState(false)
  return (
    <div>
      <Head eyebrow="Teacher" title="Your timetable" sub="JSS 1A · this week" />
      <Panel className="mt-4" title="Today">
        <div className="divide-y divide-rule -my-3">
          {demoTimetable.map((s) => (
            <div key={s.time} className="flex items-center py-3">
              <span className="tnum text-[13px] text-ink-faint w-14">{s.time}</span>
              <span className="text-[14px] font-semibold">{s.subject}</span>
            </div>
          ))}
        </div>
      </Panel>
      <div className="mt-4">
        {added ? (
          <Panel title="Period added">
            <p className="text-[14px] text-ink-soft">
              Extra lesson is on your week. Admin still sees the full class timetable.
            </p>
          </Panel>
        ) : (
          <Button full onClick={() => setAdded(true)}>
            Add period
          </Button>
        )}
      </div>
    </div>
  )
}

function TeacherClass() {
  return (
    <div>
      <Head eyebrow="Teacher" title="JSS 1A" sub="Class list" />
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

function TeacherResults() {
  const [scores, setScores] = useState(studentResults)
  function setScore(subject: string, field: 'ca' | 'exam', value: number) {
    setScores((rows) =>
      rows.map((r) =>
        r.subject === subject
          ? { ...r, [field]: value, total: field === 'ca' ? value + r.exam : r.ca + value }
          : r,
      ),
    )
  }
  return (
    <div>
      <Head eyebrow="Teacher" title="Results" sub="JSS 1A · Mathematics" />
      <Panel className="mt-4" title="Continuous assessment & exam">
        <div className="divide-y divide-rule -my-3">
          {scores.map((r) => {
            const grade = r.total >= 85 ? 'A' : r.total >= 70 ? 'B' : r.total >= 55 ? 'C' : 'D'
            return (
              <div key={r.subject} className="flex items-center gap-3 py-3">
                <span className="text-[14px] min-w-0 truncate">{r.subject}</span>
                <div className="ml-auto flex items-center gap-2 shrink-0">
                  <input
                    type="number"
                    value={r.ca}
                    onChange={(e) => setScore(r.subject, 'ca', Number(e.target.value))}
                    className="w-14 h-9 px-2 bg-surface border border-rule-strong rounded-md text-[13px] font-mono"
                  />
                  <input
                    type="number"
                    value={r.exam}
                    onChange={(e) => setScore(r.subject, 'exam', Number(e.target.value))}
                    className="w-14 h-9 px-2 bg-surface border border-rule-strong rounded-md text-[13px] font-mono"
                  />
                  <span className="tnum text-[14px] font-semibold w-8 text-right">{r.total}</span>
                  <span className="tnum text-[13px] text-brass w-4">{grade}</span>
                </div>
              </div>
            )
          })}
        </div>
      </Panel>
      <p className="mt-3 text-[12px] text-ink-faint">CA out of 30, exam out of 70. Grades update as you type.</p>
    </div>
  )
}

/* ===========================================================================
   PARENT
=========================================================================== */

function ParentToday() {
  const pct = attendancePct(demoMarks) ?? 94
  const today = new Date().toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long' })
  return (
    <div className="space-y-4">
      <Head eyebrow={today} title="Adaeze Okonkwo" sub="JSS 1A" />
      <Panel title={DEMO_TERM_CONST}>
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
      <Head eyebrow="Parent" title="Homework" sub="Due now" />
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

function ParentAssessments() {
  const unpaid = demoFees.due > 0
  return (
    <div>
      <Head eyebrow="Parent" title="Assessments" sub="Adaeze Okonkwo · JSS 1A" />
      {unpaid ? (
        <Panel className="mt-4" title="Results locked">
          <Empty line="Fees are outstanding. Results stay locked until the school marks this child as cleared." />
          <p className="mt-3 text-[13px] text-ink-soft">
            Balance N{demoFees.due.toLocaleString()}. Pay from Fees, or wait for the bursar.
          </p>
        </Panel>
      ) : (
        <Panel className="mt-4" title="Approved results">
          <div className="divide-y divide-rule -my-3">
            {demoParentResults.map((r) => (
              <div key={r.title} className="flex items-center py-3">
                <div>
                  <div className="text-[14px] font-semibold">{r.title}</div>
                  <div className="eyebrow mt-0.5">{r.subject}</div>
                </div>
                <span className="ml-auto tnum text-[14px] font-semibold">
                  {r.score == null ? '—' : `${r.score} / ${r.total}`}
                </span>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  )
}

function ParentFees() {
  return (
    <div>
      <Head eyebrow="Parent" title="Fees" sub={demoFees.term} />
      <div className="mt-4 space-y-4">
        <Panel title="Statement">
          <div className="grid grid-cols-3 gap-4">
            <Metric value={`N${demoFees.billed.toLocaleString()}`} label="Billed" />
            <Metric value={`N${demoFees.paid.toLocaleString()}`} label="Paid" />
            <div>
              <div className="tnum text-[22px] font-semibold text-absent">N{demoFees.due.toLocaleString()}</div>
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
        <Button full>Pay balance</Button>
      </div>
    </div>
  )
}

/* ===========================================================================
   STUDENT
=========================================================================== */

function StudentToday() {
  const pct = attendancePct(demoMarks) ?? 94
  return (
    <div className="space-y-4">
      <Head eyebrow="JSS 1A" title="Hi, Adaeze" sub={DEMO_TERM_CONST} />
      <Panel title="My attendance">
        <AttendanceSummary pct={pct} marks={demoMarks} caption="This term" />
      </Panel>
      <Panel title="Next period">
        <div className="flex items-baseline justify-between">
          <div>
            <div className="eyebrow">11:20</div>
            <div className="text-[18px] font-semibold mt-1">Social Studies</div>
          </div>
          <span className="eyebrow">Room 4</span>
        </div>
      </Panel>
      <Panel title="Due soon">
        <div className="divide-y divide-rule -my-3">
          {studentAssignments.filter((a) => a.status === 'open').map((a) => (
            <div key={a.id} className="flex items-center py-3">
              <div>
                <div className="text-[14px] font-semibold">{a.title}</div>
                <div className="eyebrow mt-0.5">{a.subject}</div>
              </div>
              <span className="ml-auto tnum text-[13px] text-late">Due {a.due}</span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}

function StudentAssignments() {
  const [rows, setRows] = useState(studentAssignments)
  return (
    <div>
      <Head eyebrow="Student" title="Homework" sub="Submit before the deadline" />
      <Panel className="mt-4" title="Assignments">
        <div className="divide-y divide-rule -my-3">
          {rows.map((a) => (
            <div key={a.id} className="flex items-center gap-3 py-3">
              <div>
                <div className="text-[14px] font-semibold">{a.title}</div>
                <div className="eyebrow mt-0.5">
                  {a.subject} · due {a.due}
                </div>
              </div>
              <span className="ml-auto">
                {a.status === 'submitted' ? (
                  <StatusPill status="present" />
                ) : (
                  <Button
                    variant="secondary"
                    onClick={() => setRows((rs) => rs.map((r) => (r.id === a.id ? { ...r, status: 'submitted' as const } : r)))}
                  >
                    Submit
                  </Button>
                )}
              </span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}

function StudentResults() {
  const total = Math.round(studentResults.reduce((s, r) => s + r.total, 0) / studentResults.length)
  return (
    <div>
      <Head eyebrow="Student" title="Results" sub={`${DEMO_TERM_CONST} · average ${total}%`} />
      <Panel className="mt-4" title="Term scores">
        <div className="divide-y divide-rule -my-3">
          {studentResults.map((r) => (
            <div key={r.subject} className="flex items-center py-3">
              <div>
                <div className="text-[14px] font-semibold">{r.subject}</div>
                <div className="eyebrow mt-0.5">
                  CA {r.ca} · Exam {r.exam}
                </div>
              </div>
              <div className="ml-auto flex items-baseline gap-3">
                <span className="tnum text-[15px] font-semibold">{r.total}</span>
                <span className="tnum text-[14px] text-brass w-4">{r.grade}</span>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}

/* ===========================================================================
   SHARED
=========================================================================== */

function Head({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div>
      <span className="eyebrow">{eyebrow}</span>
      <h1 className="text-[26px] mt-1">{title}</h1>
      {sub && <p className="text-[13px] text-ink-faint mt-0.5">{sub}</p>}
    </div>
  )
}

function Metric({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div>
      <div className="tnum text-[28px] leading-none font-semibold">{value}</div>
      <div className="eyebrow mt-1.5">{label}</div>
    </div>
  )
}
