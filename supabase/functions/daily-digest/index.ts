// Daymark — daily digest sender.
//
// Runs once a day (scheduled by pg_cron, see the migration/setup notes in
// daily-digest-SETUP.md). For every parent with something to report today,
// sends one push notification per child-with-news, or one SMS summarising
// all of them, depending on that parent's chosen digest_channel.
//
// Deploy: supabase functions deploy daily-digest --no-verify-jwt
// Secrets needed (supabase secrets set):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:you@yourdomain)
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (Supabase sets these automatically)
//   SMS_API_KEY, SMS_SENDER_ID (only once you have picked an SMS provider)

import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3'

interface DigestRow {
  parent_id: string
  digest_channel: 'push' | 'sms' | 'none'
  phone: string | null
  parent_name: string | null
  student_id: string
  student_name: string
  attendance_status: 'present' | 'absent' | 'late' | 'excused' | null
  lessons: { subject: string; topic: string; homework: string | null }[]
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT') ?? 'mailto:hello@daymark.app',
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!,
)

function attendanceLine(status: DigestRow['attendance_status']) {
  switch (status) {
    case 'present':
      return 'present today'
    case 'absent':
      return 'marked absent today'
    case 'late':
      return 'marked late today'
    case 'excused':
      return 'excused today'
    default:
      return null
  }
}

/** One line per child: attendance plus a homework flag if there is one. */
function summarise(rows: DigestRow[]): string {
  return rows
    .map((r) => {
      const parts = [r.student_name]
      const att = attendanceLine(r.attendance_status)
      if (att) parts.push(att)
      const homework = r.lessons.find((l) => l.homework)
      if (homework) parts.push(`homework: ${homework.subject}`)
      return parts.join(', ')
    })
    .join('. ')
}

/**
 * Pluggable on purpose. Termii is the obvious default in Nigeria but is
 * priced per message and has DND-registry considerations for promotional
 * traffic — swap this out for whichever provider you settle on without
 * touching anything else in this function. Returns quietly if no provider
 * is configured yet, so SMS being unconfigured never breaks the push path.
 */
async function sendSms(phone: string, message: string): Promise<void> {
  const apiKey = Deno.env.get('SMS_API_KEY')
  const senderId = Deno.env.get('SMS_SENDER_ID')
  if (!apiKey || !senderId) {
    console.log(`[sms not configured] would send to ${phone}: ${message}`)
    return
  }

  // Example shape for Termii; adjust the endpoint and body to whichever
  // provider you pick. Kept isolated here so switching providers is a
  // one-function edit, not a rewrite of the digest logic above it.
  const res = await fetch('https://api.ng.termii.com/api/sms/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: phone,
      from: senderId,
      sms: message,
      type: 'plain',
      channel: 'generic',
      api_key: apiKey,
    }),
  })
  if (!res.ok) {
    console.error(`sms send failed for ${phone}: ${res.status} ${await res.text()}`)
  }
}

async function sendPush(parentId: string, title: string, body: string) {
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('profile_id', parentId)

  for (const sub of subs ?? []) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify({ title, body, url: '/parent' }),
      )
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode
      // 404/410 = the browser or OS has invalidated this subscription.
      // Clean it up rather than retrying it forever.
      if (status === 404 || status === 410) {
        await supabase.from('push_subscriptions').delete().eq('id', sub.id)
      } else {
        console.error('push send failed', sub.id, err)
      }
    }
  }
}

Deno.serve(async (req) => {
  // Optional shared-secret check so this can't be triggered by a stranger
  // who finds the URL. pg_cron sends this header; set CRON_SECRET to match.
  const cronSecret = Deno.env.get('CRON_SECRET')
  if (cronSecret && req.headers.get('x-cron-secret') !== cronSecret) {
    return new Response('unauthorized', { status: 401 })
  }

  const { data, error } = await supabase.rpc('digest_payload_for_date')
  if (error) {
    console.error('digest_payload_for_date failed', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  const rows = (data ?? []) as DigestRow[]
  const byParent = new Map<string, DigestRow[]>()
  for (const row of rows) {
    const list = byParent.get(row.parent_id) ?? []
    list.push(row)
    byParent.set(row.parent_id, list)
  }

  let pushSent = 0
  let smsSent = 0

  for (const [parentId, parentRows] of byParent) {
    const channel = parentRows[0].digest_channel
    const body = summarise(parentRows)
    const title =
      parentRows.length === 1 ? `${parentRows[0].student_name}'s day` : 'Today at school'

    if (channel === 'push') {
      await sendPush(parentId, title, body)
      pushSent++
    } else if (channel === 'sms') {
      const phone = parentRows[0].phone
      if (phone) {
        await sendSms(phone, `Daymark: ${body}`)
        smsSent++
      }
    }
  }

  return new Response(
    JSON.stringify({ parents_notified: byParent.size, pushSent, smsSent }),
    { headers: { 'Content-Type': 'application/json' } },
  )
})

