import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Wordmark } from '../components/Logo'
import { Button, Panel } from '../components/ui'

/* ---------------------------------------------------------------------------
   /diagnostics

   Answers "why is nothing working" without opening the console. Checks the
   env, the connection, every table, every RPC, and the signup trigger.
   Unauthenticated on purpose. Delete before the pilot.
--------------------------------------------------------------------------- */

type State = 'pending' | 'pass' | 'fail' | 'warn'
type Check = { name: string; state: State; detail: string }

const TABLES = [
  'schools',
  'profiles',
  'terms',
  'classes',
  'class_teachers',
  'students',
  'parent_student_links',
  'claim_codes',
  'invites',
  'attendance',
  'lessons',
  'announcements',
]

const RPCS = ['create_school_and_admin', 'generate_claim_code', 'redeem_claim_code']

export default function Diagnostics() {
  const [checks, setChecks] = useState<Check[]>([])
  const [running, setRunning] = useState(false)

  async function run() {
    setRunning(true)
    const out: Check[] = []
    const push = (c: Check) => {
      out.push(c)
      setChecks([...out])
    }

    // 1. Environment
    const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

    if (!url || !key) {
      push({
        name: 'Environment variables',
        state: 'fail',
        detail:
          'VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing. Put both in .env.local at the project root and restart the dev server.',
      })
      setRunning(false)
      return
    }
    if (url.includes('your-ref') || key.includes('your-anon-key')) {
      push({
        name: 'Environment variables',
        state: 'fail',
        detail: 'Still the placeholder values from .env.example. Paste your real project URL and anon key.',
      })
      setRunning(false)
      return
    }
    if (!/^https:\/\/[a-z0-9]+\.supabase\.co\/?$/.test(url.trim())) {
      push({
        name: 'Environment variables',
        state: 'warn',
        detail: `URL looks unusual: ${url}. Expected https://<ref>.supabase.co with no trailing path.`,
      })
    } else {
      push({ name: 'Environment variables', state: 'pass', detail: url })
    }

    // 2. Key shape
    const looksJwt = key.split('.').length === 3
    const looksNewKey = key.startsWith('sb_publishable_')
    push({
      name: 'Anon key format',
      state: looksJwt || looksNewKey ? 'pass' : 'fail',
      detail: looksJwt || looksNewKey
        ? `${key.slice(0, 12)}... (${key.length} chars)`
        : 'This does not look like an anon key. Do not use the service_role or a database password here.',
    })

    // 3. Reachability
    try {
      const r = await fetch(`${url.replace(/\/$/, '')}/auth/v1/health`, {
        headers: { apikey: key },
      })
      push({
        name: 'Supabase reachable',
        state: r.ok ? 'pass' : 'fail',
        detail: `HTTP ${r.status}${r.ok ? '' : '. Check the project is not paused.'}`,
      })
    } catch (e) {
      push({
        name: 'Supabase reachable',
        state: 'fail',
        detail: `Network error: ${String(e)}. Wrong URL, offline, or the project is paused.`,
      })
    }

    // 4. Session
    const { data: sess } = await supabase.auth.getSession()
    push({
      name: 'Current session',
      state: sess.session ? 'pass' : 'warn',
      detail: sess.session
        ? `Signed in as ${sess.session.user.email}`
        : 'No session. Normal if you have not signed in.',
    })

    // 5. Tables
    const missing: string[] = []
    for (const t of TABLES) {
      const { error } = await supabase.from(t).select('*', { head: true, count: 'exact' }).limit(1)
      if (error && (error.code === '42P01' || /does not exist/i.test(error.message))) {
        missing.push(t)
      }
    }
    push({
      name: 'Tables',
      state: missing.length === 0 ? 'pass' : 'fail',
      detail:
        missing.length === 0
          ? `All ${TABLES.length} present.`
          : `Missing: ${missing.join(', ')}. Run: npx supabase db push`,
    })

    // 6. RPCs, probed non-destructively
    const missingRpc: string[] = []
    for (const fn of RPCS) {
      const { error } = await supabase.rpc(fn, {} as never)
      if (error && /could not find the function|does not exist/i.test(error.message)) {
        missingRpc.push(fn)
      }
    }
    push({
      name: 'Database functions',
      state: missingRpc.length === 0 ? 'pass' : 'fail',
      detail:
        missingRpc.length === 0
          ? `All ${RPCS.length} present.`
          : `Missing: ${missingRpc.join(', ')}. The migration did not fully apply.`,
    })

    // 7. Profile row for the signed-in user
    if (sess.session) {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, role, school_id')
        .eq('id', sess.session.user.id)
        .maybeSingle()

      if (error) {
        push({ name: 'Your profile row', state: 'fail', detail: error.message })
      } else if (!data) {
        push({
          name: 'Your profile row',
          state: 'fail',
          detail:
            'Signed in, but no row in profiles. This account was created before the trigger existed. Delete the user in Supabase Auth and sign up again.',
        })
      } else {
        push({
          name: 'Your profile row',
          state: 'pass',
          detail: `role=${data.role}, school_id=${data.school_id ?? 'null (needs onboarding)'}`,
        })
      }
    }

    setRunning(false)
  }

  useEffect(() => {
    void run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const dot: Record<State, string> = {
    pending: 'bg-unmarked',
    pass: 'bg-present',
    warn: 'bg-late',
    fail: 'bg-absent',
  }

  return (
    <div className="min-h-dvh bg-paper">
      <header className="bg-ink text-ink-invert">
        <div className="mx-auto max-w-2xl px-4 py-7">
          <Wordmark size="md" className="text-ink-invert mb-4" />
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-invert/55">
            Diagnostics
          </span>
          <h1 className="text-[28px] mt-1">Why is nothing working</h1>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-6 space-y-4">
        <Panel title="Checks">
          <ul className="divide-y divide-rule -my-1">
            {checks.map((c) => (
              <li key={c.name} className="py-3 flex gap-3">
                <span className={`mt-1.5 h-2.5 w-2.5 rounded-[1.5px] shrink-0 ${dot[c.state]}`} />
                <div className="min-w-0">
                  <div className="text-[14px] font-semibold">{c.name}</div>
                  <div className="text-[13px] text-ink-soft break-words">{c.detail}</div>
                </div>
              </li>
            ))}
            {checks.length === 0 && (
              <li className="py-3 text-[13px] text-ink-faint">Running...</li>
            )}
          </ul>
          <div className="mt-4 flex gap-2">
            <Button variant="secondary" onClick={() => void run()} loading={running}>
              Run again
            </Button>
            <Link to="/">
              <Button variant="ghost">Back to app</Button>
            </Link>
          </div>
        </Panel>

        <Panel title="Common fixes">
          <ul className="space-y-2.5 text-[13px] text-ink-soft">
            <li>
              <strong className="text-ink">Signup does nothing.</strong> Supabase requires
              email confirmation by default. Turn it off for development in Authentication,
              Sign In / Providers, Email, then disable Confirm email.
            </li>
            <li>
              <strong className="text-ink">Tables missing.</strong> Run{' '}
              <code className="font-mono text-[12px]">npx supabase db push</code> from the
              project root.
            </li>
            <li>
              <strong className="text-ink">Env changes ignored.</strong> Vite only reads
              .env.local at startup. Stop and restart the dev server.
            </li>
            <li>
              <strong className="text-ink">No profile row.</strong> The account predates the
              trigger. Delete the user under Authentication, Users, then sign up again.
            </li>
          </ul>
        </Panel>
      </div>
    </div>
  )
}
