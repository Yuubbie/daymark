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
  /** Set when we have a session but could not resolve a profile row. */
  problem: string | null
  refresh: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthValue | undefined>(undefined)

type ProfileResult = { profile: Profile | null; problem: string | null }

/**
 * The profile row is created by a Postgres trigger on auth.users. Right after
 * signup the client can beat the trigger, so retry briefly. If it never turns
 * up we surface why rather than spinning forever.
 */
async function fetchProfile(userId: string, attempt = 0): Promise<ProfileResult> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, school_id, role, full_name, email, phone, is_active, digest_channel')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    // 42P01 = relation does not exist: the migration was never pushed.
    if (error.code === '42P01' || /does not exist/i.test(error.message)) {
      return {
        profile: null,
        problem:
          'The database tables are missing. The migration has not been pushed to this Supabase project.',
      }
    }
    if (attempt < 2) {
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)))
      return fetchProfile(userId, attempt + 1)
    }
    return { profile: null, problem: `Could not read your profile: ${error.message}` }
  }

  if (!data) {
    if (attempt < 4) {
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)))
      return fetchProfile(userId, attempt + 1)
    }
    return {
      profile: null,
      problem:
        'You are signed in but have no profile row. The handle_new_user trigger did not run, so this account was created before the migration was applied.',
    }
  }

  return { profile: data as Profile, problem: null }
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
  const [problem, setProblem] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (s: Session | null) => {
    if (!s?.user) {
      setProfile(null)
      setSchool(null)
      setProblem(null)
      setLoading(false)
      return
    }
    const { profile: p, problem: prob } = await fetchProfile(s.user.id)
    setProfile(p)
    setProblem(prob)
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
    const { data } = await supabase.auth.getSession()
    setSession(data.session)
    await load(data.session)
  }, [load])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setProfile(null)
    setSchool(null)
    setProblem(null)
  }, [])

  const value = useMemo(
    () => ({ session, profile, school, loading, problem, refresh, signOut }),
    [session, profile, school, loading, problem, refresh, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

