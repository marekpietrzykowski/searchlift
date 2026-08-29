import type {
  ActionPlanItem,
  AnalyticsPayload,
  BreakdownItem,
  Cannibalization,
  DataQuality,
  LostQuery,
  Metric,
  Opportunity,
  OpportunityLabel,
  PagePeriodRow,
  QueryInsight,
  QueryPagePeriodRow,
  SeoBrief,
  Summary,
  TrendPoint,
} from "./types";

function safePctChange(current: number, previous: number): number {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}

function round(value: number, digits = 1): number {
  const p = 10 ** digits;
  return Math.round(value * p) / p;
}

export function expectedCtrForPosition(position: number): number {
  if (position <= 1.5) return 0.28;
  if (position <= 2.5) return 0.16;
  if (position <= 3.5) return 0.11;
  if (position <= 4.5) return 0.08;
  if (position <= 5.5) return 0.065;
  if (position <= 6.5) return 0.052;
  if (position <= 7.5) return 0.044;
  if (position <= 8.5) return 0.038;
  if (position <= 9.5) return 0.033;
  if (position <= 10.5) return 0.029;
  if (position <= 15) return 0.021;
  if (position <= 20) return 0.016;
  if (position <= 30) return 0.011;
  return 0.008;
}

function targetPositionFor(currentPosition: number): number {
  if (currentPosition <= 3) return Math.max(1, currentPosition);
  if (currentPosition <= 6) return 3;
  if (currentPosition <= 10) return 5;
  if (currentPosition <= 20) return 10;
  if (currentPosition <= 30) return 15;
  return 20;
}

function opportunityConfidence(metric: Metric): Opportunity["confidence"] {
  if (metric.impressions >= 5000 && metric.clicks >= 75) return "high";
  if (metric.impressions >= 750 && metric.clicks >= 10) return "medium";
  return "low";
}

function recommendation(labels: OpportunityLabel[], confidence: Opportunity["confidence"]): string {
  if (confidence === "low") {
    return "Collect more data before making a major change. With a small sample, the score and estimates should be treated as directional.";
  }

  if (labels.includes("Content decay")) {
    return "Review lost queries, refresh sections that match search intent, and compare the page with the current SERP.";
  }

  if (labels.includes("Low CTR")) {
    return "Test the title and meta description against the actual SERP intent. Improve CTR before making risky content changes.";
  }

  if (labels.includes("Quick win")) {
    return "Strengthen query-to-content relevance, internal linking, and key sections that could move the page a few positions higher.";
  }

  if (labels.includes("Rising")) {
    return "This content is gaining traction. Expand it carefully, add internal links, and protect the topic from cannibalization.";
  }

  return "Monitor the trend and collect more data before making a major change.";
}

function lostQueriesForPage(page: string, rows: QueryPagePeriodRow[]): LostQuery[] {
  return rows
    .filter((row) => row.page === page && (row.previous.clicks > 0 || row.previous.impressions > 0))
    .map((row) => ({
      query: row.query,
      currentClicks: row.current.clicks,
      previousClicks: row.previous.clicks,
      clickDelta: row.current.clicks - row.previous.clicks,
      currentPosition: row.current.position,
      previousPosition: row.previous.position,
      positionDelta:
        row.previous.position > 0 && row.current.position > 0
          ? round(row.current.position - row.previous.position)
          : 0,
    }))
    .filter((row) => row.clickDelta < 0 || row.positionDelta >= 1)
    .sort((a, b) => a.clickDelta - b.clickDelta || b.positionDelta - a.positionDelta)
    .slice(0, 6);
}

