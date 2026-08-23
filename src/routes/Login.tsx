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
