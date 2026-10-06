// Edge Function: verifies a Paystack payment server-side and, only if
// genuinely confirmed, activates the school's annual subscription.
//
// The browser callback is never trusted. This function:
//   1. Requires a signed-in admin/proprietor JWT
//   2. Asks Paystack whether the reference actually succeeded
//   3. Checks the amount is at least N200,000
//   4. Calls activate_subscription (service role)

import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

const ANNUAL_AMOUNT_KOBO = 20000000

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
    return json({ error: 'Unauthorized' }, 401)
  }

  if (!PAYSTACK_SECRET_KEY) {
    return json({ error: 'Payment is not configured' }, 500)
  }

  try {
    const { reference, school_id } = await req.json()

    if (!reference || typeof reference !== 'string') {
      return json({ error: 'Missing reference' }, 400)
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: userData, error: userErr } = await userClient.auth.getUser()
    if (userErr || !userData.user) {
      return json({ error: 'Unauthorized' }, 401)
    }

    const { data: profile, error: profileErr } = await userClient
      .from('profiles')
      .select('role, school_id')
      .eq('id', userData.user.id)
      .maybeSingle()

    if (profileErr || !profile?.school_id) {
      return json({ error: 'Unauthorized' }, 401)
    }

    if (profile.role !== 'admin' && profile.role !== 'proprietor') {
      return json({ error: 'Only the proprietor or admin can verify payment' }, 403)
    }

    if (school_id && school_id !== profile.school_id) {
      return json({ error: 'school_id does not match your school' }, 403)
    }

    const schoolId = profile.school_id
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { data: existing } = await supabase
      .from('payments')
      .select('id, status')
      .eq('reference', reference)
      .maybeSingle()

    if (existing?.status === 'success') {
      return json({ success: true, message: 'Already verified.' })
    }

    const verifyResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } },
    )
    const verifyData = await verifyResponse.json()

    if (!verifyResponse.ok || verifyData?.data?.status !== 'success') {
      return json({ success: false, error: 'Payment was not successful.' })
    }

    const amountKobo: number = verifyData.data.amount
    if (typeof amountKobo !== 'number' || amountKobo < ANNUAL_AMOUNT_KOBO) {
      return json({
        success: false,
        error: `Amount paid is less than the required N200,000 annual fee.`,
      })
    }

    const metaSchool = verifyData.data?.metadata?.school_id
    if (metaSchool && metaSchool !== schoolId) {
      return json({ success: false, error: 'Payment does not belong to this school.' })
    }

    const { error: activateErr } = await supabase.rpc('activate_subscription', {
      p_school_id: schoolId,
      p_reference: reference,
      p_provider: 'paystack',
      p_amount_kobo: amountKobo,
    })

    if (activateErr) {
      console.error('activate_subscription failed', activateErr)
      return json({ error: 'Could not activate subscription.' }, 500)
    }

    return json({ success: true })
  } catch (err) {
    console.error('verify-paystack-payment error:', err)
    return json({ error: 'Internal error verifying payment.' }, 500)
  }
})