export function calculateOpportunity(
  row: PagePeriodRow,
  queryPages: QueryPagePeriodRow[] = [],
): Opportunity {
  const { current, previous } = row;
  const hasPrevious = previous.impressions > 0 || previous.clicks > 0;
  const clickChangePct = hasPrevious ? safePctChange(current.clicks, previous.clicks) : 0;
  const impressionChangePct = hasPrevious ? safePctChange(current.impressions, previous.impressions) : 0;
  const positionChange = hasPrevious && previous.position > 0 ? current.position - previous.position : 0;
  const expectedCtr = expectedCtrForPosition(current.position);
  const ctrGapPct = expectedCtr > 0 ? ((expectedCtr - current.ctr) / expectedCtr) * 100 : 0;

  const targetPosition = targetPositionFor(current.position);
  const targetCtr = expectedCtrForPosition(targetPosition);
  const potentialClicks = Math.max(0, Math.round(current.impressions * targetCtr - current.clicks));
  const confidence = opportunityConfidence(current);

  let score = 0;

  if (current.position >= 4 && current.position <= 10) score += 32;
  else if (current.position > 10 && current.position <= 20) score += 24;
  else if (current.position > 20 && current.position <= 30) score += 10;
  else if (current.position > 1 && current.position < 4) score += 16;

  if (current.impressions >= 25000) score += 24;
  else if (current.impressions >= 10000) score += 20;
  else if (current.impressions >= 5000) score += 15;
  else if (current.impressions >= 1000) score += 9;
  else if (current.impressions >= 250) score += 4;

  if (ctrGapPct >= 60) score += 24;
  else if (ctrGapPct >= 35) score += 18;
  else if (ctrGapPct >= 15) score += 10;

  if (hasPrevious) {
    if (clickChangePct <= -30) score += 20;
    else if (clickChangePct <= -15) score += 14;
    else if (clickChangePct < 0) score += 6;

    if (positionChange >= 2) score += 8;
    else if (positionChange >= 1) score += 4;
  }

  if (potentialClicks >= 500) score += 8;
  else if (potentialClicks >= 150) score += 5;
  else if (potentialClicks >= 50) score += 2;

  // Guardrail: tiny samples should never look like high-confidence business advice.
  if (confidence === "low") score = Math.min(score, 39);
  else if (confidence === "medium") score = Math.min(score, 79);
  score = Math.min(100, Math.round(score));

  const labels: OpportunityLabel[] = [];
  if (score >= 75 && confidence !== "low") labels.push("High impact");
  if (
    confidence !== "low" &&
    current.position >= 4 &&
    current.position <= 15 &&
    current.impressions >= 1000 &&
    potentialClicks >= 20
  ) {
    labels.push("Quick win");
  }
  if (
    hasPrevious &&
    confidence !== "low" &&
    (clickChangePct <= -15 || positionChange >= 1.5)
  ) {
    labels.push("Content decay");
  }
  if (
    confidence !== "low" &&
    current.impressions >= 500 &&
    current.ctr < expectedCtr * 0.65 &&
    current.position <= 15
  ) {
    labels.push("Low CTR");
  }
  if (
    hasPrevious &&
    confidence !== "low" &&
    (clickChangePct >= 20 || positionChange <= -1.5)
  ) {
    labels.push("Rising");
  }
  if (labels.length === 0) labels.push("Monitor");

  const reasons: string[] = [];
  if (confidence === "low") {
    reasons.push(`Niska próba danych: ${Math.round(current.impressions).toLocaleString("pl-PL")} wyświetleń.`);
  }
  if (current.position >= 4 && current.position <= 15) {
    reasons.push(`Pozycja ${round(current.position)} jest w zasięgu realnego wzrostu bez budowania widoczności od zera.`);
  }
  if (ctrGapPct >= 20 && current.impressions >= 250) {
    reasons.push(`CTR jest ok. ${Math.max(0, Math.round(ctrGapPct))}% poniżej benchmarku dla obecnej pozycji.`);
  }
  if (hasPrevious && clickChangePct <= -10) {
    reasons.push(`Kliknięcia spadły o ${Math.abs(round(clickChangePct))}% vs poprzedni okres.`);
  }
  if (current.impressions >= 5000) {
    reasons.push(`Duży wolumen: ${Math.round(current.impressions).toLocaleString("pl-PL")} wyświetleń.`);
  }
  if (potentialClicks > 0 && confidence !== "low") {
    reasons.push(
      `Modelowany upside: ok. +${potentialClicks.toLocaleString("pl-PL")} kliknięć przy dojściu w okolice pozycji ${targetPosition.toFixed(1)} i benchmarkowego CTR.`,
    );
  }

  return {
    id: encodeURIComponent(row.page),
    page: row.page,
    score,
    confidence,
    labels,
    current,
    previous,
    clickChangePct: round(clickChangePct),
    impressionChangePct: round(impressionChangePct),
    positionChange: round(positionChange),
    ctrGapPct: round(ctrGapPct),
    expectedCtr,
    targetPosition,
    targetCtr,
    potentialClicks,
    reasons,
    recommendation: recommendation(labels, confidence),
    lostQueries: lostQueriesForPage(row.page, queryPages),
  };
}

