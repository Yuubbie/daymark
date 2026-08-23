#!/usr/bin/env bash
# =============================================================================
# Duro - Step 2 installer
# Writes the design system, auth shell, and routing into this project.
# Run from the project root (~/Projects/duro):   bash duro-setup.sh
# =============================================================================
set -e

if [ ! -f package.json ]; then
  echo "ERROR: run this from inside ~/Projects/duro (no package.json here)." >&2
  exit 1
fi

echo "Creating folders..."
mkdir -p src/lib src/components src/routes public

echo "Removing Vite defaults..."
rm -f src/App.css src/assets/react.svg public/vite.svg
rmdir src/assets 2>/dev/null || true

echo "Writing files..."
echo "  vite.config.ts"
cat > vite.config.ts <<'DURO_EOF'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5174 },
})
DURO_EOF

echo "  index.html"
cat > index.html <<'DURO_EOF'
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#143A2B" />
    <meta name="description" content="Duro stands by your child. Daily attendance, lessons and homework, straight from school." />
    <link rel="icon" type="image/svg+xml" href="/duro-mark.svg" />

    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,400..800&family=IBM+Plex+Mono:wght@400;500;600&family=Public+Sans:wght@400;500;600;700&display=swap"
      rel="stylesheet"
    />

    <title>Duro</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
DURO_EOF

echo "  public/duro-mark.svg"
cat > public/duro-mark.svg <<'DURO_EOF'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <rect width="24" height="24" rx="5" fill="#143A2B"/>
  <rect x="4.5" y="4" width="3" height="16" rx="1" fill="#C9922B"/>
  <rect x="10.5" y="7" width="3" height="13" rx="1" fill="#C9922B" opacity="0.6"/>
  <rect x="16.5" y="10.5" width="3" height="9.5" rx="1" fill="#C9922B" opacity="0.32"/>
</svg>
DURO_EOF

echo "  src/index.css"
cat > src/index.css <<'DURO_EOF'
@import "tailwindcss";

/* ===========================================================================
   Duro design tokens
   Thesis: the app is the attendance register. Ruled surfaces, hairlines,
   tabular figures, marks in a row. Brass is the only accent — spend it.
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

  /* Accent — used once per screen, never twice */
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

  /* Geometry — flat and squared. No pillowy cards. */
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

echo "  src/main.tsx"
cat > src/main.tsx <<'DURO_EOF'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
DURO_EOF

echo "  src/App.tsx"
cat > src/App.tsx <<'DURO_EOF'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'
import { AuthProvider, useAuth } from './lib/auth'
import { Spinner } from './components/ui'
import type { Role } from './lib/types'

import Login from './routes/Login'
import Signup from './routes/Signup'
import Onboarding from './routes/Onboarding'
import AdminHome from './routes/AdminHome'
import TeacherHome from './routes/TeacherHome'
import ParentHome from './routes/ParentHome'
import Preview from './routes/Preview'

/** Sends a signed-in user to the right home, or to onboarding if unattached. */
function Landing() {
  const { session, profile, loading } = useAuth()

  if (loading) return <Spinner />
  if (!session) return <Navigate to="/login" replace />
  if (!profile) return <Spinner />
  if (!profile.school_id) return <Navigate to="/welcome" replace />

  const home: Record<Role, string> = {
    admin: '/admin',
    teacher: '/teacher',
    parent: '/parent',
  }
  return <Navigate to={home[profile.role]} replace />
}

