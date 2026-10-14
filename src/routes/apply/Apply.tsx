import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Wordmark } from '../../components/Logo'
import { SchoolBrand } from '../../components/SchoolBrand'
import { Alert, Button, Empty, Field, Spinner, TextArea } from '../../components/ui'
import { schoolForApply, submitEnquiry } from '../../lib/queries'
import { isSupabaseConfigured } from '../../lib/supabase'

export default function Apply() {
  const { slug = '' } = useParams()
  const [school, setSchool] = useState<{ name: string; slug: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [childFirst, setChildFirst] = useState('')
  const [childLast, setChildLast] = useState('')
  const [seekingClass, setSeekingClass] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [gender, setGender] = useState('')
  const [guardianName, setGuardianName] = useState('')
  const [guardianPhone, setGuardianPhone] = useState('')
  const [guardianEmail, setGuardianEmail] = useState('')
  const [note, setNote] = useState('')

  useEffect(() => {
    if (!slug) {
      setLoading(false)
      setError('This link is missing the school.')
      return
    }
    if (!isSupabaseConfigured) {
      setLoading(false)
      setError('This preview has no database connected.')
      return
    }
    let cancelled = false
    setLoading(true)
    void schoolForApply(slug)
      .then((s) => {
        if (!cancelled) setSchool(s)
      })
      .catch((e) => {
        if (!cancelled) setError((e as Error).message || 'School not found.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [slug])

  async function submit() {
    if (!school) return
    setError(null)
    setBusy(true)
    try {
      await submitEnquiry({
        slug: school.slug,
        childFirst,
        childLast,
        seekingClass,
        dateOfBirth,
        gender,
        guardianName,
        guardianPhone,
        guardianEmail,
        note,
      })
      setSent(true)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-dvh bg-paper">
      <header className="border-b border-rule bg-surface">
        <div className="mx-auto max-w-[440px] px-5 h-14 flex items-center">
          {school ? (
            <SchoolBrand name={school.name} size="sm" />
          ) : (
            <Link to="/" aria-label="Daymaark home">
              <Wordmark size="sm" />
            </Link>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-[440px] px-5 py-8">
        {loading ? (
          <Spinner />
        ) : !school ? (
          <Empty line={error ?? 'This school could not be found.'} />
        ) : sent ? (
          <div>
            <span className="eyebrow">{school.name}</span>
            <h1 className="text-[26px] mt-1">Enquiry received</h1>
            <p className="mt-3 text-[15px] text-ink-soft leading-relaxed">
              The office has {childFirst} {childLast} on the list. They will reach the guardian on
              the number you gave.
            </p>
          </div>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              void submit()
            }}
          >
            <div>
              <span className="eyebrow">{school.name}</span>
              <h1 className="text-[26px] mt-1">Apply for a place</h1>
              <p className="mt-2 text-[14px] text-ink-soft leading-relaxed">
                One form. The school will call. This is not a login.
              </p>
            </div>
            {error && <Alert>{error}</Alert>}
            <Field
              label="Child first name"
              required
              value={childFirst}
              onChange={(e) => setChildFirst(e.target.value)}
            />
            <Field
              label="Child last name"
              required
              value={childLast}
              onChange={(e) => setChildLast(e.target.value)}
            />
            <Field
              label="Class sought"
              placeholder="e.g. JSS 1"
              value={seekingClass}
              onChange={(e) => setSeekingClass(e.target.value)}
            />
            <Field
              label="Date of birth"
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
            />
            <label className="block">
              <span className="eyebrow block mb-1.5">Gender</span>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full h-11 px-3 bg-surface border border-rule-strong rounded-md text-[15px] text-ink focus:border-brass"
              >
                <option value="">Prefer not to say</option>
                <option value="girl">Girl</option>
                <option value="boy">Boy</option>
                <option value="other">Other</option>
              </select>
            </label>
            <Field
              label="Guardian name"
              required
              value={guardianName}
              onChange={(e) => setGuardianName(e.target.value)}
            />
            <Field
              label="Guardian phone"
              type="tel"
              required
              placeholder="0803…"
              value={guardianPhone}
              onChange={(e) => setGuardianPhone(e.target.value)}
            />
            <Field
              label="Guardian email"
              type="email"
              value={guardianEmail}
              onChange={(e) => setGuardianEmail(e.target.value)}
            />
            <TextArea
              label="Note"
              hint="Optional. 280 characters."
              value={note}
              maxLength={280}
              rows={3}
              onChange={(e) => setNote(e.target.value.slice(0, 280))}
            />
            <Button type="submit" full loading={busy}>
              Send enquiry
            </Button>
          </form>
        )}
      </main>
    </div>
  )
}
