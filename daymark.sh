#!/usr/bin/env bash
# =============================================================================
# Duro -> Daymark
# Renames the product, installs the new identity, responsive shell,
# PWA icons and manifest. Run from the project root:  bash daymark.sh
# =============================================================================
set -e
if [ ! -f package.json ]; then
  echo "ERROR: run this from inside your project root" >&2
  exit 1
fi
mkdir -p src/lib src/components src/routes public
echo "Removing old identity files..."
rm -f src/components/DuroMark.tsx public/duro-mark.svg
echo "Writing files..."
echo "  src/components/Logo.tsx"
cat > src/components/Logo.tsx <<'DAYMARK_EOF'
/* ---------------------------------------------------------------------------
   Daymark identity.

   A daymark is an unlit marker you steer by in daylight. Read the other way,
   it is one mark per day, which is exactly what the register strip draws.

   The mark is a tally of five: four uprights and a strike. It is the counting
   notation of every classroom register, it cannot be misread as a falling
   chart, and it is literally one week of the product.
--------------------------------------------------------------------------- */

export function Mark({
  className = '',
  accent = 'text-brass',
}: {
  className?: string
  accent?: string
}) {
  return (
    <svg viewBox="0 0 34 26" fill="none" className={className} aria-hidden="true">
      <g fill="currentColor">
        <rect x="2.6" y="3.4" width="3.4" height="19.2" rx="1.7" />
        <rect x="9.3" y="3.4" width="3.4" height="19.2" rx="1.7" />
        <rect x="16" y="3.4" width="3.4" height="19.2" rx="1.7" />
        <rect x="22.7" y="3.4" width="3.4" height="19.2" rx="1.7" />
      </g>
      <path
        d="M1.9 21.1 L31.4 4.9"
        className={accent}
        stroke="currentColor"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
    </svg>
  )
}

const SIZES = {
  xs: { mark: 'h-3.5 w-[18px]', text: 'text-[15px]', gap: 'gap-2' },
  sm: { mark: 'h-4 w-[21px]', text: 'text-[17px]', gap: 'gap-2' },
  md: { mark: 'h-5 w-[26px]', text: 'text-[21px]', gap: 'gap-2.5' },
  lg: { mark: 'h-7 w-[37px]', text: 'text-[29px]', gap: 'gap-3' },
  xl: { mark: 'h-10 w-[52px]', text: 'text-[41px]', gap: 'gap-4' },
} as const

export function Wordmark({
  className = '',
  size = 'md',
  accent = 'text-brass',
}: {
  className?: string
  size?: keyof typeof SIZES
  accent?: string
}) {
  const s = SIZES[size]
  return (
    <span className={`inline-flex items-center ${s.gap} ${className}`}>
      <Mark className={s.mark} accent={accent} />
      <span
        className={`font-display font-bold tracking-[-0.035em] ${s.text}`}
        style={{ lineHeight: 1 }}
      >
        Daymark
      </span>
    </span>
  )
}

/** Stacked lockup with the strapline. Auth screens, print, pitch deck. */
export function Lockup({
  className = '',
  accent = 'text-brass',
}: {
  className?: string
  accent?: string
}) {
  return (
    <span className={`inline-flex flex-col gap-3 ${className}`}>
      <Wordmark size="lg" accent={accent} />
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] opacity-55">
        Every school day, marked
      </span>
    </span>
  )
}
DAYMARK_EOF

echo "  src/components/Icons.tsx"
cat > src/components/Icons.tsx <<'DAYMARK_EOF'
/** Hairline icons at 1.6 stroke to sit with the ruled aesthetic. */

type P = { className?: string }
const base = 'h-[18px] w-[18px]'

