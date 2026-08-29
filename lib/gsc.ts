import { buildAnalyticsPayload, buildSummary } from "./seo-engine";
import { getComparisonPeriod } from "./date-ranges";
import type {
  AnalyticsPayload,
  BreakdownItem,
  Metric,
  PageExperimentResult,
  PagePeriodRow,
  QueryPagePeriodRow,
  SitePortfolioItem,
  SitePortfolioPayload,
  TrendPoint,
} from "./types";

type GscRow = {
  keys?: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

type GscResponse = {
  rows?: GscRow[];
};

async function queryGsc(
  accessToken: string,
  siteUrl: string,
  body: Record<string, unknown>,
): Promise<GscResponse> {
  const response = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Search Console API ${response.status}: ${text.slice(0, 300)}`);
  }

  return (await response.json()) as GscResponse;
}

async function queryAllRows(
  accessToken: string,
  siteUrl: string,
  body: Record<string, unknown>,
  maxRows = 50000,
): Promise<GscRow[]> {
  const pageSize = 25000;
  const rows: GscRow[] = [];

  for (let startRow = 0; startRow < maxRows; startRow += pageSize) {
    const result = await queryGsc(accessToken, siteUrl, {
      ...body,
      rowLimit: Math.min(pageSize, maxRows - startRow),
      startRow,
      dataState: "final",
    });
    const page = result.rows ?? [];
    rows.push(...page);
    if (page.length < pageSize) break;
  }

  return rows;
}

function metric(row?: GscRow): Metric {
  return {
    clicks: row?.clicks ?? 0,
    impressions: row?.impressions ?? 0,
    ctr: row?.ctr ?? 0,
    position: row?.position ?? 0,
  };
}

function mergePages(currentRows: GscRow[], previousRows: GscRow[]): PagePeriodRow[] {
  const current = new Map(currentRows.map((row) => [row.keys?.[0] ?? "", metric(row)]));
  const previous = new Map(previousRows.map((row) => [row.keys?.[0] ?? "", metric(row)]));
  const keys = new Set([...current.keys(), ...previous.keys()]);

  return [...keys]
    .filter(Boolean)
    .map((page) => ({
      page,
      current: current.get(page) ?? metric(),
      previous: previous.get(page) ?? metric(),
    }));
}

function mergeQueryPages(currentRows: GscRow[], previousRows: GscRow[]): QueryPagePeriodRow[] {
  const keyOf = (row: GscRow) => `${row.keys?.[0] ?? ""}\u0000${row.keys?.[1] ?? ""}`;
  const current = new Map(currentRows.map((row) => [keyOf(row), row]));
  const previous = new Map(previousRows.map((row) => [keyOf(row), row]));
  const keys = new Set([...current.keys(), ...previous.keys()]);

  return [...keys]
    .map((key) => {
      const currentRow = current.get(key);
      const previousRow = previous.get(key);
      const row = currentRow ?? previousRow;
      const query = row?.keys?.[0] ?? "";
      const page = row?.keys?.[1] ?? "";
      return {
        query,
        page,
        current: metric(currentRow),
        previous: metric(previousRow),
      };
    })
    .filter((row) => row.query && row.page);
}

function breakdown(rows: GscRow[]): BreakdownItem[] {
  return rows.map((row) => ({ key: row.keys?.[0] ?? "unknown", ...metric(row) }));
}

export async function listSites(accessToken: string) {
  const response = await fetch("https://www.googleapis.com/webmasters/v3/sites", {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Search Console sites API ${response.status}: ${text.slice(0, 300)}`);
  }

  const data = (await response.json()) as {
    siteEntry?: Array<{ siteUrl: string; permissionLevel: string }>;
  };

  return (data.siteEntry ?? []).sort((a, b) => a.siteUrl.localeCompare(b.siteUrl));
}