function aggregateMetric(metrics: Metric[]): Metric {
  const clicks = metrics.reduce((sum, item) => sum + item.clicks, 0);
  const impressions = metrics.reduce((sum, item) => sum + item.impressions, 0);
  const ctr = impressions > 0 ? clicks / impressions : 0;
  const positionWeight = metrics.reduce(
    (sum, item) => sum + item.position * Math.max(item.impressions, 1),
    0,
  );
  const position =
    impressions > 0
      ? positionWeight / impressions
      : metrics.length > 0
        ? metrics.reduce((sum, item) => sum + item.position, 0) / metrics.length
        : 0;
  return { clicks, impressions, ctr, position };
}

export function buildQueryInsights(rows: QueryPagePeriodRow[]): QueryInsight[] {
  const groups = new Map<string, QueryPagePeriodRow[]>();
  for (const row of rows) {
    const list = groups.get(row.query) ?? [];
    list.push(row);
    groups.set(row.query, list);
  }

  const insights: QueryInsight[] = [];
  for (const [query, items] of groups) {
    const current = aggregateMetric(items.map((item) => item.current));
    const previous = aggregateMetric(items.map((item) => item.previous));
    const pages = [...new Set(items.map((item) => item.page))];
    const top = [...items].sort((a, b) => b.current.clicks - a.current.clicks)[0];
    const targetPosition = targetPositionFor(current.position);
    const targetCtr = expectedCtrForPosition(targetPosition);
    const hasPrevious = previous.impressions > 0 || previous.clicks > 0;

    insights.push({
      query,
      current,
      previous,
      clickChangePct: hasPrevious ? round(safePctChange(current.clicks, previous.clicks)) : 0,
      positionChange:
        hasPrevious && previous.position > 0 ? round(current.position - previous.position) : 0,
      pages,
      topPage: top?.page ?? "",
      potentialClicks: Math.max(0, Math.round(current.impressions * targetCtr - current.clicks)),
      enteredTop10:
        hasPrevious && current.position > 0 && current.position <= 10 && previous.position > 10,
      lostTop10:
        hasPrevious && previous.position > 0 && previous.position <= 10 && current.position > 10,
      isNew: !hasPrevious && current.impressions > 0,
    });
  }

  return insights.sort((a, b) => b.current.impressions - a.current.impressions);
}

export function detectCannibalization(rows: QueryPagePeriodRow[]): Cannibalization[] {
  const groups = new Map<string, QueryPagePeriodRow[]>();
  for (const row of rows) {
    const list = groups.get(row.query) ?? [];
    list.push(row);
    groups.set(row.query, list);
  }

  const output: Cannibalization[] = [];
  for (const [query, items] of groups) {
    const active = items
      .filter((item) => item.current.impressions >= 50)
      .sort((a, b) => b.current.impressions - a.current.impressions);
    const uniquePages = [...new Set(active.map((item) => item.page))];
    if (uniquePages.length < 2) continue;

    const topPages = active.slice(0, 4).map((item) => ({ page: item.page, ...item.current }));
    const totalImpressions = topPages.reduce((sum, page) => sum + page.impressions, 0);
    const totalClicks = topPages.reduce((sum, page) => sum + page.clicks, 0);
    if (totalImpressions < 300) continue;

    const secondShare = topPages[1] ? topPages[1].impressions / totalImpressions : 0;
    const severity: Cannibalization["severity"] =
      totalImpressions >= 5000 && secondShare >= 0.25
        ? "high"
        : totalImpressions >= 1500
          ? "medium"
          : "low";

    output.push({ query, totalClicks, totalImpressions, pages: topPages, severity });
  }

  return output.sort((a, b) => b.totalImpressions - a.totalImpressions).slice(0, 30);
}