function Protected({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { session, profile, loading } = useAuth()

  if (loading) return <Spinner />
  if (!session) return <Navigate to="/login" replace />
  if (!profile) return <Spinner />
  if (!profile.school_id) return <Navigate to="/welcome" replace />
  if (!roles.includes(profile.role)) return <Navigate to="/" replace />

  return <>{children}</>
}

function RequireSession({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) return <Spinner />
  if (!session) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/preview" element={<Preview />} />

          <Route
            path="/welcome"
            element={
              <RequireSession>
                <Onboarding />
              </RequireSession>
            }
          />

          <Route
            path="/admin"
            element={
              <Protected roles={['admin']}>
                <AdminHome />
              </Protected>
            }
          />
          <Route
            path="/teacher"
            element={
              <Protected roles={['teacher']}>
                <TeacherHome />
              </Protected>
            }
          />
          <Route
            path="/parent"
            element={
              <Protected roles={['parent']}>
                <ParentHome />
              </Protected>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
DURO_EOF

echo "  src/lib/types.ts"
cat > src/lib/types.ts <<'DURO_EOF'
export type Role = 'admin' | 'teacher' | 'parent'

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused'

export interface Profile {
  id: string
  school_id: string | null
  role: Role
  full_name: string | null
  email: string | null
  phone: string | null
  is_active: boolean
}

export interface School {
  id: string
  name: string
  slug: string
  subscription_status: string
}

export interface Student {
  id: string
  school_id: string
  class_id: string | null
  first_name: string
  last_name: string
  admission_number: string | null
}

export interface AttendanceMark {
  date: string
  status: AttendanceStatus | null
}
DURO_EOF

echo "  src/lib/supabase.ts"
cat > src/lib/supabase.ts <<'DURO_EOF'
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Add them to .env.local and restart the dev server.',
  )
}

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
DURO_EOF

echo "  src/lib/auth.tsx"
cat > src/lib/auth.tsx <<'DURO_EOF'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type { Profile, School } from './types'

interface AuthValue {
  session: Session | null
  profile: Profile | null
  school: School | null
  loading: boolean
  refresh: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthValue | undefined>(undefined)

/**
 * The profile row is created by a Postgres trigger on auth.users. Immediately
 * after signup the client can win the race, so retry briefly before giving up.
 */
async function fetchProfile(userId: string, attempt = 0): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, school_id, role, full_name, email, phone, is_active')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    console.error('profile fetch failed', error)
    return null
  }
  if (!data && attempt < 4) {
    await new Promise((r) => setTimeout(r, 400 * (attempt + 1)))
    return fetchProfile(userId, attempt + 1)
  }
  return data as Profile | null
}

async function fetchSchool(schoolId: string): Promise<School | null> {
  const { data, error } = await supabase
    .from('schools')
    .select('id, name, slug, subscription_status')
    .eq('id', schoolId)
    .maybeSingle()

  if (error) {
    console.error('school fetch failed', error)
    return null
  }
  return data as School | null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [school, setSchool] = useState<School | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (s: Session | null) => {
    if (!s?.user) {
      setProfile(null)
      setSchool(null)
      setLoading(false)
      return
    }
    const p = await fetchProfile(s.user.id)
    setProfile(p)
    setSchool(p?.school_id ? await fetchSchool(p.school_id) : null)
    setLoading(false)
  }, [])

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      void load(data.session)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!active) return
      setSession(s)
      setLoading(true)
      void load(s)
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [load])

  const refresh = useCallback(async () => {
    setLoading(true)
    await load(session)
  }, [load, session])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setProfile(null)
    setSchool(null)
  }, [])

  const value = useMemo(
    () => ({ session, profile, school, loading, refresh, signOut }),
    [session, profile, school, loading, refresh, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
DURO_EOF

echo "  src/components/ui.tsx"
cat > src/components/ui.tsx <<'DURO_EOF'
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'

/* ---------------------------------------------------------------------------
   Primitives. Flat, ruled, squared. No shadows anywhere in this file — depth
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
      {loading ? 'Working…' : children}
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

echo "  src/components/DuroMark.tsx"
cat > src/components/DuroMark.tsx <<'DURO_EOF'
/**
 * The Duro mark: a standing stroke beside a register line.
 * "Dúró" — to stand. Reads as a tally mark, which is the register's own alphabet.
 */
export function DuroMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="3" y="2" width="3.5" height="20" rx="1" fill="currentColor" />
      <rect x="10" y="6" width="3.5" height="16" rx="1" fill="currentColor" opacity="0.6" />
      <rect x="17" y="10" width="3.5" height="12" rx="1" fill="currentColor" opacity="0.32" />
    </svg>
  )
}
DURO_EOF

echo "  src/components/RegisterStrip.tsx"
cat > src/components/RegisterStrip.tsx <<'DURO_EOF'
import type { AttendanceMark } from '../lib/types'

/* ---------------------------------------------------------------------------
   THE SIGNATURE ELEMENT.

   A child's term rendered as a line in the attendance register — one mark per
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
              title={`${m.date} — ${m.status ?? 'not marked'}`}
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
          {pct === null ? '—' : pct.toFixed(0)}
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

echo "  src/components/AppShell.tsx"
cat > src/components/AppShell.tsx <<'DURO_EOF'
import { NavLink, useNavigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../lib/auth'
import { DuroMark } from './DuroMark'

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
          <DuroMark className="h-5 w-5 text-brass" />
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

/** Centered layout for auth and onboarding — no nav, no distractions. */
export function PlainShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-paper flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-[380px]">{children}</div>
      </div>
      <footer className="pb-6 text-center">
        <span className="eyebrow">Duro · stands by your child</span>
      </footer>
    </div>
  )
}
DURO_EOF