export async function loadSearchConsoleAnalytics(
  accessToken: string,
  siteUrl: string,
  days: number,
): Promise<AnalyticsPayload> {
  const period = getComparisonPeriod(days);
  const currentBase = { startDate: period.currentStart, endDate: period.currentEnd, type: "web" };
  const previousBase = { startDate: period.previousStart, endDate: period.previousEnd, type: "web" };

  const [
    currentTotalResp,
    previousTotalResp,
    currentPages,
    previousPages,
    currentQueryPages,
    previousQueryPages,
    trendRows,
    deviceRows,
    countryRows,
  ] = await Promise.all([
    queryGsc(accessToken, siteUrl, currentBase),
    queryGsc(accessToken, siteUrl, previousBase),
    queryAllRows(accessToken, siteUrl, { ...currentBase, dimensions: ["page"] }),
    queryAllRows(accessToken, siteUrl, { ...previousBase, dimensions: ["page"] }),
    queryAllRows(accessToken, siteUrl, { ...currentBase, dimensions: ["query", "page"] }, 50000),
    queryAllRows(accessToken, siteUrl, { ...previousBase, dimensions: ["query", "page"] }, 50000),
    queryAllRows(accessToken, siteUrl, { ...currentBase, dimensions: ["date"] }, 25000),
    queryAllRows(accessToken, siteUrl, { ...currentBase, dimensions: ["device"] }, 25000),
    queryAllRows(accessToken, siteUrl, { ...currentBase, dimensions: ["country"] }, 25000),
  ]);

  const trend: TrendPoint[] = trendRows.map((row) => ({
    date: row.keys?.[0] ?? "",
    ...metric(row),
  }));

  return buildAnalyticsPayload({
    mode: "gsc",
    site: siteUrl,
    days: period.days,
    period,
    currentTotal: metric(currentTotalResp.rows?.[0]),
    previousTotal: metric(previousTotalResp.rows?.[0]),
    pages: mergePages(currentPages, previousPages),
    queryPages: mergeQueryPages(currentQueryPages, previousQueryPages),
    trend,
    devices: breakdown(deviceRows),
    countries: breakdown(countryRows).slice(0, 20),
    limitations: [
      "Search Console API może zwracać głównie najważniejsze wiersze i nie gwarantuje kompletnego eksportu wszystkich danych.",
      "Opportunity Score jest autorskim priorytetyzatorem SearchLift, a nie metryką Google.",
      "Estimated click gain to model oparty na benchmarkowym CTR i docelowej pozycji, nie prognoza gwarantowanego ruchu.",
    ],
  });
}

function attentionForSummary(current: Metric, previous: Metric) {
  const summary = buildSummary(current, previous);
  let score = 0;
  const reasons: string[] = [];

  if (!summary.comparisonAvailable) {
    return { score: 20, reason: "Not enough previous-period data yet" };
  }

  if (summary.clicksChangePct <= -30) {
    score += 50;
    reasons.push(`clicks ${summary.clicksChangePct}%`);
  } else if (summary.clicksChangePct <= -15) {
    score += 35;
    reasons.push(`clicks ${summary.clicksChangePct}%`);
  } else if (summary.clicksChangePct < 0) {
    score += 15;
    reasons.push(`clicks ${summary.clicksChangePct}%`);
  }

  if (summary.positionChange >= 2) {
    score += 30;
    reasons.push(`position +${summary.positionChange}`);
  } else if (summary.positionChange >= 1) {
    score += 15;
    reasons.push(`position +${summary.positionChange}`);
  }

  if (current.impressions >= 5000 && current.ctr < 0.015) {
    score += 15;
    reasons.push("low CTR at meaningful volume");
  }

  return {
    score: Math.min(100, Math.round(score)),
    reason: reasons.length ? reasons.join(" · ") : "stable / no urgent signal",
  };
}

