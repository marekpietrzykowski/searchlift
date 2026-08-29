# SearchLift interview guide

Use this file to understand the project before showing it to a recruiter.

## 30-second explanation

> SearchLift is a Next.js application that connects to Google Search Console with read-only OAuth. It compares two periods, normalizes page and query data and then applies my own TypeScript analytics rules to find quick wins, content decay, low-CTR pages and potential cannibalization. The app prioritizes the results into an action plan and lets me track an SEO change with an exact before/after GSC comparison.

## Why not just use Search Console?

Search Console answers "what happened?" very well. SearchLift focuses on "what should I work on first?" and "did my optimization help?".

## Where is the frontend?

`components/searchlift-app.tsx`

Be able to explain:

- React state
- `useEffect`
- `useMemo`
- fetching API routes
- rendering/filtering lists
- why secrets are not kept in the client

## Where is the backend?

`app/api/**/route.ts`

Examples:

- OAuth routes
- `/api/gsc/analytics`
- `/api/gsc/portfolio`
- `/api/gsc/experiment`
- `/api/audit/page`

These handlers run on the server and can safely use OAuth credentials / tokens.

## Where is the business logic?

`lib/seo-engine.ts`

Important functions:

- `expectedCtrForPosition`
- `calculateOpportunity`
- `buildQueryInsights`
- `detectCannibalization`
- `buildAnalyticsPayload`

Explain that Opportunity Score is your own heuristic. It is intentionally transparent and capped when confidence is low.

## How is Estimated Click Gain calculated?

SearchLift selects a realistic next target-position zone from the current position, maps that target to a CTR benchmark and estimates:

```text
impressions × target CTR − current clicks
```

The UI explicitly labels this as an estimate, not a Google forecast.

## What is Content Decay?

A page gets a decay signal when comparable period data shows a meaningful click decline or ranking deterioration.

SearchLift also checks query+page rows and lists queries that lost clicks or positions for that URL. This makes the alert diagnosable instead of only saying "traffic fell".

## What is cannibalization detection?

The engine groups query+page rows by query. If multiple URLs have meaningful visibility for the same query, SearchLift flags it for review.

Important nuance: multiple ranking URLs are not automatically bad. The UI says it is a signal to inspect search intent and overlap.

## How does OAuth work?

1. Redirect user to Google.
2. User grants read-only Search Console scope.
3. Google returns an authorization code.
4. Server exchanges code for tokens.
5. Session is encrypted and stored in an HTTP-only cookie.
6. Refresh token is used server-side when the access token expires.

## What security issue exists with a URL checker?

SSRF. A server that fetches arbitrary user URLs could be abused to access localhost or private infrastructure.

SearchLift therefore validates URL scheme, DNS resolution, private/reserved IP ranges and every redirect destination. It also has a timeout and maximum response size.

## What would you improve next?

Good answers:

- PostgreSQL + Prisma for persistent users/experiments
- GA4 integration to prioritize traffic by downstream value
- scheduled weekly briefs
- proper unit/integration tests
- job queue for heavier technical audits
- custom CTR curves learned from a site's historical data
- deployment with production OAuth redirect URI and secret rotation