echo "  src/routes/Login.tsx"
cat > src/routes/Login.tsx <<'DURO_EOF'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { PlainShell } from '../components/AppShell'
import { DuroMark } from '../components/DuroMark'
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
    <PlainShell>
      <div className="mb-8">
        <DuroMark className="h-8 w-8 text-ink mb-5" />
        <span className="eyebrow">Sign in</span>
        <h1 className="text-[30px] mt-1.5">
          What happened
          <br />
          at school today.
        </h1>
        <p className="mt-3 text-[14px] text-ink-soft leading-relaxed">
          Attendance, lessons and homework — the day your child actually had.
        </p>
      </div>

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
        <Button type="submit" full loading={busy}>
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-center text-[13px] text-ink-faint">
        New here?{' '}
        <Link to="/signup" className="text-ink underline underline-offset-4 decoration-brass">
          Create an account
        </Link>
      </p>
    </PlainShell>
  )
}
DURO_EOF

echo "  src/routes/Signup.tsx"
cat > src/routes/Signup.tsx <<'DURO_EOF'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { PlainShell } from '../components/AppShell'
import { DuroMark } from '../components/DuroMark'
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
    <PlainShell>
      <div className="mb-8">
        <DuroMark className="h-8 w-8 text-ink mb-5" />
        <span className="eyebrow">Create account</span>
        <h1 className="text-[30px] mt-1.5">Start with your name.</h1>
        <p className="mt-3 text-[14px] text-ink-soft leading-relaxed">
          Parents link to a child with the code the school gives them. Teachers are added by
          their school.
        </p>
      </div>

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
        <Button type="submit" full loading={busy}>
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-[13px] text-ink-faint">
        Already have one?{' '}
        <Link to="/login" className="text-ink underline underline-offset-4 decoration-brass">
          Sign in
        </Link>
      </p>
    </PlainShell>
  )
}
DURO_EOF

echo "  src/routes/Onboarding.tsx"
cat > src/routes/Onboarding.tsx <<'DURO_EOF'
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { PlainShell } from '../components/AppShell'
import { DuroMark } from '../components/DuroMark'
import { Alert, Button, Field } from '../components/ui'

/**
 * Reached when a signed-in user has no school yet. Two doors:
 * a parent redeems a claim code, a proprietor creates the school.
 * Teachers never land here — the invite trigger attaches them at signup.
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
    <PlainShell>
      <DuroMark className="h-8 w-8 text-ink mb-5" />

      <div className="flex border border-rule-strong rounded-md overflow-hidden mb-7">
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
            <h1 className="text-[26px] mt-1.5">Enter the code your school gave you.</h1>
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
            <h1 className="text-[26px] mt-1.5">Name the school. You'll be its admin.</h1>
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
    </PlainShell>
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
          <Empty line="Once teachers start posting, you'll see who has and who hasn't — at a glance." />
        </Panel>

        <Panel title="Needs attention">
          <Empty line="Students with low attendance or a run of absences will surface here." />
        </Panel>
      </div>
    </AppShell>
  )
}
DURO_EOF

echo "  src/routes/TeacherHome.tsx"
cat > src/routes/TeacherHome.tsx <<'DURO_EOF'
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
DURO_EOF

echo "  src/routes/ParentHome.tsx"
cat > src/routes/ParentHome.tsx <<'DURO_EOF'
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
DURO_EOF

echo "  src/routes/Preview.tsx"
cat > src/routes/Preview.tsx <<'DURO_EOF'
import { AttendanceSummary, RegisterLegend, RegisterStrip } from '../components/RegisterStrip'
import { DuroMark } from '../components/DuroMark'
import { Alert, Button, Empty, Field, Panel, StatusPill } from '../components/ui'
import type { AttendanceMark, AttendanceStatus } from '../lib/types'

/**
 * /preview — the design system on one page. Not linked from the app.
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
          <DuroMark className="h-7 w-7 text-brass mb-4" />
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
        <Panel title="Signature — the register strip">
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

if [ ! -f .env.local ]; then
  echo "Creating .env.local placeholder..."
  cat > .env.local <<'ENV_EOF'
VITE_SUPABASE_URL=https://your-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
ENV_EOF
fi

grep -qx '.env.local' .gitignore 2>/dev/null || printf '\n.env.local\n.env\n' >> .gitignore

echo ""
echo "Done. Next:"
echo "  npm run dev"
echo "  then open http://localhost:5174/preview"
