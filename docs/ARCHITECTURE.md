# SearchLift architecture

## Main request flow

1. The browser requests `/api/auth/google/start`.
2. Google OAuth redirects back to `/api/auth/google/callback`.
3. SearchLift exchanges the authorization code server-side.
4. The encrypted OAuth session is stored in an HTTP-only cookie.
5. `/api/gsc/sites` lists verified Search Console properties.
6. `/api/gsc/analytics` queries current and previous periods for totals, pages, query+page pairs, dates, devices and countries.
7. `lib/gsc.ts` normalizes GSC rows into typed domain objects.
8. `lib/seo-engine.ts` calculates opportunities, decay, query movement, cannibalization, action plan and SEO brief.
9. React receives one `AnalyticsPayload` and renders the workspace.

## Core domain layer

`lib/types.ts`

Defines the contract between Google data, the analytics engine and the UI.

`lib/seo-engine.ts`

Pure business logic:

- CTR benchmark by position
- target-position model
- estimated click gain
- opportunity confidence
- score calculation
- labels: Quick Win / Content Decay / Low CTR / Rising
- lost-query diagnosis
- query movement (entered/lost TOP 10)
- cannibalization signals
- Action Plan
- SEO Brief
- data confidence

Keeping this logic pure makes it easier to test and discuss independently of React.

## Multi-site portfolio

`/api/gsc/portfolio`

Fetches lightweight current/previous totals for up to 8 properties and calculates an attention score from traffic decline, ranking deterioration and low CTR at meaningful volume.

This intentionally avoids running the full page/query analysis for every property in one request, which keeps GSC API usage reasonable.

## Optimization experiments

The browser stores an optimization record locally. When the user marks it as implemented, SearchLift records the implementation timestamp.

`/api/gsc/experiment` then queries an exact before/after window around that date:

```text
7 days before change  vs  7 available final-data days after change
```

The same logic supports 14 and 28 days. If GSC does not yet have enough final post-change days, the API returns `status: collecting` and reports current coverage.

## Technical context

`/api/audit/page`

This intentionally stays lightweight. It checks:

- HTTP status
- response time
- title
- meta description
- H1
- canonical
- noindex
- robots.txt
- sitemap.xml

Security controls include:

- only HTTP/HTTPS
- localhost rejection
- private/reserved IP rejection
- DNS resolution validation
- redirect destination revalidation
- timeout
- max HTML body size

The goal is not to replace a crawler. It adds technical context only when a GSC opportunity is already worth investigating.
