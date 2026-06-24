# Paint The Town — DateSpark

Personalized, **bookable, on-budget** date ideas. DateSpark takes what it knows about a user (budget, location, preferences, history) and produces 3–5 tailored date ideas, each with a concrete plan, estimated cost, map link, and a one-tap path to book.

Core value: *specific, bookable, on-budget* — not "go to a nice restaurant."

## Stack

- **Frontend:** React + TypeScript, Next.js (App Router), Tailwind CSS
- **Backend:** Next.js API routes / server actions
- **Database:** PostgreSQL via Prisma, with `pgvector` for preference embeddings
- **Auth:** NextAuth/Auth.js (Google OAuth + email) — *not yet wired*
- **AI:** Anthropic Claude API for idea copy; embeddings for preference matching
- **Hosting:** Vercel + managed Postgres (Supabase/Neon/RDS)

## Project layout

```
prisma/schema.prisma            User data model (hard vs soft constraints, pgvector)
src/lib/types.ts                Domain types
src/lib/validation.ts           Zod request validation
src/lib/db.ts                   Prisma client singleton
src/lib/generation/             Idea pipeline
  filterHard.ts                 1) exclude on HARD constraints (fail closed)
  rankSoft.ts                   2) rank survivors by SOFT preferences
  generateIdeas.ts              3) build plans, span safe/novel/splurge, respect budget
  __tests__/                    Dependency-free pipeline assertions
src/lib/integrations/           Swappable provider interfaces
  googleMaps.ts                 Places + Distance Matrix
  resy.ts / opentable.ts        Reservation handoff (see limitations below)
  ticketmaster.ts               Events/ticketing
  http.ts                       fetch w/ timeout, backoff, retry on 429/5xx
src/app/api/ideas/route.ts      POST /api/ideas
src/app/                        App shell
```

## Design rules baked in

- **Hard constraints are never violated:** allergies, accessibility, budget ceiling, max distance. The pipeline **fails closed** — if a provider can't confirm a safety accommodation, the venue is excluded, not assumed.
- **Budget ceiling is never rounded up.** A slightly-over option may appear only as a clearly-labeled, optional `isStretch` splurge (≤10% over).
- **Never auto-book.** Booking actions are deep links / handoffs; the user always confirms.
- **Never fabricate venue details or prices.** API-sourced data is used as-is; our estimates are labeled `basis: "estimate"`.

## ⚠️ Reservation API limitations (important)

Resy and OpenTable **do not offer fully open public booking APIs.** Each provider is designed for three paths, in priority order:

1. **Partner API** where access is granted (`RESY_API_KEY` / `OPENTABLE_PARTNER_ID`).
2. **Pre-filled deep link** to the reservation.
3. **Availability + handoff fallback** when no partner access exists (current default).

Code is annotated with `TODO(verify)` everywhere a real partnership/API key is required. No endpoints or response shapes are invented — provider response types are marked for verification against live APIs before production use.

## Getting started

```bash
cp .env.example .env        # fill in keys
npm install
npm run db:generate         # prisma generate
npm run db:push             # apply schema (needs Postgres + pgvector)
npm run dev
```

Smoke-test the generation logic (no DB/network needed):

```bash
npx tsx src/lib/generation/__tests__/generateIdeas.test.ts
```

## API

`POST /api/ideas` — body validated by `generateRequestSchema`. Returns `{ ideas, excluded }`, where `excluded` lists venues dropped by a hard constraint and the reason.

## Status

Scaffold. Next steps: wire NextAuth, provision Postgres + pgvector, add real provider keys, and layer Claude-generated pitch copy on top of the deterministic constraint/cost engine.
