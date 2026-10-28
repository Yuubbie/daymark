import { useEffect, useState } from 'react'
import { AppShell } from '../components/AppShell'
import { SchoolLogoUpload } from '../components/SchoolLogoUpload'
import { Alert, Button, Field, Panel, Row } from '../components/ui'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { isOpsEmail } from '../lib/ops'
import { applySchoolAccent, ACCENT_PRESETS, DEFAULT_ACCENT } from '../lib/brand'
import { setSchoolAccent, updateSchoolContact } from '../lib/queries'

export default function Account() {
  const { profile, school, session, signOut, refresh } = useAuth()
  const canEdit = profile?.role === 'admin' || profile?.role === 'proprietor'
  const [address, setAddress] = useState(school?.address ?? '')
  const [phone, setPhone] = useState(school?.phone ?? '')
  const [accent, setAccent] = useState(school?.accent_color ?? DEFAULT_ACCENT)
  const [busy, setBusy] = useState(false)
  const [accentBusy, setAccentBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setAddress(school?.address ?? '')
    setPhone(school?.phone ?? '')
    setAccent(school?.accent_color ?? DEFAULT_ACCENT)
  }, [school?.address, school?.phone, school?.accent_color])

  async function saveAccent(hex: string | null) {
    setAccentBusy(true)
    setError(null)
    setNotice(null)
    try {
      await setSchoolAccent(hex)
      applySchoolAccent(hex)
      setAccent(hex ?? DEFAULT_ACCENT)
      await refresh()
      setNotice('Colour saved. It shows on buttons, marks, and print accents.')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setAccentBusy(false)
    }
  }

  async function saveContact() {
    if (!school) return
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      await updateSchoolContact(school.id, address, phone)
      await refresh()
      setNotice('Saved. It prints on the back of every student ID.')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AppShell>
      <div className="mb-5">
        <span className="eyebrow">Signed in</span>
        <h1 className="text-[26px] mt-1">{profile?.full_name || 'Your account'}</h1>
      </div>

      <div className="space-y-4">
        <Panel title="Account">
          <div className="divide-y divide-rule -my-3">
            <Row
              left={<span className="text-[13px] text-ink-faint">Name</span>}
              right={<span className="text-[14px]">{profile?.full_name || '—'}</span>}
            />
            <Row
              left={<span className="text-[13px] text-ink-faint">Email</span>}
              right={<span className="text-[14px]">{session?.user.email ?? profile?.email ?? '—'}</span>}
            />
            <Row
              left={<span className="text-[13px] text-ink-faint">Role</span>}
              right={
                <span className="font-mono text-[11px] uppercase tracking-[0.12em]">
                  {profile?.role}
                </span>
              }
            />
            <Row
              left={<span className="text-[13px] text-ink-faint">School</span>}
              right={<span className="text-[14px]">{school?.name ?? '—'}</span>}
            />
            {school?.slug && canEdit && (
              <Row
                left={<span className="text-[13px] text-ink-faint">Apply link</span>}
                right={
                  <a
                    href={`/apply/${school.slug}`}
                    className="text-[13px] underline underline-offset-4 decoration-brass"
                  >
                    /apply/{school.slug}
                  </a>
                }
              />
            )}
          </div>
        </Panel>

        {isOpsEmail(session?.user.email) && (
          <Panel title="Daymaark ops">
            <p className="text-[13px] text-ink-soft mb-3">
              Schools and proprietors across every school. Not the school office.
            </p>
            <Link to="/ops">
              <Button variant="secondary">Open ops</Button>
            </Link>
          </Panel>
        )}

        {canEdit && school && (
          <Panel title="School identity">
            <p className="text-[13px] text-ink-soft mb-3">
              The crest replaces Daymaark on the dashboard, ID cards, claim slips, and term
              cards. You can also add it when you name the school. Address and phone print on
              the back of the ID. Leave blank and the card still says return to the office.
            </p>
            <div className="mb-4">
              <SchoolLogoUpload
                schoolId={school.id}
                currentUrl={school.logo_url}
                onSaved={() => void refresh()}
              />
            </div>
            {error && (
              <div className="mb-3">
                <Alert>{error}</Alert>
              </div>
            )}
            {notice && !error && (
              <p className="mb-3 text-[13px] text-present font-semibold">{notice}</p>
            )}
            <div className="space-y-3">
              <Field
                label="Address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="12 Adeola Street, Ikeja"
              />
              <Field
                label="Phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0803…"
              />
              <Button onClick={() => void saveContact()} loading={busy}>
                Save
              </Button>
            </div>
          </Panel>
        )}

        {canEdit && school && (
          <Panel title="School colour">
            <p className="text-[13px] text-ink-soft mb-3">
              One accent. It replaces brass on buttons, marks, and print. Pick a school colour, or keep brass.
            </p>
            <div className="flex flex-wrap gap-2">
              {ACCENT_PRESETS.map((p) => (
                <button
                  key={p.hex}
                  type="button"
                  disabled={accentBusy}
                  onClick={() => void saveAccent(p.hex === DEFAULT_ACCENT ? null : p.hex)}
                  className={`h-9 px-3 rounded-md border text-[12px] font-semibold ${
                    (accent || DEFAULT_ACCENT).toUpperCase() === p.hex.toUpperCase()
                      ? 'border-ink'
                      : 'border-rule-strong'
                  }`}
                >
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-sm mr-2 align-middle"
                    style={{ background: p.hex }}
                  />
                  {p.label}
                </button>
              ))}
            </div>
          </Panel>
        )}

        <Button
          variant="secondary"
          full
          onClick={() => void signOut().then(() => {
            window.location.assign('/login')
          })}
        >
          Sign out
        </Button>
      </div>
    </AppShell>
  )
}
