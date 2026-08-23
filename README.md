# Daymark

**Every school day, marked.**

Daymark is a parent-transparency layer for Nigerian schools. Parents pay fees and then
hear nothing until report card day. Daymark closes that silence: daily attendance, what
was taught, and what homework is due, visible the same day it happens.

It is not a school ERP. It sits alongside whatever the school already uses for fees and
admin, and it answers the one question every parent actually asks.

---

## Model

| Role | Relationship |
|---|---|
| School (proprietor / admin) | Buyer. Pays per student, per term. |
| Parent | Daily user. Free, included in the school's subscription. |
| Teacher | Daily operator. Free, included. |

Pricing anchor: N300 to N500 per student per term.

## Stack

- **Supabase** (Postgres) with row level security scoped by `school_id`
- **React 19 + Vite 8 + TypeScript**, Tailwind 4 (CSS-first tokens, no config file)
- **Vercel**, shipped as an installable PWA (no app store)

## Running locally

```bash
npm install
cp .env.example .env.local     # fill in your Supabase URL and anon key
npm run dev
```

| Route | Notes |
|---|---|
| `/preview` | Design system on one page. Works without Supabase. |
| `/login` | Split auth screen |
| `/admin` `/teacher` `/parent` | Role homes, guarded by RLS and route guards |

## Database

Migrations live in `supabase/migrations`. Push them with:

```bash
npx supabase db push
```

**Before trusting RLS, test it.** Create two schools and two parents, then confirm a
parent sees only their own child, and nothing at all from the other school. Same-school
leakage between families is the failure that matters most.

## Design

The app is the attendance register. Ruled surfaces, hairlines instead of shadows,
tabular figures, marks in a row.

- **Signature element:** `RegisterStrip`, a child's term as one mark per school day
- **Mark:** a tally of five, four uprights and a strike
- **Accent:** brass, once per screen, on the primary action only
- **Type:** Bricolage Grotesque (display), Public Sans (body), IBM Plex Mono (figures)

Tokens live in `src/index.css` under `@theme`. There is no `tailwind.config.js`.

## Structure

```
src/
  components/   Logo, AppShell, AuthLayout, RegisterStrip, Icons, ui primitives
  lib/          supabase client, auth provider, shared types
  routes/       Login, Signup, Onboarding, role homes, Preview
supabase/
  migrations/   schema, RLS policies, RPCs
```
