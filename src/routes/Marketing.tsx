import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Wordmark } from '../components/Logo'
import { AttendanceSummary, RegisterLegend, RegisterStrip } from '../components/RegisterStrip'
import { Button, Field, Modal } from '../components/ui'
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
            <a href="#how" className="hover:text-ink">
              How it works
            </a>
            <a href="#pricing" className="hover:text-ink">
              Pricing
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
            <a href="#how" className="block text-[14px]" onClick={() => setNavOpen(false)}>
              How it works
            </a>
            <a href="#pricing" className="block text-[14px]" onClick={() => setNavOpen(false)}>
              Pricing
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
            <p className="mt-5 text-[16px] sm:text-[18px] leading-relaxed text-ink-invert/70 max-w-[42ch]">
              Parents pay fees, then hear nothing until report-card day. Daymaark closes that
              silence: attendance, the lesson, and the homework, the same day it happens.
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
              No signup. Three roles. Sample school, real product.
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
            ['Same day', 'Parents see the lesson'],
            ['N300–500', 'Per student, per term'],
            ['PWA', 'No app store required'],
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
              b: 'Full school systems try to be everything. Daymaark does the one job parents actually open an app for.',
            },
          ].map((c) => (
            <article key={c.t} className="bg-surface border border-rule rounded-lg p-5">
              <h3 className="text-[18px]">{c.t}</h3>
              <p className="mt-2 text-[14px] text-ink-soft leading-relaxed">{c.b}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="how" className="bg-surface-alt border-y border-rule">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <span className="eyebrow">How it works</span>
          <h2 className="text-[32px] sm:text-[40px] mt-2 max-w-[16ch]">
            Three roles. One school day.
          </h2>
          <ol className="mt-10 grid md:grid-cols-3 gap-6">
            {[
              {
                n: '01',
                t: 'Teacher marks the register',
                b: 'All present in one tap. Correct the two exceptions. Offline-safe. Twenty seconds, every morning.',
              },
              {
                n: '02',
                t: 'The lesson is posted',
                b: 'Subject, topic, a short summary, homework and due date. Parents see it the same afternoon.',
              },
              {
                n: '03',
                t: 'The parent already knows',
                b: 'A register strip, today’s lessons, what is due. One screen on the bus to work.',
              },
            ].map((s) => (
              <li key={s.n} className="bg-surface border border-rule rounded-lg p-5">
                <span className="tnum text-brass text-[13px] font-semibold">{s.n}</span>
                <h3 className="text-[18px] mt-3">{s.t}</h3>
                <p className="mt-2 text-[14px] text-ink-soft leading-relaxed">{s.b}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20 space-y-16">
        <RoleBlock
          kicker="For parents"
          title="The day your child actually had."
          body="Not a newsletter. Not a report card three months late. Attendance as a register line, lessons as they were taught, homework with a due date."
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
          kicker="For proprietors"
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
      </section>

      <section className="bg-ink text-ink-invert">
        <div className="mx-auto max-w-6xl px-5 py-20 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-brass">
              Not another ERP
            </span>
            <h2 className="text-[32px] sm:text-[40px] mt-3 max-w-[16ch]">
              Sits beside the school you already run.
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-ink-invert/70 max-w-[48ch]">
              Fees, admissions and accounts can stay where they are. Daymaark answers the question
              every parent actually asks, and it works on a mid-range Android, on patchy data.
            </p>
          </div>
          <ul className="space-y-3">
            {[
              ['EDVES-class platforms', 'Try to own the whole school. Heavy to start. Parents still wait for reports.'],
              ['WhatsApp groups', 'Free, familiar, and structurally the wrong tool for a record.'],
              ['Daymaark', 'Attendance, lessons, homework, notices, fees visibility. Same day. Light enough to actually use.'],
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
        <h2 className="text-[32px] sm:text-[40px] mt-2">The school buys. Families are included.</h2>
        <div className="mt-10 grid md:grid-cols-3 gap-4">
          <PriceCard
            name="Pilot"
            price="Free"
            unit="one term, one school"
            points={['Full product', 'Up to 80 students', 'Email support']}
          />
          <PriceCard
            name="Term"
            price="N400"
            unit="per student / term"
            featured
            points={['Parents and teachers included', 'Offline register', 'Daily digest', 'Claim-code onboarding']}
          />
          <PriceCard
            name="Group"
            price="Talk"
            unit="multi-campus"
            points={['Consolidated attendance', 'Shared branding', 'Onboarding for staff']}
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
              'Do we have to replace our current school software?',
              'No. Daymaark is a transparency layer. Keep your fees and admin tools. Parents get the school day.',
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
              'No. Access is scoped by school, then by family. A parent sees only their own children.',
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
            <h2 className="text-[36px] max-w-[14ch]">Put the school day in the parent’s pocket.</h2>
            <p className="mt-3 text-ink-invert/65 max-w-[40ch]">
              Walk the product as a parent, a teacher and a proprietor. Then book a session with your own class list.
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
              Parent transparency for Nigerian schools. Every school day, marked.
            </p>
          </div>
          <div className="flex gap-8 text-[13px] text-ink-soft">
            <Link to="/login" className="hover:text-ink">
              Sign in
            </Link>
            <Link to="/signup" className="hover:text-ink">
              Create a school
            </Link>
            <Link to="/demo" className="hover:text-ink">
              Live demo
            </Link>
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
