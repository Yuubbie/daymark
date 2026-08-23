#!/usr/bin/env bash
# =============================================================================
# Duro - design v2
# New tally mark, split auth layout, dash-free copy.
# Run from the project root:   bash duro-v2.sh
# =============================================================================
set -e
if [ ! -f package.json ]; then
  echo "ERROR: run this from inside ~/Projects/duro" >&2
  exit 1
fi
mkdir -p src/lib src/components src/routes public
echo "Updating..."
echo "  src/components/DuroMark.tsx"
cat > src/components/DuroMark.tsx <<'DURO_EOF'
/* ---------------------------------------------------------------------------
   The Duro mark: a tally of five.

   Four uprights and a strike. One complete week in the attendance register,
   which is exactly how RegisterStrip groups its marks. The logo is a week of
   the product. Equal heights, so it never reads as a falling chart.
--------------------------------------------------------------------------- */

export function DuroMark({
  className = '',
  accent = 'text-brass',
}: {
  className?: string
  accent?: string
}) {
  return (
    <svg viewBox="0 0 32 24" fill="none" className={className} aria-hidden="true">
      <g fill="currentColor">
        <rect x="2" y="3" width="3.2" height="18" rx="1.2" />
        <rect x="8.4" y="3" width="3.2" height="18" rx="1.2" />
        <rect x="14.8" y="3" width="3.2" height="18" rx="1.2" />
        <rect x="21.2" y="3" width="3.2" height="18" rx="1.2" />
      </g>
      <path
        d="M1 19.5 L29.5 4.5"
        className={accent}
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function DuroWordmark({
  className = '',
  size = 'md',
  accent = 'text-brass',
}: {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  accent?: string
}) {
  const dims = {
    sm: { mark: 'h-4 w-[21px]', text: 'text-[16px]' },
    md: { mark: 'h-5 w-[27px]', text: 'text-[20px]' },
    lg: { mark: 'h-7 w-[37px]', text: 'text-[28px]' },
  }[size]

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <DuroMark className={dims.mark} accent={accent} />
      <span
        className={`font-display font-bold tracking-[-0.03em] ${dims.text}`}
        style={{ lineHeight: 1 }}
      >
        Duro
      </span>
    </span>
  )
}
DURO_EOF

echo "  src/components/AuthLayout.tsx"
cat > src/components/AuthLayout.tsx <<'DURO_EOF'
import type { ReactNode } from 'react'
import { DuroWordmark } from './DuroMark'
import { RegisterStrip } from './RegisterStrip'
import type { AttendanceMark, AttendanceStatus } from '../lib/types'

/* ---------------------------------------------------------------------------
   Split auth layout.

   Left: the product, proving itself before anyone types a password.
   Right: the form.
   Under lg, the left panel collapses to a compact ink band.
--------------------------------------------------------------------------- */

function demoTerm(seed: number, days = 45): AttendanceMark[] {
  const out: AttendanceMark[] = []
  let n = seed
  for (let i = 0; i < days; i++) {
    n = (n * 1103515245 + 12345) % 2147483648
    const r = (n / 2147483648) * 100
    const status: AttendanceStatus | null =
      i > days - 3 ? null : r > 93 ? 'absent' : r > 86 ? 'late' : r > 83 ? 'excused' : 'present'
    const d = new Date(2026, 0, 12 + Math.floor(i / 5) * 7 + (i % 5))
    out.push({ date: d.toISOString().slice(0, 10), status })
  }
  return out
}

export function AuthLayout({
  children,
  headline,
  sub,
}: {
  children: ReactNode
  headline: ReactNode
  sub: string
}) {
  const term = demoTerm(19)

  return (
    <div className="min-h-dvh bg-paper lg:grid lg:grid-cols-[1.05fr_1fr]">
      {/* Left / top: ink panel */}
      <aside className="bg-ink text-ink-invert flex flex-col">
        <div className="px-6 pt-6 lg:px-12 lg:pt-12">
          <DuroWordmark size="md" className="text-ink-invert" />
        </div>

        <div className="hidden lg:flex flex-1 flex-col justify-center px-12 py-10">
          <h1 className="text-[44px] leading-[1.05] max-w-[13ch]">{headline}</h1>
          <p className="mt-5 text-[15px] leading-relaxed text-ink-invert/65 max-w-[38ch]">
            {sub}
          </p>

          {/* Proof: a real register line, on the login screen. */}
          <div className="mt-12 border border-ink-invert/15 rounded-lg p-5 max-w-[420px]">
            <div className="flex items-baseline justify-between">
              <span className="text-[14px] font-semibold">Ada Okafor</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-invert/45">
                JSS 1A
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="tnum text-[32px] leading-none font-semibold">94</span>
              <span className="tnum text-[13px] text-ink-invert/50">%</span>
              <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.14em] text-ink-invert/45">
                First term
              </span>
            </div>
            <div className="mt-3">
              <RegisterStrip marks={term} height="sm" />
            </div>
            <p className="mt-4 text-[12px] text-ink-invert/45">
              Every school day this term, one mark each.
            </p>
          </div>
        </div>

        {/* Mobile condensed message */}
        <div className="lg:hidden px-6 pb-6 pt-5">
          <h1 className="text-[26px] leading-[1.1] max-w-[16ch]">{headline}</h1>
          <div className="mt-4">
            <RegisterStrip marks={term.slice(0, 30)} height="sm" />
          </div>
        </div>

        <div className="hidden lg:block px-12 pb-10">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-invert/35">
            Duro stands by your child
          </span>
        </div>
      </aside>

      {/* Right / bottom: the form */}
      <main className="flex items-center justify-center px-6 py-10 lg:py-12">
        <div className="w-full max-w-[368px]">{children}</div>
      </main>
    </div>
  )
}
DURO_EOF

