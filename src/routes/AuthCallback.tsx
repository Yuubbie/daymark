import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Wordmark } from '../components/Logo'
import { Alert, Button, Spinner } from '../components/ui'

export default function AuthCallback() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      const url = new URL(window.location.href)
      const err = url.searchParams.get('error_description') || url.searchParams.get('error')
      if (err) {
        setError(err.replace(/\+/g, ' '))
        return
      }

      const code = url.searchParams.get('code')
      const tokenHash = url.searchParams.get('token_hash')
      const otpType = url.searchParams.get('type')
      try {
        if (tokenHash && otpType) {
          const { error: otpErr } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: otpType as 'signup' | 'invite' | 'magiclink' | 'email' | 'recovery' | 'email_change',
          })
          if (otpErr) throw otpErr
        } else if (code) {
          const { error: ex } = await supabase.auth.exchangeCodeForSession(code)
          if (ex) throw ex
        } else {
          const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
          const access_token = hash.get('access_token')
          const refresh_token = hash.get('refresh_token')
          if (access_token && refresh_token) {
            const { error: setErr } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            })
            if (setErr) throw setErr
          } else {
            const { data } = await supabase.auth.getSession()
            if (!data.session) {
              setError('This confirmation link is missing a session. Open the newest email, or resend from Sign in.')
              return
            }
          }
        }
        window.history.replaceState({}, '', '/auth/callback')
        navigate('/', { replace: true })
      } catch (e) {
        setError((e as Error).message)
      }
    })()
  }, [navigate])

  if (error) {
    return (
      <div className="min-h-dvh bg-paper flex items-center justify-center px-6">
        <div className="w-full max-w-[440px]">
          <Wordmark size="md" className="text-ink mb-7" />
          <span className="eyebrow">Could not confirm</span>
          <h1 className="text-[26px] mt-1.5">Open the link from your email</h1>
          <div className="mt-4">
            <Alert>{error}</Alert>
          </div>
          <div className="mt-6">
            <Button full onClick={() => navigate('/login', { replace: true })}>
              Sign in
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-paper flex items-center justify-center">
      <Spinner />
    </div>
  )
}