export function buildSummary(current: Metric, previous: Metric): Summary {
  const comparisonAvailable = previous.impressions > 0 || previous.clicks > 0;
  return {
    ...current,
    clicksChangePct: comparisonAvailable ? round(safePctChange(current.clicks, previous.clicks)) : 0,
    impressionsChangePct: comparisonAvailable
      ? round(safePctChange(current.impressions, previous.impressions))
      : 0,
    ctrChangePct:
      comparisonAvailable && previous.ctr > 0 ? round(safePctChange(current.ctr, previous.ctr)) : 0,
    positionChange:
      comparisonAvailable && previous.position > 0 ? round(current.position - previous.position) : 0,
    comparisonAvailable,
  };
}

function buildDataQuality(input: {
  trend: TrendPoint[];
  days: number;
  currentTotal: Metric;
  previousTotal: Metric;
  pages: PagePeriodRow[];
  queryPages: QueryPagePeriodRow[];
}): DataQuality {
  const observedDays = new Set(
    input.trend
      .filter((point) => point.clicks > 0 || point.impressions > 0)
      .map((point) => point.date),
  ).size;
  const coveragePct = Math.min(100, Math.round((observedDays / Math.max(input.days, 1)) * 100));
  const hasPreviousData = input.previousTotal.impressions > 0 || input.previousTotal.clicks > 0;

  let score = 0;
  score += Math.min(40, coveragePct * 0.4);
  if (input.currentTotal.impressions >= 10000) score += 30;
  else if (input.currentTotal.impressions >= 2000) score += 22;
  else if (input.currentTotal.impressions >= 500) score += 14;
  else if (input.currentTotal.impressions >= 100) score += 8;

  if (input.currentTotal.clicks >= 100) score += 15;
  else if (input.currentTotal.clicks >= 20) score += 10;
  else if (input.currentTotal.clicks >= 5) score += 5;
  if (hasPreviousData) score += 15;
  score = Math.min(100, Math.round(score));

  const warnings: string[] = [];
  if (coveragePct < 50) warnings.push(`Dane obejmują tylko ${observedDays} z ${input.days} dni.`);
  if (input.currentTotal.impressions < 500)
    warnings.push("Mała liczba wyświetleń — opportunity score ma niską pewność.");
  if (!hasPreviousData)
    warnings.push("Brak danych z poprzedniego okresu — trendy i content decay są jeszcze niewiarygodne.");
  if (input.pages.length < 3)
    warnings.push("Mało stron z danymi — ranking priorytetów będzie ograniczony.");

  const level: DataQuality["level"] = score >= 70 ? "high" : score >= 40 ? "medium" : "low";
  return {
    level,
    score,
    observedDays,
    requestedDays: input.days,
    coveragePct,
    hasPreviousData,
    pageCount: input.pages.length,
    queryCount: new Set(input.queryPages.map((row) => row.query)).size,
    warnings,
  };
}

