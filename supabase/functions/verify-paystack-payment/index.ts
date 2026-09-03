// supabase/functions/verify-paystack-payment/index.ts
//
// Edge Function: verifies a Paystack payment server-side and, only if
// genuinely confirmed, extends the school's paid_until date.
//
// WHY THIS EXISTS AS A SERVER FUNCTION RATHER THAN TRUSTING THE BROWSER:
// After Paystack's checkout popup closes, it calls a JS callback in the
// browser saying "success" — but that callback is just JavaScript running
// on the customer's own machine. A technically-inclined person could edit
// that code to fake a "success" message without ever actually paying.
// This function closes that hole: it takes the reference the browser
// reports, then asks Paystack's own server directly "did this reference
// actually succeed, and for how much?" using the secret key, which never
// touches the browser. Only Paystack's answer is trusted.
//
// SETUP REQUIRED before this works:
// 1. Deploy this function: supabase functions deploy verify-paystack-payment
// 2. Set the secret key (Daymark's Paystack Test Secret Key for now):
//      supabase secrets set PAYSTACK_SECRET_KEY=sk_test_xxxxx
//    (Set this via Supabase Dashboard → Edge Functions → Secrets if you
//    don't have the Supabase CLI set up — same place CRON_SECRET and the
//    VAPID keys were set for the daily-digest function.)

import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Must match the pricing rules from the Daymark handover notes exactly:
//   under 150 students: ₦500/student
//   150–400 students:   ₦400/student
//   over 400 students:  ₦300/student
//   ₦40,000 minimum per term, regardless of size
function calculateExpectedAmountNaira(studentCount: number): number {
  let perStudent: number
  if (studentCount < 150) perStudent = 500
  else if (studentCount <= 400) perStudent = 400
  else perStudent = 300

  const raw = studentCount * perStudent
  return Math.max(raw, 40000)
}

const TERM_LENGTH_DAYS = 100 // ~3+ months, matches Daymark's per-term pricing

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  try {
    const { reference, school_id } = await req.json()

    if (!reference || !school_id) {
      return new Response(
        JSON.stringify({ error: 'Missing reference or school_id' }),
        { status: 400 }
      )
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Guard against processing the same successful payment twice (e.g. if
    // the browser calls this function more than once for the same reference).
    const { data: existing } = await supabase
      .from('payments')
      .select('id, status')
      .eq('paystack_reference', reference)
      .maybeSingle()

    if (existing?.status === 'success') {
      return new Response(
        JSON.stringify({ success: true, message: 'Already verified.' }),
        { status: 200 }
      )
    }

    // The one call that actually matters: ask Paystack's server, not the
    // browser, whether this reference really succeeded.
    const verifyResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      }
    )
    const verifyData = await verifyResponse.json()

    if (!verifyResponse.ok || verifyData?.data?.status !== 'success') {
      await supabase.from('payments').upsert(
        {
          paystack_reference: reference,
          school_id,
          amount_kobo: verifyData?.data?.amount ?? 0,
          student_count_at_payment: 0,
          status: 'failed',
        },
        { onConflict: 'paystack_reference' }
      )
      return new Response(
        JSON.stringify({ success: false, error: 'Payment was not successful.' }),
        { status: 200 }
      )
    }

    const amountKobo: number = verifyData.data.amount
    const amountNaira = amountKobo / 100

    // Count this school's current students to compute what they SHOULD
    // have paid, and compare against what Paystack confirms they actually
    // paid. This defends against someone tampering with the client-side
    // popup to display/submit a lower amount than the real price.
    const { count: studentCount } = await supabase
      .from('students')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', school_id)

    const expectedAmountNaira = calculateExpectedAmountNaira(studentCount ?? 0)

    if (amountNaira < expectedAmountNaira) {
      await supabase.from('payments').upsert(
        {
          paystack_reference: reference,
          school_id,
          amount_kobo: amountKobo,
          student_count_at_payment: studentCount ?? 0,
          status: 'failed',
        },
        { onConflict: 'paystack_reference' }
      )
      return new Response(
        JSON.stringify({
          success: false,
          error: `Amount paid (₦${amountNaira}) is less than the required amount (₦${expectedAmountNaira}) for ${studentCount} students. Please contact support.`,
        }),
        { status: 200 }
      )
    }

    // Genuinely confirmed and sufficient — extend the school's access.
    const { data: school } = await supabase
      .from('schools')
      .select('paid_until, trial_ends_at')
      .eq('id', school_id)
      .single()

    const now = new Date()
    const currentPaidUntil = school?.paid_until ? new Date(school.paid_until) : null
    // If they're renewing before expiry, stack the new term on top of the
    // existing paid_until rather than resetting from today — otherwise a
    // school renewing early would lose the days they already paid for.
    const baseDate = currentPaidUntil && currentPaidUntil > now ? currentPaidUntil : now
    const newPaidUntil = new Date(baseDate.getTime() + TERM_LENGTH_DAYS * 24 * 60 * 60 * 1000)

    await supabase
      .from('schools')
      .update({
        subscription_status: 'active',
        paid_until: newPaidUntil.toISOString(),
      })
      .eq('id', school_id)

    await supabase.from('payments').upsert(
      {
        paystack_reference: reference,
        school_id,
        amount_kobo: amountKobo,
        student_count_at_payment: studentCount ?? 0,
        status: 'success',
        paid_until_before: school?.paid_until ?? null,
        paid_until_after: newPaidUntil.toISOString(),
        verified_at: now.toISOString(),
      },
      { onConflict: 'paystack_reference' }
    )

    return new Response(
      JSON.stringify({
        success: true,
        paid_until: newPaidUntil.toISOString(),
      }),
      { status: 200 }
    )
  } catch (err) {
    console.error('verify-paystack-payment error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal error verifying payment.' }),
      { status: 500 }
    )
  }
})
