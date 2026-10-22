import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { AuthLayout } from '../components/AuthLayout'
import { Alert, Button, PasswordField } from '../components/ui'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [again, setAgain] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit() {
    setError(null)
    if (password.length < 8) return setError('At least 8 characters.')
    if (password !== again) return setError('The two passwords do not match.')
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (error) return setError(error.message)
    navigate('/', { replace: true })
  }

  return (
    <AuthLayout
      headline={
        <>
          Set a new
          <br />
          password
        </>
      }
      sub="You opened the reset link from your email. Pick one you will remember."
    >
      <span className="eyebrow">Password</span>
      <h2 className="text-[24px] mt-1.5 mb-6">Choose a new one</h2>
      <form
        className="space-y-3.5"
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        {error && <Alert>{error}</Alert>}
        <PasswordField
          label="New password"
          autoComplete="new-password"
          minLength={8}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <PasswordField
          label="Again"
          autoComplete="new-password"
          minLength={8}
          required
          value={again}
          onChange={(e) => setAgain(e.target.value)}
        />
        <Button type="submit" full loading={busy}>
          Save password
        </Button>
      </form>
      <p className="mt-6 text-[13px] text-ink-faint">
        Remembered it?{' '}
        <Link to="/login" className="text-ink underline underline-offset-4 decoration-brass">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  )
}
