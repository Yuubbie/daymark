# Daymaark

**School management system in Nigeria.**

Daymaark is a full school management system for Nigerian schools: attendance register,
CBT exams, paper marks, Nursery/EYFS statements, term report cards, household fees,
HR, clinic, admissions, ID cards and timetable. Spell it Daymaark, two a’s.

Pricing: 30 days free, then N1,000 per student per term. That is the only plan.

---

## Model

| Role | Relationship |
|---|---|
| School (proprietor / admin) | Buyer. Pays per student on the roll. |
| Parent | Daily user. Free. The school pays, not the family. |
| Teacher | Daily operator. Free, included. |

Pricing: 30 days free, then N1,000 per student / term. That is the only plan. The school pays.

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
| `/admin` `/teacher` `/parent` `/student` | Role homes, guarded by RLS and route guards |

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