function S({ children, className = '' }: P & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${base} ${className}`}
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export const IconToday = (p: P) => (
  <S {...p}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </S>
)

export const IconRegister = (p: P) => (
  <S {...p}>
    <path d="M6 4v16M11 4v16M16 4v16" />
    <path d="M4 18 20 7" />
  </S>
)

export const IconLesson = (p: P) => (
  <S {...p}>
    <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v15H6.5A2.5 2.5 0 0 0 4 20.5z" />
    <path d="M8 8h7M8 12h5" />
  </S>
)

export const IconClass = (p: P) => (
  <S {...p}>
    <circle cx="9" cy="8" r="3" />
    <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
    <path d="M16 6.5a3 3 0 0 1 0 6M17.5 20a5.6 5.6 0 0 0-2-4.3" />
  </S>
)

export const IconFlag = (p: P) => (
  <S {...p}>
    <path d="M5 21V4M5 4h11l-2 3.5L16 11H5" />
  </S>
)

export const IconNotice = (p: P) => (
  <S {...p}>
    <path d="M4 9v6h3l6 4V5L7 9z" />
    <path d="M17 9.5a4 4 0 0 1 0 5" />
  </S>
)

export const IconHomework = (p: P) => (
  <S {...p}>
    <rect x="4" y="3" width="16" height="18" rx="2" />
    <path d="M8 8h8M8 12h8M8 16h4" />
  </S>
)

export const IconSignOut = (p: P) => (
  <S {...p}>
    <path d="M14 20H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h8" />
    <path d="M17 15l3-3-3-3M20 12H10" />
  </S>
)
DAYMARK_EOF

echo "  src/components/AppShell.tsx"
cat > src/components/AppShell.tsx <<'DAYMARK_EOF'
import { NavLink, useNavigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../lib/auth'
import { Wordmark } from './Logo'
import {
  IconClass,
  IconFlag,
  IconHomework,
  IconLesson,
  IconNotice,
  IconRegister,
  IconSignOut,
  IconToday,
} from './Icons'

/* ---------------------------------------------------------------------------
   Two shells in one component.

   Phone: ink top bar, thumb-zone bottom nav, single column.
   Desktop (lg+): fixed ink sidebar, wider content column, no bottom nav.

   Same routes, same components. Only the chrome changes.
--------------------------------------------------------------------------- */

type Item = { to: string; label: string; Icon: (p: { className?: string }) => JSX.Element }

const NAV: Record<string, Item[]> = {
  admin: [
    { to: '/admin', label: 'Today', Icon: IconToday },
    { to: '/admin/classes', label: 'Classes', Icon: IconClass },
    { to: '/admin/flagged', label: 'Flagged', Icon: IconFlag },
    { to: '/admin/notices', label: 'Notices', Icon: IconNotice },
  ],
  teacher: [
    { to: '/teacher', label: 'Register', Icon: IconRegister },
    { to: '/teacher/lesson', label: 'Lesson', Icon: IconLesson },
    { to: '/teacher/class', label: 'Class', Icon: IconClass },
  ],
  parent: [
    { to: '/parent', label: 'Today', Icon: IconToday },
    { to: '/parent/homework', label: 'Homework', Icon: IconHomework },
    { to: '/parent/notices', label: 'Notices', Icon: IconNotice },
  ],
}

export function AppShell({ children }: { children: ReactNode }) {
  const { profile, school, signOut } = useAuth()
  const navigate = useNavigate()
  const items = NAV[profile?.role ?? 'parent'] ?? []

  async function out() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-dvh bg-paper">
      {/* ---------- Desktop sidebar ---------- */}
      <aside
        className="hidden lg:flex fixed inset-y-0 left-0 w-[248px] bg-ink text-ink-invert
                   flex-col z-20"
      >
        <div className="px-6 py-6">
          <Wordmark size="sm" className="text-ink-invert" />
        </div>

        <div className="px-6 pb-5">
          <div className="text-[13px] font-semibold truncate">{school?.name ?? ''}</div>
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-invert/45 mt-0.5">
            {profile?.role}
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-0.5">
          {items.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to.split('/').length === 2}
              className={({ isActive }) =>
                `flex items-center gap-3 h-10 px-3 rounded-md text-[14px] transition-colors
                 ${isActive
                   ? 'bg-ink-invert/10 text-ink-invert font-semibold'
                   : 'text-ink-invert/60 hover:text-ink-invert hover:bg-ink-invert/6'}`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={isActive ? 'text-brass' : ''} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 pb-5">
          <button
            onClick={out}
            className="flex items-center gap-3 h-10 w-full px-3 rounded-md text-[14px]
                       text-ink-invert/50 hover:text-ink-invert hover:bg-ink-invert/6 transition-colors"
          >
            <IconSignOut />
            Sign out
          </button>
        </div>
      </aside>

      {/* ---------- Phone top bar ---------- */}
      <header className="lg:hidden sticky top-0 z-10 bg-ink text-ink-invert">
        <div className="px-4 h-14 flex items-center gap-3">
          <Wordmark size="xs" className="text-ink-invert shrink-0" />
          <span className="h-5 w-px bg-ink-invert/20 shrink-0" />
          <div className="min-w-0">
            <div className="text-[13px] font-semibold leading-tight truncate">
              {school?.name ?? ''}
            </div>
            <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-invert/50">
              {profile?.role}
            </div>
          </div>
          <button
            onClick={out}
            className="ml-auto p-2 -mr-2 text-ink-invert/55 hover:text-brass transition-colors"
            aria-label="Sign out"
          >
            <IconSignOut />
          </button>
        </div>
      </header>

      {/* ---------- Content ---------- */}
      <main className="lg:pl-[248px]">
        <div className="mx-auto w-full max-w-3xl px-4 lg:px-10 py-5 lg:py-10 pb-24 lg:pb-12">
          {children}
        </div>
      </main>

      {/* ---------- Phone bottom nav ---------- */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-surface border-t border-rule z-10">
        <div className="flex pb-[env(safe-area-inset-bottom)]">
          {items.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to.split('/').length === 2}
              className={({ isActive }) =>
                `flex-1 h-16 flex flex-col items-center justify-center gap-1 text-[10px]
                 font-mono uppercase tracking-[0.1em] border-t-2 transition-colors
                 ${isActive
                   ? 'border-brass text-ink'
                   : 'border-transparent text-ink-faint hover:text-ink-soft'}`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={isActive ? 'text-brass' : ''} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
DAYMARK_EOF

echo "  src/components/AuthLayout.tsx"
cat > src/components/AuthLayout.tsx <<'DAYMARK_EOF'
import type { ReactNode } from 'react'
import { Wordmark } from './Logo'
import { RegisterStrip } from './RegisterStrip'
import type { AttendanceMark, AttendanceStatus } from '../lib/types'

/* ---------------------------------------------------------------------------
   Split auth layout.

   Desktop: ink panel proves the product before anyone types a password.
   Phone: the panel condenses to a band, the form takes the screen.
--------------------------------------------------------------------------- */

function demoTerm(seed: number, days = 50): AttendanceMark[] {
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
      <aside className="bg-ink text-ink-invert flex flex-col">
        <div className="px-6 pt-6 lg:px-12 lg:pt-12">
          <Wordmark size="md" className="text-ink-invert" />
        </div>

        {/* Desktop panel */}
        <div className="hidden lg:flex flex-1 flex-col justify-center px-12 py-10">
          <h1 className="text-[44px] leading-[1.05] max-w-[13ch]">{headline}</h1>
          <p className="mt-5 text-[15px] leading-relaxed text-ink-invert/65 max-w-[38ch]">{sub}</p>

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
            <div className="mt-4">
              <RegisterStrip marks={term} height="sm" />
            </div>
            <p className="mt-4 text-[12px] text-ink-invert/45">
              Every school day this term, one mark each.
            </p>
          </div>
        </div>

        {/* Phone band */}
        <div className="lg:hidden px-6 pb-6 pt-5">
          <h1 className="text-[26px] leading-[1.1] max-w-[16ch]">{headline}</h1>
          <div className="mt-4">
            <RegisterStrip marks={term.slice(0, 30)} height="sm" />
          </div>
        </div>

        <div className="hidden lg:block px-12 pb-10">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-invert/35">
            Every school day, marked
          </span>
        </div>
      </aside>

      <main className="flex items-center justify-center px-6 py-10 lg:py-12">
        <div className="w-full max-w-[368px]">{children}</div>
      </main>
    </div>
  )
}
DAYMARK_EOF

echo "  src/components/RegisterStrip.tsx"
cat > src/components/RegisterStrip.tsx <<'DAYMARK_EOF'
import type { AttendanceMark } from '../lib/types'

/* ---------------------------------------------------------------------------
   THE SIGNATURE ELEMENT.

   A child's term rendered as a line in the attendance register: one mark per
   school day, grouped into weeks. Weeks wrap rather than scroll, so a whole
   term reads as a block of register lines on any screen width.

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
  const w = height === 'sm' ? 'w-[6px]' : 'w-[7px]'

  if (marks.length === 0) {
    return <div className={`${h} w-full rounded-sm border border-dashed border-rule-strong`} />
  }

  const weeks: AttendanceMark[][] = []
  for (let i = 0; i < marks.length; i += weekSize) {
    weeks.push(marks.slice(i, i + weekSize))
  }

  return (
    <div
      className="flex flex-wrap items-end gap-x-2 gap-y-1.5"
      role="img"
      aria-label={`Attendance register, ${marks.length} school days`}
    >
      {weeks.map((week, wi) => (
        <div key={wi} className="flex gap-[3px] shrink-0">
          {week.map((m) => (
            <span
              key={m.date}
              title={`${m.date}: ${m.status ?? 'not marked'}`}
              className={`${h} ${w} rounded-[1.5px] ${FILL[m.status ?? 'unmarked']}`}
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

/** Big tabular percentage above the strip. The parent's answer, in one block. */
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
          {pct === null ? '\u2014' : pct.toFixed(0)}
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
DAYMARK_EOF

echo "  src/components/ui.tsx"
cat > src/components/ui.tsx <<'DAYMARK_EOF'
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'

/* ---------------------------------------------------------------------------
   Primitives. Flat, ruled, squared. No shadows anywhere in this file, depth
   in Daymark comes from hairlines, not elevation.
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
DAYMARK_EOF

echo "  src/index.css"
cat > src/index.css <<'DAYMARK_EOF'
@import "tailwindcss";

/* ===========================================================================
   Daymark design tokens
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
DAYMARK_EOF

echo "  src/routes/Login.tsx"
cat > src/routes/Login.tsx <<'DAYMARK_EOF'
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
DAYMARK_EOF

echo "  src/routes/Signup.tsx"
cat > src/routes/Signup.tsx <<'DAYMARK_EOF'
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
DAYMARK_EOF

echo "  src/routes/Onboarding.tsx"
cat > src/routes/Onboarding.tsx <<'DAYMARK_EOF'
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
DAYMARK_EOF

echo "  src/routes/AdminHome.tsx"
cat > src/routes/AdminHome.tsx <<'DAYMARK_EOF'
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
DAYMARK_EOF

echo "  src/routes/TeacherHome.tsx"
cat > src/routes/TeacherHome.tsx <<'DAYMARK_EOF'
import { AppShell } from '../components/AppShell'
import { Empty, Panel } from '../components/ui'

export default function TeacherHome() {
  const today = new Date().toLocaleDateString('en-NG', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <AppShell>
      <div className="mb-5">
        <span className="eyebrow">Register</span>
        <h1 className="text-[26px] mt-1">{today}</h1>
      </div>

      <Panel title="Your classes">
        <Empty line="No classes assigned to you yet. Ask your school admin to add you to a class." />
      </Panel>
    </AppShell>
  )
}
DAYMARK_EOF

echo "  src/routes/ParentHome.tsx"
cat > src/routes/ParentHome.tsx <<'DAYMARK_EOF'
import { AppShell } from '../components/AppShell'
import { Empty, Panel } from '../components/ui'
import { RegisterLegend } from '../components/RegisterStrip'

export default function ParentHome() {
  const today = new Date().toLocaleDateString('en-NG', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <AppShell>
      <div className="mb-5">
        <span className="eyebrow">{today}</span>
        <h1 className="text-[26px] mt-1">Your children</h1>
      </div>

      <Panel title="Attendance this term">
        <Empty line="Nothing recorded yet. Marks appear here the first day the register is taken." />
        <div className="mt-4 pt-4 border-t border-rule">
          <RegisterLegend />
        </div>
      </Panel>

      <div className="mt-4">
        <Panel title="Today's lessons">
          <Empty line="When teachers post the day's lesson and homework, it lands here." />
        </Panel>
      </div>
    </AppShell>
  )
}
DAYMARK_EOF

echo "  src/routes/Preview.tsx"
cat > src/routes/Preview.tsx <<'DAYMARK_EOF'
import { AttendanceSummary, RegisterLegend, RegisterStrip } from '../components/RegisterStrip'
import { Lockup, Mark, Wordmark } from '../components/Logo'
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
          <Wordmark size="lg" className="text-ink-invert mb-5" />
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-invert/55">
            Design system
          </span>
          <h1 className="text-[32px] mt-1">Daymark</h1>
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
              <Mark className="h-12 w-[62px] text-ink" />
              <Wordmark size="lg" className="text-ink" />
            </div>
            <div className="flex flex-wrap gap-4">
              <div className="bg-ink rounded-lg px-6 py-5">
                <Lockup className="text-ink-invert" />
              </div>
              <div className="bg-brass rounded-lg px-6 py-5 flex items-center">
                <Wordmark size="md" className="text-ink" accent="text-ink" />
              </div>
            </div>
            <div className="flex items-end gap-6">
              <Mark className="h-3.5 w-[18px] text-ink" />
              <Mark className="h-5 w-[26px] text-ink" />
              <Mark className="h-7 w-[37px] text-ink" />
              <Mark className="h-9 w-[47px] text-ink" accent="text-ink" />
            </div>
            <p className="text-[13px] text-ink-soft max-w-[52ch]">
              A tally of five: four uprights and a strike. One complete week in the register,
              and exactly how the strip above groups its marks. Equal heights, so it never
              reads as a falling chart. The last swatch shows the single colour version for
              stamps, embroidery and fax-grade photocopies.
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
              <h2 className="text-[28px] mt-1">Daymark stands by your child</h2>
            </div>
            <div>
              <span className="eyebrow">Body · Public Sans</span>
              <p className="text-[15px] text-ink-soft mt-1">
                Parents pay fees and hear nothing until report card day. Daymark closes that
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
          <span className="eyebrow">Marks in a row · Daymark</span>
        </div>
      </div>
    </div>
  )
}
DAYMARK_EOF

echo "  index.html"
cat > index.html <<'DAYMARK_EOF'
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#143A2B" />
    <meta
      name="description"
      content="Daymark shows parents the school day as it happens: attendance, what was taught, and homework. Every school day, marked."
    />

    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="apple-touch-icon" href="/icon-192.png" />
    <link rel="manifest" href="/manifest.webmanifest" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="Daymark" />

    <meta property="og:title" content="Daymark" />
    <meta property="og:description" content="Every school day, marked." />
    <meta property="og:type" content="website" />

    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,400..800&family=IBM+Plex+Mono:wght@400;500;600&family=Public+Sans:wght@400;500;600;700&display=swap"
      rel="stylesheet"
    />

    <title>Daymark</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
DAYMARK_EOF

echo "  README.md"
cat > README.md <<'DAYMARK_EOF'
# Daymark

**Every school day, marked.**

Daymark is a parent-transparency layer for Nigerian schools. Parents pay fees and then
hear nothing until report card day. Daymark closes that silence: daily attendance, what
was taught, and what homework is due, visible the same day it happens.

It is not a school ERP. It sits alongside whatever the school already uses for fees and
admin, and it answers the one question every parent actually asks.

---

## Model

| Role | Relationship |
|---|---|
| School (proprietor / admin) | Buyer. Pays per student, per term. |
| Parent | Daily user. Free, included in the school's subscription. |
| Teacher | Daily operator. Free, included. |

Pricing anchor: N300 to N500 per student per term.

## Stack

- **Supabase** (Postgres) with row level security scoped by `school_id`
- **React 19 + Vite 8 + TypeScript**, Tailwind 4 (CSS-first tokens, no config file)
- **Vercel**, shipped as an installable PWA (no app store)

## Running locally

```bash
npm install
cp .env.example .env.local     # fill in your Supabase URL and anon key
npm run dev
```

| Route | Notes |
|---|---|
| `/preview` | Design system on one page. Works without Supabase. |
| `/login` | Split auth screen |
| `/admin` `/teacher` `/parent` | Role homes, guarded by RLS and route guards |

## Database

Migrations live in `supabase/migrations`. Push them with:

```bash
npx supabase db push
```

**Before trusting RLS, test it.** Create two schools and two parents, then confirm a
parent sees only their own child, and nothing at all from the other school. Same-school
leakage between families is the failure that matters most.

## Design

The app is the attendance register. Ruled surfaces, hairlines instead of shadows,
tabular figures, marks in a row.

- **Signature element:** `RegisterStrip`, a child's term as one mark per school day
- **Mark:** a tally of five, four uprights and a strike
- **Accent:** brass, once per screen, on the primary action only
- **Type:** Bricolage Grotesque (display), Public Sans (body), IBM Plex Mono (figures)

Tokens live in `src/index.css` under `@theme`. There is no `tailwind.config.js`.

## Structure

```
src/
  components/   Logo, AppShell, AuthLayout, RegisterStrip, Icons, ui primitives
  lib/          supabase client, auth provider, shared types
  routes/       Login, Signup, Onboarding, role homes, Preview
supabase/
  migrations/   schema, RLS policies, RPCs
```
DAYMARK_EOF

echo "  .env.example"
cat > .env.example <<'DAYMARK_EOF'
VITE_SUPABASE_URL=https://your-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
DAYMARK_EOF

echo "  public/favicon.svg"
cat > public/favicon.svg <<'DAYMARK_EOF'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="7" fill="#143A2B"/>
  <g fill="#F7F8F6">
    <rect x="5.2" y="8" width="2.9" height="16" rx="1.45"/>
    <rect x="10.7" y="8" width="2.9" height="16" rx="1.45"/>
    <rect x="16.2" y="8" width="2.9" height="16" rx="1.45"/>
    <rect x="21.7" y="8" width="2.9" height="16" rx="1.45"/>
  </g>
  <path d="M4.4 22.6 L27.8 9.4" stroke="#C9922B" stroke-width="3" stroke-linecap="round"/>
</svg>
DAYMARK_EOF

echo "  public/manifest.webmanifest"
cat > public/manifest.webmanifest <<'DAYMARK_EOF'
{
  "name": "Daymark",
  "short_name": "Daymark",
  "description": "Every school day, marked.",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#F7F8F6",
  "theme_color": "#143A2B",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
DAYMARK_EOF

echo "  public/icon-192.png"
base64 -d > public/icon-192.png <<'B64_EOF'
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
SUVORK5CYII=
B64_EOF

echo "  public/icon-512.png"
base64 -d > public/icon-512.png <<'B64_EOF'
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
YII=
B64_EOF

echo "  public/icon-maskable-512.png"
base64 -d > public/icon-maskable-512.png <<'B64_EOF'
iVBORw0KGgoAAAANSUhEUgAAAgAAAAIACAYAAAD0eNT6AABEEElEQVR4nO3debxcdX3/8df3nDPr
nXvn3psEwk0CkgAhLELCpiyCivuCC62lYn+2YFWWWtxwQdsqWKRapSg/sfpzq0rVVtRWsUVFkEWI
CQgYlgQlO1nuOnfWc87398d3JgkYAiS5uTNz3s/HA8GZJHfm5N75vL/b55iZJx9pERERkUTxpvsF
iIiIyL6nACAiIpJACgAiIiIJpAAgIiKSQAoAIiIiCaQAICIikkAKACIiIgmkACAiIpJACgAiIiIJ
pAAgIiKSQAoAIiIiCaQAICIikkAKACIiIgmkACAiIpJACgAiIiIJpAAgIiKSQAoAIiIiCaQAICIi
kkAKACIiIgmkACAiIpJACgAiIiIJpAAgIiKSQAoAIiIiCaQAICIikkAKACIiIgmkACAiIpJACgAi
IiIJpAAgIiKSQAoAIiIiCaQAICIikkAKACIiIgmkACAiIpJACgAiIiIJpAAgIiKSQAoAIiIiCaQA
ICIikkAKACIiIgmkACAiIpJACgAiIiIJpAAgIiKSQAoAIiIiCaQAICIikkAKACIiIgmkACAiIpJA
CgAiIiIJpAAgIiKSQAoAIiIiCaQAICIikkAKACIiIgmkACAiIpJACgAiIiIJpAAgIiKSQAoAIiIi
CaQAICIikkAKACIiIgmkACAiIpJACgAiIiIJpAAgIiKSQAoAIiIiCaQAICIikkAKACIiIgmkACAi
IpJACgAiIiIJpAAgIiKSQAoAIiIiCaQAICIikkAKACIiIgmkACAiIpJACgAiIiIJpAAgIiKSQAoA
IiIiCaQAICIikkAKACIiIgmkACAiIpJACgAiIiIJpAAgIiKSQAoAIiIiCaQAICIikkAKACIiIgmk
ACAiIpJACgAiIiIJpAAgIiKSQAoAIiIiCaQAICIikkAKACIiIgmkACAiIpJACgAiIiIJpAAgIiKS
QAoAIiIiCaQAICIikkAKACIiIgmkACAiIpJACgAiIiIJpAAgIiKSQAoAIiIiCaQAICIikkAKACIi
IgmkACAiIpJACgAiIiIJpAAgIiKSQAoAIiIiCaQAICIikkAKACIiIgmkACAiIpJACgAiIiIJpAAg
IiKSQAoAIiIiCaQAICIikkAKACIiIgmkACAiIpJACgAiIiIJpAAgIiKSQAoAIiIiCaQAICIikkAK
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
3XzETcG6tcJ6o0EqCMjn8ttaCidlqvWZ8H0fG8eUq1Vq9RrgNru5tYAd16wDctksmeYNanQNHWMM
vucTRiHlaoVavY7v+65rYPMahlFEFEVk0mny2dy2opXk8LQjdw09wihislKhXq/hB8ETrmGj0XAd
QjNZctksnucRN5esJJkUAARoTsl6HgaesInKgDv7bi2xTfZo9el4xsM027TaP7qGpnkNkzdV/Wx4
nodnTPNc+g7XsLn3QsHp6blr6GGxuoayS0+9UCSJYq3dxVSqPiyeidjGoJnUPRLHsb7b9pC7hrqK
8vR0DFBERCSBFABEREQSSAFAREQkgRQAREREEkgBQEREJIEUAERERBJIAUBERCSBFABEREQSSAFA
REQkgRQAREREEkgBQEREJIEUAERERBJIAUBERCSBFABEREQSSAFAREQkgRQAREREEkgBQEREJIEU
AERERBJIAUBERCSBFABEREQSSAFAREQkgRQAREREEkgBQEREJIEUAERERBJIAUBERCSBFABEREQS
SAFAREQkgRQAREREEkgBQEREJIEUAERERBJIAUBERCSBFABEREQSSAFAREQkgRQAREREEkgBQERE
JIEUAERERBJIAUBERCSBFABEREQSSAFAREQkgRQAREREEkgBQEREJIEUAERERBJIAUBERCSBFABE
REQSSAFAREQkgRQAREREEkgBQEREJIEUAERERBJIAUBERCSBFABEREQSSAFAREQkgRQAREREEkgB
QEREJIEUAERERBJIAUBERCSBFABEREQSSAFAREQkgRQAREREEkgBQEREJIEUAERERBJIAUBERCSB
FABEREQSSAFAREQkgRQAREREEkgBQEREJIEUAERERBJIAUBERCSBFABEREQSSAFAREQkgRQARERE
EkgBQEREJIEUAERERBJIAUBERCSBFABEREQSSAFAREQkgRQAREREEkgBQEREJIEUAERERBJIAUBE
RCSBFABEREQSSAFAREQkgRQAREREEkgBQEREJIEUAERERBJIAUBERCSBFABEREQSSAFAREQkgRQA
REREEkgBQEREJIEUAERERBJIAUBERCSBFABEREQSSAFAREQkgRQAREREEkgBQEREJIEUAERERBJI
AUBERCSBFABEREQSSAFAREQkgRQAREREEkgBQEREJIEUAERERBJIAUBERCSBFABEREQSSAFAREQk
gRQAREREEkgBQEREJIEUAERERBJIAUBERCSBFABEREQSSAFAREQkgRQAREREEkgBQEREJIEUAERE
RBJIAUBERCSBFABEREQSSAFAREQkgRQAREREEkgBQEREJIEUAERERBJIAUBERCSBFABEREQSSAFA
REQkgRQAREREEkgBQEREJIH+P8PmGETgDroSAAAAAElFTkSuQmCC
B64_EOF

echo "  public/apple-touch-icon.png"
base64 -d > public/apple-touch-icon.png <<'B64_EOF'
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
kuYAAAAASUVORK5CYII=
B64_EOF

grep -qx 'dev.log' .gitignore 2>/dev/null || printf '\ndev.log\n' >> .gitignore

echo ""
echo "Done. Daymark installed."
echo "  npm run dev"
echo "  then open  /preview   and   /login"