function buildActionPlan(
  opportunities: Opportunity[],
  cannibalizations: Cannibalization[],
): ActionPlanItem[] {
  const items: ActionPlanItem[] = [];

  for (const row of opportunities) {
    if (row.confidence === "low") continue;

    let kind: ActionPlanItem["kind"] | null = null;
    let title = "";
    let effort: ActionPlanItem["effort"] = "medium";

    if (row.labels.includes("Content decay")) {
      kind = "decay";
      title = "Recover declining organic traffic";
      effort = "medium";
    } else if (row.labels.includes("Low CTR")) {
      kind = "ctr";
      title = "Improve SERP click-through rate";
      effort = "low";
    } else if (row.labels.includes("Quick win")) {
      kind = "quick-win";
      title = "Push a near-ranking page higher";
      effort = "medium";
    } else if (row.labels.includes("Rising")) {
      kind = "growth";
      title = "Double down on a rising page";
      effort = "medium";
    }

    if (!kind) continue;
    const impact: ActionPlanItem["impact"] =
      row.score >= 75 ? "high" : row.score >= 55 ? "medium" : "low";

    items.push({
      id: `page:${row.id}:${kind}`,
      kind,
      priority: row.score,
      impact,
      effort,
      title,
      description: row.recommendation,
      target: row.page,
      potentialClicks: row.potentialClicks,
    });
  }

  for (const row of cannibalizations) {
    items.push({
      id: `query:${encodeURIComponent(row.query)}`,
      kind: "cannibalization",
      priority: row.severity === "high" ? 88 : row.severity === "medium" ? 68 : 48,
      impact: row.severity === "high" ? "high" : row.severity === "medium" ? "medium" : "low",
      effort: "high",
      title: "Review competing landing pages",
      description: `${row.pages.length} URLs rank for the same query. Compare intent, internal links and whether consolidation is justified.`,
      target: row.query,
      potentialClicks: 0,
    });
  }

  return items
    .sort((a, b) => b.priority - a.priority || b.potentialClicks - a.potentialClicks)
    .slice(0, 20);
}

function buildSeoBrief(
  pages: Opportunity[],
  queries: QueryInsight[],
  actionPlan: ActionPlanItem[],
): SeoBrief {
  const comparable = pages.filter(
    (page) => page.previous.clicks > 0 || page.previous.impressions > 0,
  );

  const withDelta = comparable.map((page) => ({
    page: page.page,
    clickChangePct: page.clickChangePct,
    clickDelta: page.current.clicks - page.previous.clicks,
  }));

  const biggestWin = [...withDelta].sort((a, b) => b.clickDelta - a.clickDelta)[0];
  const biggestLoss = [...withDelta].sort((a, b) => a.clickDelta - b.clickDelta)[0];

  return {
    biggestWin: biggestWin && biggestWin.clickDelta > 0 ? biggestWin : undefined,
    biggestLoss: biggestLoss && biggestLoss.clickDelta < 0 ? biggestLoss : undefined,
    enteredTop10: queries.filter((query) => query.enteredTop10).length,
    lostTop10: queries.filter((query) => query.lostTop10).length,
    newQueries: queries.filter((query) => query.isNew).length,
    decliningQueries: queries.filter((query) => query.clickChangePct <= -15).length,
    topPriority: actionPlan[0],
  };
}

export function buildAnalyticsPayload(input: {
  mode: "demo" | "gsc";
  site: string;
  days: number;
  period: AnalyticsPayload["period"];
  currentTotal: Metric;
  previousTotal: Metric;
  pages: PagePeriodRow[];
  queryPages: QueryPagePeriodRow[];
  trend: TrendPoint[];
  devices: BreakdownItem[];
  countries: BreakdownItem[];
  limitations?: string[];
}): AnalyticsPayload {
  const pages = input.pages
    .map((row) => calculateOpportunity(row, input.queryPages))
    .sort((a, b) => b.score - a.score || b.current.impressions - a.current.impressions);
  const dataQuality = buildDataQuality(input);
  const queries = buildQueryInsights(input.queryPages);
  const cannibalizations = detectCannibalization(input.queryPages);
  const actionPlan = buildActionPlan(pages, cannibalizations);
  const brief = buildSeoBrief(pages, queries, actionPlan);

  return {
    mode: input.mode,
    site: input.site,
    generatedAt: new Date().toISOString(),
    days: input.days,
    period: input.period,
    summary: buildSummary(input.currentTotal, input.previousTotal),
    dataQuality,
    trend: input.trend,
    opportunities: pages.filter((page) => page.score >= 35).slice(0, 50),
    pages,
    queries,
    cannibalizations,
    actionPlan,
    brief,
    devices: input.devices,
    countries: input.countries,
    limitations: input.limitations,
  };
}