export async function loadSitePortfolio(
  accessToken: string,
  days: number,
  maxSites = 8,
): Promise<SitePortfolioPayload> {
  const period = getComparisonPeriod(days);
  const sites = await listSites(accessToken);
  const selected = sites.slice(0, maxSites);

  const rows: SitePortfolioItem[] = await Promise.all(
    selected.map(async (entry) => {
      const [currentResp, previousResp] = await Promise.all([
        queryGsc(accessToken, entry.siteUrl, {
          startDate: period.currentStart,
          endDate: period.currentEnd,
          type: "web",
        }),
        queryGsc(accessToken, entry.siteUrl, {
          startDate: period.previousStart,
          endDate: period.previousEnd,
          type: "web",
        }),
      ]);
      const current = metric(currentResp.rows?.[0]);
      const previous = metric(previousResp.rows?.[0]);
      const summary = buildSummary(current, previous);
      const attention = attentionForSummary(current, previous);
      return {
        site: entry.siteUrl,
        permissionLevel: entry.permissionLevel,
        current,
        previous,
        clicksChangePct: summary.clicksChangePct,
        impressionsChangePct: summary.impressionsChangePct,
        positionChange: summary.positionChange,
        comparisonAvailable: summary.comparisonAvailable,
        attentionScore: attention.score,
        attentionReason: attention.reason,
      };
    }),
  );

  return {
    days: period.days,
    generatedAt: new Date().toISOString(),
    sites: rows.sort((a, b) => b.attentionScore - a.attentionScore || b.current.clicks - a.current.clicks),
    truncated: sites.length > selected.length,
  };
}

function iso(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function utcDate(value: string) {
  const parsed = new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) throw new Error("Nieprawidłowa data optymalizacji.");
  return parsed;
}

function inclusiveDays(start: Date, end: Date) {
  return Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
}

export async function loadPageExperiment(
  accessToken: string,
  siteUrl: string,
  pageUrl: string,
  optimizedAt: string,
  requestedDays: number,
): Promise<PageExperimentResult> {
  const safeDays = requestedDays === 28 ? 28 : requestedDays === 14 ? 14 : 7;
  const optimized = utcDate(optimizedAt);
  const finalEnd = addDays(new Date(), -3);
  finalEnd.setUTCHours(0, 0, 0, 0);

  const available = Math.max(0, Math.min(safeDays, inclusiveDays(optimized, finalEnd)));
  if (available <= 0) {
    return {
      site: siteUrl,
      page: pageUrl,
      optimizedAt: iso(optimized),
      requestedDays: safeDays,
      availableDays: 0,
      status: "collecting",
      before: metric(),
      after: metric(),
      clickChangePct: 0,
      ctrChangePct: 0,
      positionChange: 0,
    };
  }

  const afterStart = optimized;
  const afterEnd = addDays(afterStart, available - 1);
  const beforeEnd = addDays(afterStart, -1);
  const beforeStart = addDays(beforeEnd, -(available - 1));
  const filter = {
    dimensionFilterGroups: [
      {
        filters: [{ dimension: "page", operator: "equals", expression: pageUrl }],
      },
    ],
  };

  const [beforeResp, afterResp] = await Promise.all([
    queryGsc(accessToken, siteUrl, {
      startDate: iso(beforeStart),
      endDate: iso(beforeEnd),
      type: "web",
      ...filter,
    }),
    queryGsc(accessToken, siteUrl, {
      startDate: iso(afterStart),
      endDate: iso(afterEnd),
      type: "web",
      ...filter,
    }),
  ]);

  const before = metric(beforeResp.rows?.[0]);
  const after = metric(afterResp.rows?.[0]);
  const summary = buildSummary(after, before);

  return {
    site: siteUrl,
    page: pageUrl,
    optimizedAt: iso(optimized),
    requestedDays: safeDays,
    availableDays: available,
    status: available >= safeDays ? "ready" : "collecting",
    before,
    after,
    clickChangePct: summary.clicksChangePct,
    ctrChangePct: summary.ctrChangePct,
    positionChange: summary.positionChange,
  };
}
