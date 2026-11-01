import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Wordmark } from '../components/Logo'
import { AttendanceSummary, RegisterLegend, RegisterStrip } from '../components/RegisterStrip'
import { Button, Field, Modal } from '../components/ui'
import { CARE_DISPLAY, CARE_URL } from '../components/BrandCredit'
import {
  attendancePct,
  demoMarks,
  demoFlaggedMarks,
  demoLessonsToday,
  DEMO_CLASS,
} from '../lib/demo'
import type { AttendanceMark } from '../lib/types'

function fakeMarks(seed: number, days = 40): AttendanceMark[] {
  const out: AttendanceMark[] = []
  let n = seed
  for (let i = 0; i < days; i++) {
    n = (n * 1103515245 + 12345) % 2147483648
    const r = (n / 2147483648) * 100
    out.push({
      date: `2026-01-${String((i % 28) + 1).padStart(2, '0')}`,
      status: r > 93 ? 'absent' : r > 86 ? 'late' : 'present',
    })
  }
  return out
}

export default function Marketing() {
  const [demoOpen, setDemoOpen] = useState(false)
  const [sent, setSent] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
  const pct = attendancePct(demoMarks) ?? 94

  return (
    <div className="min-h-dvh bg-paper text-ink">
      <header className="sticky top-0 z-30 bg-paper/92 backdrop-blur border-b border-rule">
        <div className="mx-auto max-w-6xl px-5 h-16 flex items-center gap-6">
          <Link to="/" aria-label="Daymaark home">
            <Wordmark size="sm" />
          </Link>
          <nav className="hidden md:flex items-center gap-6 ml-4 text-[13px] text-ink-soft">
            <a href="#product" className="hover:text-ink">
              Product
            </a>
            <a href="#desks" className="hover:text-ink">
              Desks
            </a>
            <a href="#how" className="hover:text-ink">
              How it works
            </a>
            <a href="#pricing" className="hover:text-ink">
              Pricing
            </a>
            <a href="#functions" className="hover:text-ink">
              Functions
            </a>
            <a href="#faq" className="hover:text-ink">
              FAQ
            </a>
          </nav>
          <div className="ml-auto hidden md:flex items-center gap-2">
            <Link to="/login">
              <Button variant="ghost">Sign in</Button>
            </Link>
            <Link to="/demo">
              <Button variant="secondary">Try live demo</Button>
            </Link>
            <Button onClick={() => setDemoOpen(true)}>Book a demo</Button>
          </div>
          <button
            className="ml-auto md:hidden h-10 px-3 border border-rule-strong rounded-md text-[12px] font-mono uppercase tracking-[0.12em]"
            onClick={() => setNavOpen((v) => !v)}
            aria-expanded={navOpen}
          >
            Menu
          </button>
        </div>
        {navOpen && (
          <div className="md:hidden border-t border-rule px-5 py-4 space-y-3 bg-paper">
            <a href="#product" className="block text-[14px]" onClick={() => setNavOpen(false)}>
              Product
            </a>
            <a href="#desks" className="block text-[14px]" onClick={() => setNavOpen(false)}>
              Desks
            </a>
            <a href="#how" className="block text-[14px]" onClick={() => setNavOpen(false)}>
              How it works
            </a>
            <a href="#pricing" className="block text-[14px]" onClick={() => setNavOpen(false)}>
              Pricing
            </a>
            <a href="#functions" className="block text-[14px]" onClick={() => setNavOpen(false)}>
              Functions
            </a>
            <a href="#faq" className="block text-[14px]" onClick={() => setNavOpen(false)}>
              FAQ
            </a>
            <div className="flex flex-col gap-2 pt-2">
              <Link to="/login">
                <Button variant="ghost" full>
                  Sign in
                </Button>
              </Link>
              <Link to="/demo">
                <Button variant="secondary" full>
                  Try live demo
                </Button>
              </Link>
              <Button full onClick={() => setDemoOpen(true)}>
                Book a demo
              </Button>
            </div>
          </div>
        )}
      </header>

      <section className="bg-ink text-ink-invert">
        <div className="mx-auto max-w-6xl px-5 py-16 lg:py-24 grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-brass">
              Every school day, marked
            </p>
            <h1 className="mt-4 text-[40px] sm:text-[56px] lg:text-[64px] leading-[1.02] max-w-[14ch]">
              What happened at school today.
            </h1>
            <p className="mt-5 text-[16px] sm:text-[18px] leading-relaxed text-ink-invert/70 max-w-[44ch]">
              The school OS for Nigerian schools. Register, lessons, CBT, report cards, household
              fees, HR, clinic and admissions — proprietor, admin, teacher, HR, clinic, parent and
              student, on one record.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/demo">
                <Button className="h-12 px-6">Try the live demo</Button>
              </Link>
              <Button variant="secondary" className="h-12 px-6 bg-transparent text-ink-invert border-ink-invert/25 hover:bg-ink-invert/10" onClick={() => setDemoOpen(true)}>
                Book a school walkthrough
              </Button>
            </div>
            <p className="mt-4 text-[12px] text-ink-invert/45">
              No signup. Seven desks. Sample school, real product.
            </p>
          </div>

          <div className="border border-ink-invert/15 rounded-lg p-5 bg-ink/40">
            <div className="flex items-baseline justify-between">
              <span className="text-[15px] font-semibold">Adaeze Okonkwo</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-invert/45">
                {DEMO_CLASS}
              </span>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-1.5">
                <span className="tnum text-[40px] leading-none font-semibold">{pct}</span>
                <span className="tnum text-[13px] text-ink-invert/50">%</span>
                <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.14em] text-ink-invert/45">
                  First term
                </span>
              </div>
              <div className="mt-4">
                <RegisterStrip marks={demoMarks} />
              </div>
            </div>
            <div className="mt-5 pt-4 border-t border-ink-invert/12 space-y-3">
              {demoLessonsToday.slice(0, 2).map((l) => (
                <div key={l.id}>
                  <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-brass">
                    {l.subject}
                  </div>
                  <div className="text-[14px] font-semibold mt-0.5">{l.topic}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-rule">
        <div className="mx-auto max-w-6xl px-5 py-10 grid grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            ['20s', 'To mark a class present'],
            ['7 desks', 'Office, HR, clinic, family'],
            ['30 days free', 'Then N1,500 per student / month'],
            ['Offline-safe', 'Register works on 2G'],
          ].map(([k, v]) => (
            <div key={k}>
              <div className="tnum text-[28px] font-semibold leading-none">{k}</div>
              <div className="eyebrow mt-2">{v}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="product" className="mx-auto max-w-6xl px-5 py-20">
        <span className="eyebrow">The gap</span>
        <h2 className="text-[32px] sm:text-[40px] mt-2 max-w-[18ch]">
          Schools already have software. Parents still have WhatsApp.
        </h2>
        <div className="mt-10 grid md:grid-cols-3 gap-4">
          {[
            {
              t: 'Fees, then silence',
              b: 'A parent pays in January and hears nothing until June. The school day happened. It was never shown.',
            },
            {
              t: 'WhatsApp is not a record',
              b: 'Notices vanish under stickers. There is no proof of delivery. Teachers are on their personal phones at midnight.',
            },
            {
              t: 'ERPs are too much',
              b: 'Full school systems try to be everything. Daymaark is the daily record: register, CBT, report cards, fees, HR and clinic, light enough to actually run.',
            },
          ].map((c) => (
            <article key={c.t} className="bg-surface border border-rule rounded-lg p-5">
              <h3 className="text-[18px]">{c.t}</h3>
              <p className="mt-2 text-[14px] text-ink-soft leading-relaxed">{c.b}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="desks" className="bg-surface-alt border-y border-rule">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <span className="eyebrow">The school, on one product</span>
          <h2 className="text-[32px] sm:text-[40px] mt-2 max-w-[18ch]">
            Every desk the school actually runs.
          </h2>
          <p className="mt-3 text-[15px] text-ink-soft max-w-[56ch]">
            Not a teaser. The live product. Walk each desk on the demo, or sign in to Greenfield
            with the seats below.
          </p>
          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                k: 'Register',
                t: 'Attendance',
                b: 'Class present in twenty seconds. Notes on the two exceptions. Offline-safe.',
              },
              {
                k: 'Teacher',
                t: 'Lessons & homework',
                b: 'Topic, summary, due date. Parents see it the same afternoon.',
              },
              {
                k: 'CBT',
                t: 'Exams',
                b: 'Question bank, sit paper, mark, approve. QR poster on the classroom door.',
              },
              {
                k: 'Reports',
                t: 'Term cards',
                b: 'Register plus approved CBT, class-teacher and principal comments, print-ready.',
              },
              {
                k: 'Fees',
                t: 'Household',
                b: 'One statement for every child on the login. Pay once. Outstanding locks the report.',
              },
              {
                k: 'HR',
                t: 'Staff register',
                b: 'Who is in, who is out, who called in sick. Parents never see this sheet.',
              },
              {
                k: 'Clinic',
                t: 'Sick bay',
                b: 'Complaint, treatment, sent home. Proprietor and clinic only.',
              },
              {
                k: 'Library',
                t: 'Coming soon',
                b: 'Catalogue, loans and returns. The desk is reserved on every school.',
              },
              {
                k: 'Apply',
                t: 'Admissions',
                b: 'Public apply page, enquiry list, entrance interview on a sit link.',
              },
              {
                k: 'IDs',
                t: 'CR80 cards',
                b: 'Print the whole class, front and back, with the school crest.',
              },
              {
                k: 'Timetable',
                t: 'The week',
                b: 'Periods, rooms, teachers. Office writes it. Teachers and parents read it.',
              },
              {
                k: 'Notices',
                t: 'The board',
                b: 'Pinned to parents, staff or a class. Not a WhatsApp that vanishes.',
              },
            ].map((c) => (
              <article key={c.t} className="bg-surface border border-rule rounded-lg p-5">
                <span className="eyebrow">{c.k}</span>
                <h3 className="text-[18px] mt-2">{c.t}</h3>
                <p className="mt-2 text-[14px] text-ink-soft leading-relaxed">{c.b}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="how" className="mx-auto max-w-6xl px-5 py-20">
        <span className="eyebrow">How it works</span>
        <h2 className="text-[32px] sm:text-[40px] mt-2 max-w-[16ch]">
          Seven desks. One school record.
        </h2>
        <ol className="mt-10 grid md:grid-cols-3 gap-6">
          {[
            {
              n: '01',
              t: 'The morning is marked',
              b: 'Teacher marks the class. HR marks staff. Clinic notes the child who came through sick bay.',
            },
            {
              n: '02',
              t: 'The day is posted',
              b: 'Lessons, homework, a CBT paper, a notice. Fees sit on the household, not a portal per child.',
            },
            {
              n: '03',
              t: 'The family already knows',
              b: 'Register strip, today’s lessons, what is due, the term card when it is approved. One screen.',
            },
          ].map((s) => (
            <li key={s.n} className="bg-surface border border-rule rounded-lg p-5">
              <span className="tnum text-brass text-[13px] font-semibold">{s.n}</span>
              <h3 className="text-[18px] mt-3">{s.t}</h3>
              <p className="mt-2 text-[14px] text-ink-soft leading-relaxed">{s.b}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20 space-y-16">
        <RoleBlock
          kicker="For parents"
          title="The day your child actually had."
          body="Not a newsletter. Not a report card three months late. Attendance as a register line, lessons as they were taught, homework with a due date, household fees, and the term card once the school approves it."
          cta="Open the parent demo"
          to="/demo?role=parent"
        >
          <div className="bg-surface border border-rule rounded-lg p-5">
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-[15px] font-semibold">Adaeze Okonkwo</span>
              <span className="eyebrow">{DEMO_CLASS}</span>
            </div>
            <AttendanceSummary pct={pct} marks={demoMarks} caption="First term" />
            <div className="mt-4 pt-4 border-t border-rule">
              <RegisterLegend />
            </div>
          </div>
        </RoleBlock>

        <RoleBlock
          kicker="For teachers"
          title="The twenty-second register."
          body="The whole class on one screen, four taps wide. Marks save as you go. If the network drops, they queue and send themselves."
          cta="Open the teacher demo"
          to="/demo?role=teacher"
          reverse
        >
          <div className="bg-surface border border-rule rounded-lg overflow-hidden">
            <div className="px-4 h-11 border-b border-rule flex items-center justify-between">
              <span className="eyebrow">{DEMO_CLASS} · 6 of 8 marked</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-present">
                Saved
              </span>
            </div>
            <div className="divide-y divide-rule">
              {[
                ['Okonkwo, Adaeze', 'P'],
                ['Eze, Chinedu', 'P'],
                ['Adeyemi, Bola', 'L'],
                ['Sule, Ibrahim', ''],
              ].map(([n, m]) => (
                <div key={n} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="text-[14px]">{n}</span>
                  <span
                    className={`ml-auto h-8 w-8 grid place-items-center rounded-md border font-mono text-[12px] font-semibold
                      ${m === 'P' ? 'bg-present text-ink-invert border-present' : ''}
                      ${m === 'L' ? 'bg-late text-ink border-late' : ''}
                      ${m === '' ? 'bg-surface text-ink-faint border-rule-strong' : ''}`}
                  >
                    {m || '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </RoleBlock>

        <RoleBlock
          kicker="For admin"
          title="Who has not posted. Who is slipping."
          body="Today’s counts, classes with no lesson, parents still unlinked, and the two children whose attendance is falling. The school, on one page."
          cta="Open the admin demo"
          to="/demo?role=admin"
        >
          <div className="bg-surface border border-rule rounded-lg p-5">
            <div className="grid grid-cols-2 gap-5">
              <Stat n="248" l="Students" />
              <Stat n="96%" l="Marked today" />
              <Stat n="11" l="Lessons posted" />
              <Stat n="18" l="Parents unlinked" />
            </div>
            <div className="mt-5 pt-4 border-t border-rule">
              <div className="eyebrow mb-2">Watch</div>
              <div className="flex items-baseline justify-between">
                <span className="text-[14px] font-semibold">Bola Adeyemi</span>
                <span className="tnum text-[13px] text-absent">68%</span>
              </div>
              <div className="mt-2">
                <RegisterStrip marks={demoFlaggedMarks} height="sm" />
              </div>
            </div>
          </div>
        </RoleBlock>

        <RoleBlock
          kicker="For proprietors"
          title="The school as a business."
          body="Enrolment, fee collection, outstanding balances, expenses and margin, term by term. The school pays. Price follows the roll."
          cta="Open the proprietor demo"
          to="/demo?role=proprietor"
          reverse
        >
          <div className="bg-surface border border-rule rounded-lg p-5">
            <div className="grid grid-cols-2 gap-5">
              <Stat n="N18.6m" l="Collected" />
              <Stat n="N3.4m" l="Outstanding" />
              <Stat n="94%" l="Attendance" />
              <Stat n="34" l="Staff" />
            </div>
            <div className="mt-5 pt-4 border-t border-brass border-rule">
              <div className="flex items-center justify-between">
                <span className="eyebrow">Subscription</span>
                <span className="tnum text-[13px] text-brass">N1,500 / student / month</span>
              </div>
            </div>
          </div>
        </RoleBlock>

        <RoleBlock
          kicker="For students"
          title="Their own school day."
          body="Sit a paper from a QR poster, see homework with a due date, and open results once the school approves them. A student sees their record, not the whole school's."
          cta="Open the student demo"
          to="/demo?role=student"
        >
          <div className="bg-surface border border-rule rounded-lg p-5">
            <div className="divide-y divide-rule">
              {[
                ['Mathematics', 'Exercise 4.2', 'Tomorrow', 'Open'],
                ['English Language', 'Recount', 'Friday', 'Submitted'],
                ['Basic Science', 'Leaf cross-section', 'Monday', 'Open'],
              ].map(([s, t, d, st]) => (
                <div key={t} className="flex items-center gap-3 py-3">
                  <div>
                    <div className="eyebrow">{s}</div>
                    <div className="text-[14px] font-semibold">{t}</div>
                  </div>
                  <div className="ml-auto text-right">
                    <div className="tnum text-[12px] text-ink-faint">Due {d}</div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-soft">{st}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </RoleBlock>

        <RoleBlock
          kicker="CBT"
          title="Set a paper. Sit it. Mark it."
          body="Question bank, exam poster with a QR code, one attempt per name. Objective marks itself. Subjective waits for the teacher, then the office approves before a parent sees it."
          cta="Open the CBT demo"
          to="/demo?role=admin"
          reverse
        >
          <div className="bg-surface border border-rule rounded-lg overflow-hidden">
            <div className="px-4 h-11 border-b border-rule flex items-center justify-between">
              <span className="eyebrow">JSS 1 Mathematics CA 1</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-present">
                Published
              </span>
            </div>
            <div className="p-5 space-y-3">
              {[
                ['Sitters', '28 / 32'],
                ['Duration', '40 min'],
                ['Pending marking', '1 paper'],
                ['Approved', 'Adaeze 9 / 10'],
              ].map(([l, v]) => (
                <div key={l} className="flex items-baseline justify-between">
                  <span className="text-[14px] text-ink-soft">{l}</span>
                  <span className="tnum text-[14px] font-semibold">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </RoleBlock>

        <RoleBlock
          kicker="For HR"
          title="Who is in. Who called in sick."
          body="The staff register is not the class register. HR marks present, absent or sick each morning. Parents and students never open this sheet."
          cta="Sign in as HR"
          to="/login"
        >
          <div className="bg-surface border border-rule rounded-lg overflow-hidden">
            <div className="grid grid-cols-3 gap-px bg-rule border-b border-rule">
              {[
                ['5', 'Present'],
                ['1', 'Absent'],
                ['1', 'Sick'],
              ].map(([n, l]) => (
                <div key={l} className="bg-surface px-4 py-4">
                  <div className="tnum text-[22px] leading-none font-semibold">{n}</div>
                  <div className="eyebrow mt-2">{l}</div>
                </div>
              ))}
            </div>
            <div className="divide-y divide-rule">
              {[
                ['Mrs. Ngozi Bello', 'Teacher', 'In'],
                ['Mr. Tunde Adewale', 'Teacher', 'Out'],
                ['Ms. Chioma Nnaji', 'Teacher', 'Sick'],
                ['Nurse Amaka Cole', 'Clinic', 'In'],
              ].map(([n, r, s]) => (
                <div key={n} className="flex items-center gap-3 px-4 py-2.5">
                  <div>
                    <div className="text-[14px]">{n}</div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">{r}</div>
                  </div>
                  <span
                    className={`ml-auto font-mono text-[11px] uppercase tracking-[0.1em]
                      ${s === 'In' ? 'text-present' : ''}
                      ${s === 'Out' ? 'text-absent' : ''}
                      ${s === 'Sick' ? 'text-late' : ''}`}
                  >
                    {s}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </RoleBlock>

        <RoleBlock
          kicker="For clinic"
          title="The sick-bay book."
          body="Complaint, treatment, sent home. Only the proprietor and clinic staff open it. The class register stays a register."
          cta="Sign in as clinic"
          to="/login"
          reverse
        >
          <div className="bg-surface border border-rule rounded-lg p-5">
            <div className="divide-y divide-rule -my-1">
              {[
                ['Tunde Balogun', 'JSS 1A · sent home', 'Fever. Temperature 38.6. Paracetamol.'],
                ['Bola Adeyemi', 'JSS 1A · returned', 'Headache after assembly. Water, rest.'],
                ['Sade Williams', 'Primary 4A', 'Cut on the left knee at break. Plastered.'],
              ].map(([n, m, c]) => (
                <div key={n} className="py-3">
                  <div className="text-[14px] font-semibold">{n}</div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint mt-0.5">
                    {m}
                  </div>
                  <div className="mt-1 text-[13px] text-ink-soft">{c}</div>
                </div>
              ))}
            </div>
          </div>
        </RoleBlock>

        <RoleBlock
          kicker="Fees"
          title="One household. One statement."
          body="Every child on the parent login, billed together. Pay once. Outstanding fees lock the term card until the office clears the child."
          cta="Open the parent fees demo"
          to="/demo?role=parent"
        >
          <div className="bg-surface border border-rule rounded-lg p-5">
            <div className="flex items-baseline justify-between">
              <span className="eyebrow">Household</span>
              <span className="tnum text-[13px] text-absent">N90,000 due</span>
            </div>
            <div className="mt-4 divide-y divide-rule">
              {[
                ['Adaeze Okonkwo', 'JSS 1A · Second instalment', 'N50,000'],
                ['Kamsi Okonkwo', 'Primary 4A · First instalment', 'N50,000'],
              ].map(([n, l, a]) => (
                <div key={n} className="flex items-baseline justify-between py-3">
                  <div>
                    <div className="text-[14px] font-semibold">{n}</div>
                    <div className="text-[12px] text-ink-faint mt-0.5">{l}</div>
                  </div>
                  <span className="tnum text-[14px] font-semibold">{a}</span>
                </div>
              ))}
            </div>
          </div>
        </RoleBlock>

        <RoleBlock
          kicker="Admissions"
          title="Apply on the public page. Interview on a sit link."
          body="A parent fills the enquiry. The office sees it on one list. Entrance interview uses the same CBT sit flow as a class paper. No extra product."
          cta="Open admissions"
          to="/demo?role=admin"
          reverse
        >
          <div className="bg-surface border border-rule rounded-lg overflow-hidden">
            <div className="px-4 h-11 border-b border-rule flex items-center justify-between">
              <span className="eyebrow">Enquiries · this week</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-brass">
                3 new
              </span>
            </div>
            <div className="divide-y divide-rule">
              {[
                ['Ifeoma Nwachukwu', 'JSS 1 · interview booked'],
                ['David Okafor', 'Primary 1 · awaiting form'],
                ['Zainab Musa', 'JSS 1 · waitlist'],
              ].map(([n, s]) => (
                <div key={n} className="flex items-baseline justify-between px-4 py-3">
                  <span className="text-[14px] font-semibold">{n}</span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-faint">
                    {s}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </RoleBlock>

        <RoleBlock
          kicker="ID cards"
          title="Print the class. Front and back. CR80."
          body="Name, class, admission number, school crest. The header follows the school colour. Cut, laminate, issue."
          cta="Open ID cards"
          to="/demo?role=admin"
        >
          <div className="bg-surface border border-rule rounded-lg p-5">
            <div className="bg-chrome text-ink-invert rounded-sm px-3 py-2 flex items-center gap-2">
              <span className="h-4 w-4 rounded-[1px] bg-ink-invert/20 shrink-0" />
              <span className="font-display font-bold text-[13px] truncate">
                Greenfield Academy
              </span>
            </div>
            <div className="mt-3">
              <div className="text-[16px] font-semibold">Adaeze Okonkwo</div>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="eyebrow">JSS 1A</span>
                <span className="font-mono text-[11px] text-ink-faint">GFA-1402</span>
              </div>
            </div>
          </div>
        </RoleBlock>

        <RoleBlock
          kicker="Timetable"
          title="The week, written once."
          body="Office sets periods, rooms and teachers. Teachers and parents read the same grid. No spreadsheet emailed every Sunday."
          cta="Open the timetable"
          to="/demo?role=admin"
          reverse
        >
          <div className="bg-surface border border-rule rounded-lg overflow-hidden">
            <div className="px-4 h-11 border-b border-rule flex items-center">
              <span className="eyebrow">JSS 1A · Monday</span>
            </div>
            <div className="divide-y divide-rule">
              {[
                ['08:00', 'Mathematics', 'Mrs. Bello · Rm 12'],
                ['08:40', 'English Language', 'Mr. Adewale · Rm 12'],
                ['09:20', 'Basic Science', 'Ms. Nnaji · Lab'],
              ].map(([t, s, r]) => (
                <div key={t} className="flex items-baseline gap-3 px-4 py-2.5">
                  <span className="tnum text-[12px] text-ink-faint w-12 shrink-0">{t}</span>
                  <div>
                    <div className="text-[14px] font-semibold">{s}</div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-faint">
                      {r}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </RoleBlock>

        <RoleBlock
          kicker="Notices"
          title="Pinned. Not vanished under stickers."
          body="Office posts to parents, staff or a class. It stays on the board. Proof of what was said, when."
          cta="Open notices"
          to="/demo?role=admin"
        >
          <div className="bg-surface border border-rule rounded-lg p-5 space-y-4">
            {[
              ['Parents', 'Second-term fees due Friday. Pay on the household statement.'],
              ['JSS 1A', 'Mathematics CA 1 sits Thursday. QR on the classroom door.'],
              ['Staff', 'Staff meeting, Thursday 2pm, staff room.'],
            ].map(([k, b]) => (
              <div key={k}>
                <span className="eyebrow">{k}</span>
                <p className="mt-1 text-[14px] leading-snug">{b}</p>
              </div>
            ))}
          </div>
        </RoleBlock>
      </section>

      <section id="functions" className="bg-surface-alt border-y border-rule">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <span className="eyebrow">Every live function</span>
          <h2 className="text-[32px] sm:text-[40px] mt-2 max-w-[20ch]">
            School management software that actually names the desks.
          </h2>
          <p className="mt-3 text-[15px] text-ink-soft max-w-[60ch]">
            Nigerian school software, attendance register, CBT exam, term report card, household
            school fees, HR staff register, clinic sick-bay, admissions, CR80 ID cards, timetable
            and notices — one product, one roll.
          </p>
          <dl className="mt-10 grid sm:grid-cols-2 gap-x-10 gap-y-6">
            {[
              [
                'Attendance register',
                'Mark a class present in twenty seconds. Late, absent, excused. Offline-safe on 2G. The strip is the term.',
              ],
              [
                'Lessons and homework',
                'Topic, summary, due date. Parents and students see it the same afternoon, not in a vanished chat.',
              ],
              [
                'CBT exams and question bank',
                'Set a paper, print a QR poster, sit one attempt per name. Objective marks itself. Office approves before a parent sees it.',
              ],
              [
                'Term report cards',
                'Register plus approved CBT, class-teacher and principal comments. Outstanding fees lock the print.',
              ],
              [
                'Household school fees',
                'Every child on the parent login, billed together. Pay once. The ledger is the school, not a portal per child.',
              ],
              [
                'HR staff register',
                'Who is in, who is out, who called in sick. Parents and students never open this sheet.',
              ],
              [
                'Clinic sick-bay notes',
                'Complaint, treatment, sent home. Proprietor and clinic only. The class register stays a register.',
              ],
              [
                'Admissions and entrance',
                'Public apply page, enquiry list, entrance interview on the same sit link as a class paper.',
              ],
              [
                'CR80 student ID cards',
                'Print the class, front and back, school crest and admission number. Header follows the school colour.',
              ],
              [
                'Timetable',
                'Periods, rooms, teachers. Office writes it. Teachers and parents read the same week.',
              ],
              [
                'School notices',
                'Pinned to parents, staff or a class. A record, not a WhatsApp that vanishes under stickers.',
              ],
              [
                'Flagged attendance',
                'The two children whose strip is falling. Admin sees them before June.',
              ],
              [
                'Student sit',
                'A child sits a paper from the classroom QR, sees homework, opens results once approved.',
              ],
              [
                'Ops desk',
                'Daymaark ops: which schools marked, which lapsed, which never started. Not a school screen.',
              ],
              [
                'Library',
                'Coming soon. Catalogue, loans and returns. The desk is already reserved on every school.',
              ],
            ].map(([t, b]) => (
              <div key={t}>
                <dt className="text-[16px] font-semibold">{t}</dt>
                <dd className="mt-1 text-[14px] text-ink-soft leading-relaxed">{b}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="bg-ink text-ink-invert">
        <div className="mx-auto max-w-6xl px-5 py-20 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-brass">
              Not another heavyweight ERP
            </span>
            <h2 className="text-[32px] sm:text-[40px] mt-3 max-w-[16ch]">
              A full school system, light enough to actually run.
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-ink-invert/70 max-w-[48ch]">
              Enrolment, register, CBT, report cards, household fees, HR, clinic and finance on
              one record. It works on a mid-range Android and on patchy data, which is where most
              school software gives up.
            </p>
          </div>
          <ul className="space-y-3">
            {[
              ['Legacy school ERPs', 'Own the whole school on paper, but are heavy to start and parents still wait for reports.'],
              ['WhatsApp groups', 'Free, familiar, and structurally the wrong tool for a record.'],
              ['Daymaark', 'The full school record, live the same day, offline-safe. The school pays per student.'],
            ].map(([t, b]) => (
              <li key={t} className="border border-ink-invert/15 rounded-lg p-4">
                <div className="text-[14px] font-semibold">{t}</div>
                <div className="text-[13px] text-ink-invert/60 mt-1">{b}</div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-6xl px-5 py-20">
        <span className="eyebrow">Pricing</span>
        <h2 className="text-[32px] sm:text-[40px] mt-2">
          30 days free. Then the school pays per student.
        </h2>
        <p className="mt-3 text-[15px] text-ink-soft max-w-[56ch]">
          Parents and students are never charged for Daymaark. We count active students on the roll
          and bill the school. No card needed to start the trial.
        </p>
        <div className="mt-10 grid md:grid-cols-3 gap-4">
          <PriceCard
            name="Month"
            price="N1,500"
            unit="per student / month"
            points={['School pays, not families', 'Counted from the live roll', 'Cancel any month']}
          />
          <PriceCard
            name="Term"
            price="N3,500"
            unit="per student / term"
            featured
            points={[
              'School pays, not families',
              'Counted from the live roll',
              'Register, lessons, results, fees',
              'HR, clinic notes, CBT',
            ]}
          />
          <PriceCard
            name="School year"
            price="N10,000"
            unit="per student / year"
            points={['School pays, not families', 'Counted from the live roll', 'One invoice for the year']}
          />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-8">
        <div className="bg-surface border border-rule rounded-lg p-5">
          <span className="eyebrow">Two children, same class</span>
          <div className="mt-4 grid md:grid-cols-2 gap-8">
            <div>
              <div className="flex items-baseline justify-between mb-1">
                <span className="font-semibold">Adaeze Okonkwo</span>
                <span className="eyebrow">94%</span>
              </div>
              <RegisterStrip marks={fakeMarks(7)} />
            </div>
            <div>
              <div className="flex items-baseline justify-between mb-1">
                <span className="font-semibold">Bola Adeyemi</span>
                <span className="eyebrow">68%</span>
              </div>
              <RegisterStrip marks={fakeMarks(41)} />
            </div>
          </div>
          <p className="mt-5 text-[13px] text-ink-faint">
            The strip is the product. A parent reads a term in two seconds.
          </p>
        </div>
      </section>

      <section id="faq" className="mx-auto max-w-6xl px-5 py-20">
        <span className="eyebrow">FAQ</span>
        <h2 className="text-[32px] mt-2">Straight answers</h2>
        <dl className="mt-8 divide-y divide-rule border-y border-rule">
          {[
            [
              'What does it replace?',
              'The register book, the homework WhatsApp group, the results spreadsheet, the fee ledger, the staff book and the sick-bay notebook. Admissions and CBT sit on the same record, so most schools run on Daymaark alone.',
            ],
            [
              'What does it cost?',
              '30 days free, then the school pays N1,500 per student per month, N3,500 per term, or N10,000 per school year. Parents and students are not billed.',
            ],
            [
              'Can parents use it without a smartphone?',
              'The app is a PWA for Android and iOS. Digests can go by SMS for families on feature phones.',
            ],
            [
              'How do parents join without a messy signup?',
              'The school generates an eight-character claim code per child. The parent enters it once.',
            ],
            [
              'What if the network drops during register?',
              'Marks save on the device and send when the teacher is back online. The morning cannot wait.',
            ],
            [
              'Is pupil data shared across schools?',
              'No. Access is scoped by school, then by family. A parent sees only their own children. HR and clinic never leak to parents.',
            ],
            [
              'Does it do HR, clinic and library?',
              'HR marks staff in, out or sick. Clinic records visits. Library is reserved on every school — catalogue and loans come next. CBT, term cards, household fees, admissions, ID cards, timetable and notices are live.',
            ],
            [
              'Can the school use its own colour?',
              'Yes. Account sets one accent. It paints the sidebar, the phone bar, buttons, marks and print. Light colours are darkened on chrome so type stays readable.',
            ],
          ].map(([q, a]) => (
            <div key={q} className="py-5">
              <dt className="text-[16px] font-semibold">{q}</dt>
              <dd className="mt-1.5 text-[14px] text-ink-soft max-w-[70ch] leading-relaxed">{a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="bg-ink text-ink-invert">
        <div className="mx-auto max-w-6xl px-5 py-16 flex flex-col lg:flex-row lg:items-end gap-6 justify-between">
          <div>
            <h2 className="text-[36px] max-w-[16ch]">Run the whole school. Show the whole family.</h2>
            <p className="mt-3 text-ink-invert/65 max-w-[44ch]">
              Walk every desk on a live school, then book a session with your own class list.
              The school pays per student after a 30-day trial.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/demo">
              <Button className="h-12 px-6">Try the live demo</Button>
            </Link>
            <Button
              variant="secondary"
              className="h-12 px-6 bg-transparent text-ink-invert border-ink-invert/25 hover:bg-ink-invert/10"
              onClick={() => setDemoOpen(true)}
            >
              Book a walkthrough
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-rule">
        <div className="mx-auto max-w-6xl px-5 py-10 flex flex-col sm:flex-row gap-6 justify-between">
          <div>
            <Wordmark size="sm" />
            <p className="mt-3 text-[12px] text-ink-faint max-w-[36ch]">
              The school OS for Nigerian schools. Every school day, marked.
            </p>
          </div>
          <div className="flex gap-8 text-[13px] text-ink-soft">
            <Link to="/login" className="hover:text-ink">
              Sign in
            </Link>
            <Link to="/signup" className="hover:text-ink">
              Create a school
            </Link>
            <a href="/setup.html" className="hover:text-ink">
              Setup brief
            </a>
            <a href="/Daymaark-onboarding.txt" download="Daymaark-onboarding.txt" className="hover:text-ink">
              Download guide
            </a>
            <a href={CARE_URL} target="_blank" rel="noreferrer" className="hover:text-ink">
              WhatsApp {CARE_DISPLAY}
            </a>
          </div>
        </div>
      </footer>

      <Modal open={demoOpen} onClose={() => { setDemoOpen(false); setSent(false) }} title="Book a walkthrough">
        {sent ? (
          <div>
            <h3 className="text-[20px]">We have the request.</h3>
            <p className="mt-2 text-[14px] text-ink-soft">
              Meanwhile, the live demo is open. No account needed.
            </p>
            <div className="mt-5">
              <Link to="/demo">
                <Button full>Enter the live demo</Button>
              </Link>
            </div>
          </div>
        ) : (
          <DemoForm onDone={() => setSent(true)} />
        )}
      </Modal>
    </div>
  )
}

function Stat({ n, l }: { n: string; l: string }) {
  return (
    <div>
      <div className="tnum text-[28px] leading-none font-semibold">{n}</div>
      <div className="eyebrow mt-1.5">{l}</div>
    </div>
  )
}

function RoleBlock({
  kicker,
  title,
  body,
  cta,
  to,
  children,
  reverse,
}: {
  kicker: string
  title: string
  body: string
  cta: string
  to: string
  children: ReactNode
  reverse?: boolean
}) {
  return (
    <div className={`grid lg:grid-cols-2 gap-10 items-center ${reverse ? '' : ''}`}>
      <div className={reverse ? 'lg:order-2' : ''}>
        <span className="eyebrow">{kicker}</span>
        <h2 className="text-[28px] sm:text-[36px] mt-2 max-w-[16ch]">{title}</h2>
        <p className="mt-3 text-[15px] text-ink-soft leading-relaxed max-w-[48ch]">{body}</p>
        <div className="mt-5">
          <Link to={to}>
            <Button>{cta}</Button>
          </Link>
        </div>
      </div>
      <div className={reverse ? 'lg:order-1' : ''}>{children}</div>
    </div>
  )
}

function PriceCard({
  name,
  price,
  unit,
  points,
  featured,
}: {
  name: string
  price: string
  unit: string
  points: string[]
  featured?: boolean
}) {
  return (
    <article
      className={`border rounded-lg p-5 ${featured ? 'border-brass bg-brass-wash' : 'border-rule bg-surface'}`}
    >
      <span className="eyebrow">{name}</span>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="tnum text-[32px] font-semibold leading-none">{price}</span>
      </div>
      <div className="text-[13px] text-ink-faint mt-1">{unit}</div>
      <ul className="mt-5 space-y-2">
        {points.map((p) => (
          <li key={p} className="text-[14px] text-ink-soft">
            {p}
          </li>
        ))}
      </ul>
    </article>
  )
}

function DemoForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [school, setSchool] = useState('')
  const [type, setType] = useState('')
  const [size, setSize] = useState('')

  return (
    <form
      className="space-y-3.5"
      onSubmit={(e) => {
        e.preventDefault()
        onDone()
      }}
    >
      <p className="text-[13px] text-ink-soft">
        Twenty minutes on your class list. Or skip the form and walk the product now.
      </p>
      <Field label="Full name" required value={name} onChange={(e) => setName(e.target.value)} />
      <Field label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      <Field label="Phone" type="tel" required placeholder="+234" value={phone} onChange={(e) => setPhone(e.target.value)} />
      <Field label="School name" required value={school} onChange={(e) => setSchool(e.target.value)} />
      <label className="block">
        <span className="eyebrow block mb-1.5">School type</span>
        <select
          required
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="w-full h-11 px-3 bg-surface border border-rule-strong rounded-md text-[15px] focus:border-brass"
        >
          <option value="">Select type</option>
          <option>Private school</option>
          <option>Public school</option>
          <option>Mission / faith-based</option>
          <option>School group</option>
        </select>
      </label>
      <Field
        label="Number of students"
        required
        placeholder="e.g. 240"
        value={size}
        onChange={(e) => setSize(e.target.value)}
      />
      <Button type="submit" full>
        Request walkthrough
      </Button>
      <Link to="/demo" className="block text-center text-[13px] text-ink underline underline-offset-4 decoration-brass">
        Or enter the live demo now
      </Link>
    </form>
  )
}
