# Project walkthrough

Read these files in this order if you want to learn the project rather than only run it.

## 1. `lib/types.ts`

Start here. It tells you what objects exist: `Metric`, `Opportunity`, `AnalyticsPayload`, `PageExperimentResult`, etc.

## 2. `lib/seo-engine.ts`

This is the most important file for understanding the product logic.

Focus on:

- how CTR benchmarks work
- how target position is selected
- how potential clicks are estimated
- how score and confidence interact
- how labels are assigned
- how lost queries are found
- how action plan / SEO brief are built

## 3. `lib/gsc.ts`

This is the external API layer.

Understand:

- `fetch()` with a bearer token
- POST body sent to Search Analytics API
- dimensions (`page`, `query`, `date`, `device`, `country`)
- paging with `startRow`
- merging current and previous periods
- exact optimization experiment windows

## 4. `lib/google-oauth.ts`

Learn OAuth flow at a high level. Do not memorize crypto implementation line-by-line.

## 5. `app/api/**`

These are Next.js server endpoints. See how the browser calls server routes rather than Google directly.

## 6. `components/searchlift-app.tsx`

Now inspect the frontend:

- state
- effects
- memoized filtering
- API requests
- multi-site switching
- modals
- optimization tracking

## Concepts worth learning after building the project

1. JavaScript objects, arrays, `map/filter/reduce`
2. async/await and fetch
3. TypeScript types and unions
4. React state/effects
5. Next.js App Router and Route Handlers
6. HTTP / REST basics
7. OAuth 2.0
8. SQL + PostgreSQL + Prisma for the next project
9. tests
10. basic web security (XSS, CSRF, SSRF, secrets)
