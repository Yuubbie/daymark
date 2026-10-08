// Sends a Supabase Auth invite email so students/staff actually receive a
// confirmation link for the address the school entered.

import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://daymark-eosin-five.vercel.app'

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
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const authHeader = req.headers.get('Authorization')
  if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
    return json({ error: 'Unauthorized' }, 401)
  }

  try {
    const body = await req.json()
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const fullName = typeof body.full_name === 'string' ? body.full_name.trim() : ''
    const redirectTo =
      typeof body.redirect_to === 'string' && body.redirect_to.startsWith('http')
        ? body.redirect_to
        : `${SITE_URL}/auth/callback`

    if (!email || !email.includes('@')) return json({ error: 'A valid email is required' }, 400)

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: userData, error: userErr } = await userClient.auth.getUser()
    if (userErr || !userData.user) return json({ error: 'Unauthorized' }, 401)

    const { data: profile } = await userClient
      .from('profiles')
      .select('role, school_id')
      .eq('id', userData.user.id)
      .maybeSingle()

    if (!profile?.school_id || (profile.role !== 'admin' && profile.role !== 'proprietor')) {
      return json({ error: 'Only the proprietor or admin can send invites' }, 403)
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const { error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName || undefined },
      redirectTo,
    })

    if (inviteErr) {
      const msg = inviteErr.message || ''
      if (/already|registered|exists/i.test(msg)) {
        const { error: resendErr } = await admin.auth.resend({
          type: 'signup',
          email,
          options: { emailRedirectTo: redirectTo },
        })
        if (resendErr && !/already|rate/i.test(resendErr.message)) {
          return json({ error: resendErr.message }, 400)
        }
        return json({ success: true, already_registered: true })
      }
      return json({ error: msg || 'Could not send invite email' }, 400)
    }

    return json({ success: true })
  } catch (err) {
    console.error('send-invite error', err)
    return json({ error: 'Could not send invite email' }, 500)
  }
})
