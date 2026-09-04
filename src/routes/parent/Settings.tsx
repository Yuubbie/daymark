import { useEffect, useState } from 'react'
import { AppShell } from '../../components/AppShell'
import { Alert, Button, Field, Panel, Row } from '../../components/ui'
import { IconBell } from '../../components/Icons'
import { useAuth } from '../../lib/auth'
import { supabase } from '../../lib/supabase'
import { disablePush, enablePush, pushPermission, pushSupported } from '../../lib/push'
import type { Profile } from '../../lib/types'

type Channel = Profile['digest_channel']

/**
 * Where a parent fixes what onboarding skipped, or changes their mind
 * about how they want to be reached. Onboarding's phone field is optional
 * on purpose — this is the second chance, not a duplicate of it.
 */
export default function ParentSettings() {
  const { profile, refresh } = useAuth()
  const [phone, setPhone] = useState(profile?.phone ?? '')
  const [channel, setChannel] = useState<Channel>(profile?.digest_channel ?? 'push')
  const [pushState, setPushState] = useState<NotificationPermission | 'unsupported'>('default')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void pushPermission().then(setPushState)
  }, [])

  async function save() {
    setBusy(true)
    setError(null)
    setNotice(null)
    const { error } = await supabase
      .from('profiles')
      .update({ phone: phone.trim() || null, digest_channel: channel })
      .eq('id', profile!.id)
    setBusy(false)
    if (error) return setError(error.message)
    setNotice('Saved.')
    await refresh()
  }

  async function togglePush() {
    setBusy(true)
    setError(null)
    if (pushState === 'granted') {
      await disablePush()
      setPushState('default')
    } else {
      const res = await enablePush()
      if (!res.ok) {
        setError(res.error ?? 'Could not enable notifications.')
      } else {
        setPushState('granted')
        if (channel === 'none') setChannel('push')
      }
    }
    setBusy(false)
  }

  return (
    <AppShell>
      <div className="mb-4">
        <span className="eyebrow">Settings</span>
        <h1 className="text-[26px] mt-1">How we reach you.</h1>
      </div>

      {error && (
        <div className="mb-4">
          <Alert>{error}</Alert>
        </div>
      )}
      {notice && !error && (
        <div className="mb-4 text-[13px] text-present font-semibold">{notice}</div>
      )}

      <div className="space-y-4">
        <Panel title="Phone number">
          <p className="text-[13px] text-ink-soft mb-3">
            So the school can reach you quickly, and so a text digest can find you if you choose
            one below.
          </p>
          <Field
            label="Your phone number"
            type="tel"
            inputMode="tel"
            placeholder="0803 123 4567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </Panel>

        <Panel title="Push notifications">
          <p className="text-[13px] text-ink-soft mb-3">
            Free. Sent straight to this device the moment attendance or a lesson is posted, even
            with the app closed.
          </p>
          {pushSupported() ? (
            <Row
              left={
                <div className="flex items-center gap-2.5">
                  <IconBell />
                  <span className="text-[14px] font-semibold">
                    {pushState === 'granted' ? 'Enabled on this device' : 'Not enabled'}
                  </span>
                </div>
              }
              right={
                <Button
                  variant={pushState === 'granted' ? 'secondary' : 'primary'}
                  onClick={() => void togglePush()}
                  loading={busy}
                >
                  {pushState === 'granted' ? 'Turn off' : 'Turn on'}
                </Button>
              }
            />
          ) : (
            <p className="text-[13px] text-ink-faint">
              This browser does not support push notifications. Try adding Daymaark to your home
              screen first.
            </p>
          )}
        </Panel>

        <Panel title="Daily digest">
          <p className="text-[13px] text-ink-soft mb-3">
            One summary a day for each child: attendance, what was taught, and any homework.
          </p>
          <div className="space-y-2">
            {(
              [
                { value: 'push', label: 'Push notification', hint: 'Free, needs this device enabled above.' },
                { value: 'sms', label: 'Text message', hint: 'A cost applies. Best if you do not always have the app open.' },
                { value: 'none', label: 'No daily digest', hint: 'You can still open the app any time.' },
              ] as const
            ).map((opt) => (
              <label
                key={opt.value}
                className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors
                  ${channel === opt.value ? 'border-ink bg-surface-alt' : 'border-rule-strong'}`}
              >
                <input
                  type="radio"
                  name="digest_channel"
                  className="mt-1"
                  checked={channel === opt.value}
                  onChange={() => setChannel(opt.value)}
                />
                <span>
                  <span className="block text-[14px] font-semibold">{opt.label}</span>
                  <span className="block text-[12px] text-ink-faint mt-0.5">{opt.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </Panel>

        <Button full loading={busy} onClick={() => void save()}>
          Save settings
        </Button>
      </div>
    </AppShell>
  )
}
