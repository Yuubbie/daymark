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