echo "  src/components/AppShell.tsx"
cat > src/components/AppShell.tsx <<'DURO_EOF'
import { NavLink, useNavigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../lib/auth'
import { DuroWordmark } from './DuroMark'

const NAV: Record<string, { to: string; label: string }[]> = {
  admin: [
    { to: '/admin', label: 'Today' },
    { to: '/admin/classes', label: 'Classes' },
    { to: '/admin/flagged', label: 'Flagged' },
    { to: '/admin/notices', label: 'Notices' },
  ],
  teacher: [
    { to: '/teacher', label: 'Register' },
    { to: '/teacher/lesson', label: 'Lesson' },
    { to: '/teacher/class', label: 'Class' },
  ],
  parent: [
    { to: '/parent', label: 'Today' },
    { to: '/parent/homework', label: 'Homework' },
    { to: '/parent/notices', label: 'Notices' },
  ],
}

export function AppShell({ children }: { children: ReactNode }) {
  const { profile, school, signOut } = useAuth()
  const navigate = useNavigate()
  const items = NAV[profile?.role ?? 'parent'] ?? []

  return (
    <div className="min-h-dvh flex flex-col bg-paper">
      <header className="sticky top-0 z-10 bg-ink text-ink-invert">
        <div className="mx-auto max-w-2xl px-4 h-14 flex items-center gap-3">
          <DuroWordmark size="sm" className="text-ink-invert shrink-0" />
          <span className="h-6 w-px bg-ink-invert/20 shrink-0" />
          <div className="min-w-0">
            <div className="font-display text-[15px] font-bold leading-tight truncate">
              {school?.name ?? 'Duro'}
            </div>
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-invert/55">
              {profile?.role ?? ''}
            </div>
          </div>
          <button
            onClick={async () => {
              await signOut()
              navigate('/login')
            }}
            className="ml-auto font-mono text-[11px] uppercase tracking-[0.12em]
                       text-ink-invert/60 hover:text-brass transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-2xl px-4 py-5 pb-24">{children}</main>

      <nav className="fixed bottom-0 inset-x-0 bg-surface border-t border-rule">
        <div className="mx-auto max-w-2xl flex">
          {items.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.to.split('/').length === 2}
              className={({ isActive }) =>
                `flex-1 h-16 flex flex-col items-center justify-center gap-1 text-[11px]
                 font-mono uppercase tracking-[0.1em] border-t-2 transition-colors
                 ${isActive
                   ? 'border-brass text-ink'
                   : 'border-transparent text-ink-faint hover:text-ink-soft'}`
              }
            >
              {it.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
DURO_EOF

echo "  src/components/RegisterStrip.tsx"
cat > src/components/RegisterStrip.tsx <<'DURO_EOF'
import type { AttendanceMark } from '../lib/types'

/* ---------------------------------------------------------------------------
   THE SIGNATURE ELEMENT.

   A child's term rendered as a line in the attendance register, one mark per
   school day, grouped into weeks. This is the thing parents have never been
   allowed to see, and it is the screenshot a proprietor remembers.

   Reused on: parent home, teacher class view, admin flagged list, PDF report.
--------------------------------------------------------------------------- */

const FILL: Record<string, string> = {
  present: 'bg-present',
  absent: 'bg-absent',
  late: 'bg-late',
  excused: 'bg-excused',
  unmarked: 'bg-unmarked',
}

export function RegisterStrip({
  marks,
  weekSize = 5,
  height = 'md',
}: {
  marks: AttendanceMark[]
  weekSize?: number
  height?: 'sm' | 'md'
}) {
  const h = height === 'sm' ? 'h-4' : 'h-6'

  const weeks: AttendanceMark[][] = []
  for (let i = 0; i < marks.length; i += weekSize) {
    weeks.push(marks.slice(i, i + weekSize))
  }

  if (marks.length === 0) {
    return (
      <div className={`${h} w-full rounded-sm border border-dashed border-rule-strong`} />
    )
  }

  return (
    <div className="flex items-end gap-2 overflow-x-auto pb-0.5" role="img"
         aria-label={`Attendance register, ${marks.length} school days`}>
      {weeks.map((week, wi) => (
        <div key={wi} className="flex gap-[3px] shrink-0">
          {week.map((m) => (
            <span
              key={m.date}
              title={`${m.date}, ${m.status ?? 'not marked'}`}
              className={`${h} w-[7px] rounded-[1.5px] ${FILL[m.status ?? 'unmarked']}`}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

export function RegisterLegend() {
  const items: [string, string][] = [
    ['present', 'Present'],
    ['late', 'Late'],
    ['absent', 'Absent'],
    ['excused', 'Excused'],
  ]
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5">
      {items.map(([k, label]) => (
        <span key={k} className="inline-flex items-center gap-1.5 text-[11px] text-ink-faint">
          <span className={`h-2.5 w-2.5 rounded-[1.5px] ${FILL[k]}`} />
          {label}
        </span>
      ))}
    </div>
  )
}

/** Big tabular percentage + the strip beneath it. The parent's answer, in one block. */
export function AttendanceSummary({
  pct,
  marks,
  caption,
}: {
  pct: number | null
  marks: AttendanceMark[]
  caption?: string
}) {
  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className="tnum text-[40px] leading-none font-semibold text-ink">
          {pct === null ? '-' : pct.toFixed(0)}
        </span>
        <span className="tnum text-[15px] text-ink-faint">%</span>
        {caption && <span className="ml-auto eyebrow">{caption}</span>}
      </div>
      <div className="mt-3">
        <RegisterStrip marks={marks} />
      </div>
    </div>
  )
}
DURO_EOF

echo "  src/components/ui.tsx"
cat > src/components/ui.tsx <<'DURO_EOF'
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'

/* ---------------------------------------------------------------------------
   Primitives. Flat, ruled, squared. No shadows anywhere in this file, depth
   in Duro comes from hairlines, not elevation.
--------------------------------------------------------------------------- */

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  full?: boolean
  loading?: boolean
}

export function Button({
  variant = 'primary',
  full,
  loading,
  children,
  className = '',
  disabled,
  ...rest
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 h-11 px-5 rounded-md text-[14px] font-semibold ' +
    'transition-colors disabled:opacity-45 disabled:cursor-not-allowed select-none'

  const variants: Record<string, string> = {
    primary: 'bg-brass text-ink hover:bg-brass-dark hover:text-ink-invert',
    secondary: 'bg-surface text-ink border border-rule-strong hover:bg-surface-alt',
    ghost: 'bg-transparent text-ink-soft hover:text-ink hover:bg-surface-alt',
    danger: 'bg-surface text-absent border border-absent/35 hover:bg-absent hover:text-ink-invert',
  }

  return (
    <button
      className={`${base} ${variants[variant]} ${full ? 'w-full' : ''} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? 'Working...' : children}
    </button>
  )
}

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  hint?: string
  error?: string
  mono?: boolean
}

export function Field({ label, hint, error, mono, className = '', ...rest }: FieldProps) {
  return (
    <label className="block">
      <span className="eyebrow block mb-1.5">{label}</span>
      <input
        className={`w-full h-11 px-3 bg-surface border rounded-md text-[15px] text-ink
          placeholder:text-ink-faint transition-colors
          ${error ? 'border-absent' : 'border-rule-strong focus:border-brass'}
          ${mono ? 'font-mono tracking-[0.12em] uppercase' : ''} ${className}`}
        {...rest}
      />
      {error ? (
        <span className="block mt-1.5 text-[12px] text-absent">{error}</span>
      ) : hint ? (
        <span className="block mt-1.5 text-[12px] text-ink-faint">{hint}</span>
      ) : null}
    </label>
  )
}

/** A ruled panel. The horizontal rule under the header is the whole aesthetic. */
export function Panel({
  title,
  action,
  children,
  className = '',
}: {
  title?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`bg-surface border border-rule rounded-lg ${className}`}>
      {title && (
        <header className="flex items-center justify-between px-4 h-11 border-b border-rule">
          <span className="eyebrow">{title}</span>
          {action}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  )
}

export function StatusPill({ status }: { status: 'present' | 'absent' | 'late' | 'excused' }) {
  const map = {
    present: 'text-present border-present/30 bg-present/8',
    absent: 'text-absent border-absent/30 bg-absent/8',
    late: 'text-late border-late/35 bg-late/10',
    excused: 'text-excused border-excused/30 bg-excused/8',
  }
  return (
    <span
      className={`inline-flex items-center h-6 px-2 rounded-sm border text-[11px] font-mono
        uppercase tracking-[0.1em] ${map[status]}`}
    >
      {status}
    </span>
  )
}

/** Empty states are an invitation to act, never an apology. */
export function Empty({ line, action }: { line: string; action?: ReactNode }) {
  return (
    <div className="py-10 text-center">
      <p className="text-[14px] text-ink-faint max-w-[32ch] mx-auto">{line}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="h-5 w-5 rounded-full border-2 border-rule-strong border-t-brass animate-spin" />
    </div>
  )
}

export function Alert({ children }: { children: ReactNode }) {
  return (
    <div className="border border-absent/35 bg-absent/6 text-absent text-[13px] px-3 py-2.5 rounded-md">
      {children}
    </div>
  )
}
DURO_EOF

echo "  src/index.css"
cat > src/index.css <<'DURO_EOF'
@import "tailwindcss";

/* ===========================================================================
   Duro design tokens
   Thesis: the app is the attendance register. Ruled surfaces, hairlines,
   tabular figures, marks in a row. Brass is the only accent, spend it.
   =========================================================================== */

@theme {
  /* Surfaces */
  --color-paper:       #F7F8F6;
  --color-surface:     #FFFFFF;
  --color-surface-alt: #F1F3EF;

  /* Ink */
  --color-ink:       #143A2B;
  --color-ink-soft:  #4A5F55;
  --color-ink-faint: #7C8B83;
  --color-ink-invert:#F7F8F6;

  /* Accent, used once per screen, never twice */
  --color-brass:      #C9922B;
  --color-brass-dark: #A87A1F;
  --color-brass-wash: #FAF3E4;

  /* Rules */
  --color-rule:        #DDE2DB;
  --color-rule-strong: #C3CCC2;

  /* Attendance semantics */
  --color-present:  #2F7D5C;
  --color-absent:   #C2413A;
  --color-late:     #D99114;
  --color-excused:  #6B7A80;
  --color-unmarked: #DDE2DB;

  /* Type */
  --font-display: "Bricolage Grotesque", ui-sans-serif, system-ui, sans-serif;
  --font-sans:    "Public Sans", ui-sans-serif, system-ui, sans-serif;
  --font-mono:    "IBM Plex Mono", ui-monospace, monospace;

  /* Geometry: flat and squared. No pillowy cards. */
  --radius-sm: 3px;
  --radius-md: 4px;
  --radius-lg: 6px;
}

@layer base {
  html {
    -webkit-text-size-adjust: 100%;
    -webkit-tap-highlight-color: transparent;
  }

  body {
    background-color: var(--color-paper);
    color: var(--color-ink);
    font-family: var(--font-sans);
    font-size: 15px;
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
    overscroll-behavior-y: none;
  }

  h1, h2, h3 {
    font-family: var(--font-display);
    font-weight: 700;
    letter-spacing: -0.02em;
    line-height: 1.15;
  }

  /* Every number in this app is a figure in a register. Align them. */
  .tnum { font-family: var(--font-mono); font-variant-numeric: tabular-nums; }

  /* The eyebrow: small mono caps. Structural, used to label a region. */
  .eyebrow {
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: 500;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--color-ink-faint);
  }

  :focus-visible {
    outline: 2px solid var(--color-brass);
    outline-offset: 2px;
  }

  button { cursor: pointer; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
DURO_EOF

echo "  src/routes/Login.tsx"
cat > src/routes/Login.tsx <<'DURO_EOF'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { AuthLayout } from '../components/AuthLayout'
import { Alert, Button, Field } from '../components/ui'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit() {
    setError(null)
    setBusy(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (error) return setError(error.message)
    navigate('/')
  }

  return (
    <AuthLayout
      headline={
        <>
          What happened
          <br />
          at school today.
        </>
      }
      sub="Attendance, lessons and homework. The day your child actually had, not a summary three months late."
    >
      <span className="eyebrow">Sign in</span>
      <h2 className="text-[24px] mt-1.5 mb-6">Welcome back.</h2>

      <form
        className="space-y-3.5"
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        {error && <Alert>{error}</Alert>}
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Field
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <div className="pt-1">
          <Button type="submit" full loading={busy}>
            Sign in
          </Button>
        </div>
      </form>

      <p className="mt-6 text-[13px] text-ink-faint">
        New here?{' '}
        <Link to="/signup" className="text-ink underline underline-offset-4 decoration-brass">
          Create an account
        </Link>
      </p>
    </AuthLayout>
  )
}
DURO_EOF

echo "  src/routes/Signup.tsx"
cat > src/routes/Signup.tsx <<'DURO_EOF'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { AuthLayout } from '../components/AuthLayout'
import { Alert, Button, Field } from '../components/ui'

export default function Signup() {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit() {
    setError(null)
    setBusy(true)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })
    setBusy(false)
    if (error) return setError(error.message)
    navigate('/')
  }

  return (
    <AuthLayout
      headline={
        <>
          Never wonder
          <br />
          again.
        </>
      }
      sub="Parents link to a child with the code the school provides. Teachers are added by their school."
    >
      <span className="eyebrow">Create account</span>
      <h2 className="text-[24px] mt-1.5 mb-6">Start with your name.</h2>

      <form
        className="space-y-3.5"
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        {error && <Alert>{error}</Alert>}
        <Field
          label="Full name"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Field
          label="Password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          hint="At least 8 characters."
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <div className="pt-1">
          <Button type="submit" full loading={busy}>
            Create account
          </Button>
        </div>
      </form>

      <p className="mt-6 text-[13px] text-ink-faint">
        Already have one?{' '}
        <Link to="/login" className="text-ink underline underline-offset-4 decoration-brass">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  )
}
DURO_EOF

echo "  src/routes/Onboarding.tsx"
cat > src/routes/Onboarding.tsx <<'DURO_EOF'
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { AuthLayout } from '../components/AuthLayout'
import { Alert, Button, Field } from '../components/ui'

/**
 * Reached when a signed in user has no school yet. Two doors: a parent
 * redeems a claim code, a proprietor creates the school. Teachers never
 * land here, the invite trigger attaches them at signup.
 */
export default function Onboarding() {
  const { refresh } = useAuth()
  const [tab, setTab] = useState<'parent' | 'school'>('parent')
  const [code, setCode] = useState('')
  const [schoolName, setSchoolName] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function redeem() {
    setError(null)
    setBusy(true)
    const { error } = await supabase.rpc('redeem_claim_code', {
      p_code: code.trim().toUpperCase(),
    })
    setBusy(false)
    if (error) return setError(error.message)
    await refresh()
  }

  async function createSchool() {
    setError(null)
    setBusy(true)
    const { error } = await supabase.rpc('create_school_and_admin', {
      p_school_name: schoolName.trim(),
      p_full_name: fullName.trim(),
    })
    setBusy(false)
    if (error) return setError(error.message)
    await refresh()
  }

  return (
    <AuthLayout
      headline={
        <>
          One code.
          <br />
          Then you see it all.
        </>
      }
      sub="Your school gives you an eight character code for each child. Enter it once and their day opens up."
    >
      <div className="flex border border-rule-strong rounded-md overflow-hidden mb-6">
        {(['parent', 'school'] as const).map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t)
              setError(null)
            }}
            className={`flex-1 h-10 text-[11px] font-mono uppercase tracking-[0.12em] transition-colors
              ${tab === t ? 'bg-ink text-ink-invert' : 'bg-surface text-ink-faint hover:text-ink'}`}
          >
            {t === 'parent' ? "I'm a parent" : 'I run a school'}
          </button>
        ))}
      </div>

      {error && <div className="mb-4"><Alert>{error}</Alert></div>}

      {tab === 'parent' ? (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            void redeem()
          }}
        >
          <div>
            <span className="eyebrow">Link your child</span>
            <h2 className="text-[22px] mt-1.5">Enter the code your school gave you.</h2>
          </div>
          <Field
            label="Claim code"
            mono
            required
            placeholder="ABCD1234"
            maxLength={8}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            hint="Eight characters, from your child's teacher or the school office."
          />
          <Button type="submit" full loading={busy}>
            Link my child
          </Button>
        </form>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            void createSchool()
          }}
        >
          <div>
            <span className="eyebrow">Set up your school</span>
            <h2 className="text-[22px] mt-1.5">Name the school. You'll be its admin.</h2>
          </div>
          <Field
            label="School name"
            required
            placeholder="Bright Future Academy"
            value={schoolName}
            onChange={(e) => setSchoolName(e.target.value)}
          />
          <Field
            label="Your name"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
          <Button type="submit" full loading={busy}>
            Create school
          </Button>
        </form>
      )}
    </AuthLayout>
  )
}
DURO_EOF

echo "  src/routes/AdminHome.tsx"
cat > src/routes/AdminHome.tsx <<'DURO_EOF'
import { AppShell } from '../components/AppShell'
import { Empty, Panel } from '../components/ui'
import { useAuth } from '../lib/auth'

export default function AdminHome() {
  const { school } = useAuth()

  return (
    <AppShell>
      <div className="mb-5">
        <span className="eyebrow">Today</span>
        <h1 className="text-[26px] mt-1">{school?.name}</h1>
      </div>

      <div className="space-y-4">
        <Panel title="Attendance taken">
          <Empty line="No classes yet. Add your first class to start taking the register." />
        </Panel>

        <Panel title="Lessons posted today">
          <Empty line="Once teachers start posting, you'll see who has and who hasn't, at a glance." />
        </Panel>

        <Panel title="Needs attention">
          <Empty line="Students with low attendance or a run of absences will surface here." />
        </Panel>
      </div>
    </AppShell>
  )
}
DURO_EOF

echo "  src/routes/Preview.tsx"
cat > src/routes/Preview.tsx <<'DURO_EOF'
import { AttendanceSummary, RegisterLegend, RegisterStrip } from '../components/RegisterStrip'
import { DuroMark, DuroWordmark } from '../components/DuroMark'
import { Alert, Button, Empty, Field, Panel, StatusPill } from '../components/ui'
import type { AttendanceMark, AttendanceStatus } from '../lib/types'

/**
 * /preview, the design system on one page. Not linked from the app.
 * Delete before the pilot, or keep it behind an admin flag.
 */

function fakeTerm(seed: number, days = 55): AttendanceMark[] {
  const out: AttendanceMark[] = []
  let n = seed
  for (let i = 0; i < days; i++) {
    n = (n * 1103515245 + 12345) % 2147483648
    const r = (n / 2147483648) * 100
    const status: AttendanceStatus | null =
      i > days - 4 ? null : r > 92 ? 'absent' : r > 84 ? 'late' : r > 81 ? 'excused' : 'present'
    const d = new Date(2026, 0, 12 + Math.floor(i / 5) * 7 + (i % 5))
    out.push({ date: d.toISOString().slice(0, 10), status })
  }
  return out
}

const SWATCHES: [string, string][] = [
  ['paper', '#F7F8F6'],
  ['ink', '#143A2B'],
  ['brass', '#C9922B'],
  ['rule', '#DDE2DB'],
  ['present', '#2F7D5C'],
  ['absent', '#C2413A'],
  ['late', '#D99114'],
]

export default function Preview() {
  const ada = fakeTerm(7)
  const bola = fakeTerm(23)

  return (
    <div className="min-h-dvh bg-paper">
      <header className="bg-ink text-ink-invert">
        <div className="mx-auto max-w-2xl px-4 py-8">
          <DuroWordmark size="lg" className="text-ink-invert mb-5" />
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-invert/55">
            Design system
          </span>
          <h1 className="text-[32px] mt-1">Duro</h1>
          <p className="mt-2 text-[14px] text-ink-invert/70 max-w-[42ch]">
            The app is the attendance register. Ruled surfaces, hairlines, tabular figures,
            marks in a row.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-6 space-y-4">
        <Panel title="Signature, the register strip">
          <div className="space-y-6">
            <div>
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-[15px] font-semibold">Ada Okafor</span>
                <span className="eyebrow">JSS 1A</span>
              </div>
              <AttendanceSummary pct={91} marks={ada} caption="First term" />
            </div>
            <div>
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-[15px] font-semibold">Bola Adeyemi</span>
                <span className="eyebrow">JSS 1A</span>
              </div>
              <AttendanceSummary pct={68} marks={bola} caption="First term" />
            </div>
            <div className="pt-4 border-t border-rule">
              <RegisterLegend />
            </div>
          </div>
        </Panel>

        <Panel title="Mark">
          <div className="space-y-5">
            <div className="flex items-end gap-8 flex-wrap">
              <DuroMark className="h-10 w-[53px] text-ink" />
              <DuroWordmark size="lg" className="text-ink" />
              <div className="bg-ink rounded-lg px-5 py-4">
                <DuroWordmark size="md" className="text-ink-invert" />
              </div>
            </div>
            <div className="flex items-end gap-6">
              <DuroMark className="h-4 w-[21px] text-ink" />
              <DuroMark className="h-6 w-8 text-ink" />
              <DuroMark className="h-8 w-[43px] text-ink" />
            </div>
            <p className="text-[13px] text-ink-soft max-w-[52ch]">
              A tally of five. Four uprights and a strike, which is one complete week in the
              register and exactly how the strip above groups its marks. Equal heights, so it
              never reads as a falling chart.
            </p>
          </div>
        </Panel>

        <Panel title="Colour">
          <div className="grid grid-cols-4 gap-3">
            {SWATCHES.map(([name, hex]) => (
              <div key={name}>
                <div
                  className="h-12 rounded-md border border-rule"
                  style={{ backgroundColor: hex }}
                />
                <div className="mt-1.5 text-[11px] font-semibold">{name}</div>
                <div className="tnum text-[10px] text-ink-faint">{hex}</div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Type">
          <div className="space-y-3">
            <div>
              <span className="eyebrow">Display · Bricolage Grotesque</span>
              <h2 className="text-[28px] mt-1">Duro stands by your child</h2>
            </div>
            <div>
              <span className="eyebrow">Body · Public Sans</span>
              <p className="text-[15px] text-ink-soft mt-1">
                Parents pay fees and hear nothing until report card day. Duro closes that
                silence with the day your child actually had.
              </p>
            </div>
            <div>
              <span className="eyebrow">Figures · IBM Plex Mono</span>
              <p className="tnum text-[20px] mt-1">94.5% · 182 days · KJ7M2QP4</p>
            </div>
          </div>
        </Panel>

        <Panel title="Controls">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button>Mark present</Button>
              <Button variant="secondary">Cancel</Button>
              <Button variant="ghost">Skip</Button>
              <Button variant="danger">Remove</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusPill status="present" />
              <StatusPill status="late" />
              <StatusPill status="absent" />
              <StatusPill status="excused" />
            </div>
            <Field label="Claim code" mono placeholder="ABCD1234" />
            <Alert>That code has already been used.</Alert>
            <div className="border border-rule rounded-md">
              <Empty
                line="No homework set today."
                action={<Button variant="secondary">View this week</Button>}
              />
            </div>
          </div>
        </Panel>

        <div className="py-6 text-center">
          <span className="eyebrow">Marks in a row · Duro</span>
        </div>
      </div>
    </div>
  )
}
DURO_EOF

echo "  public/duro-mark.svg"
cat > public/duro-mark.svg <<'DURO_EOF'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="7" fill="#143A2B"/>
  <g fill="#F7F8F6">
    <rect x="5" y="8" width="2.8" height="16" rx="1.1"/>
    <rect x="10.6" y="8" width="2.8" height="16" rx="1.1"/>
    <rect x="16.2" y="8" width="2.8" height="16" rx="1.1"/>
    <rect x="21.8" y="8" width="2.8" height="16" rx="1.1"/>
  </g>
  <path d="M4 22.5 L28 9.5" stroke="#C9922B" stroke-width="2.9" stroke-linecap="round"/>
</svg>
DURO_EOF

echo ""
echo "Done. The dev server will hot reload."
echo "Open http://localhost:5174/preview"
