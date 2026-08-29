# Daily Digest — Setup Guide

Everything below was written and build-tested against your actual repo before
being handed to you. `npm run build` and `npm run lint` both pass clean, zero
new errors, zero new warnings.

## What this adds
- A parent Settings page (`/parent/settings`): edit phone number, choose a
  digest channel (push / SMS / none), turn push notifications on or off
- Free web push notifications to installed PWAs, no cost, no DND-registry
  issue (that's an SMS-specific rule in Nigeria)
- An Edge Function that runs once a day, finds everyone with something to
  report, and sends it via whichever channel each parent picked
- SMS wired as a fallback, but genuinely pluggable — Termii's the obvious
  default but the function isolates the send call so swapping providers is
  a one-function edit, not a rewrite

## 1. Install the code

```
cd ~/Projects/duro
```

Download `install-daily-digest.sh` from this conversation, put it in your
project root, then:

```
bash install-daily-digest.sh
```

This overwrites 6 existing files (adds the new nav item, the route, the
service worker registration, etc.) and creates 5 new ones. Nothing here
touches your existing attendance, lessons, or auth logic.

## 2. Add your VAPID key locally

I generated a real key pair for you — use it directly, no need to generate
your own:

```
VITE_VAPID_PUBLIC_KEY=BEAGOLRe-WTscu1eljgBPhA2A9v6yRIhtL4Vw1mXNp2DNerwXa8KwCssynnx-CMusIXjMFdFUpHj3SQ5YWNxVrY
```

Add that line to `.env.local` (alongside your existing Supabase lines), then
also add it to **Vercel → Project Settings → Environment Variables** so the
deployed site has it too. Keep the matching **private** key for step 4 —
don't put the private key in `.env.local` or anywhere client-side, it only
ever goes into the Edge Function's secrets.

Private key (Edge Function secret, step 4): `0dndBzPbgneqsdorJ5hlZEs-RosAR7G1tTObPYTWTzU`

## 3. Push the migration

Same flow you already know — Supabase dashboard → **SQL Editor → New
query**, paste the contents of `20260826000000_notifications.sql`, Run.
This adds `profiles.digest_channel`, the `push_subscriptions` table, and a
`digest_payload_for_date()` function the Edge Function calls.

## 4. Deploy the Edge Function — no CLI needed

Supabase now lets you write and deploy functions straight from the
dashboard, which avoids the whole CLI/token situation from before.

1. Supabase dashboard → **Edge Functions** (left sidebar)
2. Click **Deploy a new function** → **Via editor** (not a template)
3. Name it `daily-digest`
4. Paste in the contents of `daily-digest-function.ts`
5. Click **Deploy**

Then set the secrets it needs — still in the Edge Functions section, look
for **Secrets** (or **Manage secrets**):

| Secret | Value |
|---|---|
| `VAPID_PUBLIC_KEY` | `BEAGOLRe-WTscu1eljgBPhA2A9v6yRIhtL4Vw1mXNp2DNerwXa8KwCssynnx-CMusIXjMFdFUpHj3SQ5YWNxVrY` |
| `VAPID_PRIVATE_KEY` | `0dndBzPbgneqsdorJ5hlZEs-RosAR7G1tTObPYTWTzU` |
| `VAPID_SUBJECT` | `mailto:` + whatever email you want linked to your push identity |
| `CRON_SECRET` | make up any random string, e.g. `openssl rand -hex 16` output, or just mash the keyboard |

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set automatically by
Supabase for every Edge Function — you don't add those yourself.

Leave `SMS_API_KEY` and `SMS_SENDER_ID` unset for now. Without them, the
function logs what it *would* have sent instead of actually sending — safe
to deploy today and wire up SMS later once you've picked a provider.

## 5. Schedule it to run daily

Back in **SQL Editor → New query**, paste this (replace the two bracketed
values — your project ref is in your Supabase dashboard URL, and the secret
is whatever you set as `CRON_SECRET` above):

```sql
select cron.schedule(
  'daymark-daily-digest',
  '0 17 * * *',  -- 5pm daily, in the database's timezone — adjust as needed
  $$
  select net.http_post(
    url := 'https://[YOUR-PROJECT-REF].supabase.co/functions/v1/daily-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', '[YOUR-CRON-SECRET]'
    )
  );
  $$
);
```

If this errors saying `cron` or `net` doesn't exist, run these two lines
first, then retry the block above:

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;
```

## 6. Test it without waiting a full day

In the Edge Functions section of the dashboard, most functions have a
**"Invoke"** or **"Test"** button that lets you trigger it manually right
now instead of waiting for the cron schedule. Do that once, then check:

- Supabase → **Edge Functions → daily-digest → Logs** — should show
  `parents_notified`, `pushSent`, `smsSent` counts
- On a phone where a parent account has enabled push (via the new Settings
  page), you should get a real notification within a few seconds

## What's still manual
- **SMS provider**: not wired to a real sender yet, on purpose — pick one
  (Termii or otherwise) once you're ready to spend on it, then fill in
  `SMS_API_KEY`/`SMS_SENDER_ID` and adjust the `sendSms()` function if your
  chosen provider's API shape differs from Termii's
- **Existing parent accounts**: everyone gets `digest_channel = 'push'` by
  default from the migration, but push only actually works once they visit
  Settings and tap "Turn on" — nobody's opted in automatically, since
  browsers require an explicit user gesture to grant notification
  permission
