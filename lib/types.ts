export type Metric = {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type PeriodMetric = {
  current: Metric;
  previous: Metric;
};

export type PagePeriodRow = PeriodMetric & {
  page: string;
};

export type QueryPagePeriodRow = PeriodMetric & {
  query: string;
  page: string;
};

export type TrendPoint = {
  date: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type BreakdownItem = {
  key: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type OpportunityLabel =
  | "High impact"
  | "Quick win"
  | "Content decay"
  | "Low CTR"
  | "Rising"
  | "Monitor";

export type LostQuery = {
  query: string;
  currentClicks: number;
  previousClicks: number;
  clickDelta: number;
  currentPosition: number;
  previousPosition: number;
  positionDelta: number;
};

export type Opportunity = {
  id: string;
  page: string;
  score: number;
  confidence: "low" | "medium" | "high";
  labels: OpportunityLabel[];
  current: Metric;
  previous: Metric;
  clickChangePct: number;
  impressionChangePct: number;
  positionChange: number;
  ctrGapPct: number;
  expectedCtr: number;
  targetPosition: number;
  targetCtr: number;
  potentialClicks: number;
  reasons: string[];
  recommendation: string;
  lostQueries: LostQuery[];
};

export type PageInsight = Opportunity;

export type QueryInsight = {
  query: string;
  current: Metric;
  previous: Metric;
  clickChangePct: number;
  positionChange: number;
  pages: string[];
  topPage: string;
  potentialClicks: number;
  enteredTop10: boolean;
  lostTop10: boolean;
  isNew: boolean;
};

export type Cannibalization = {
  query: string;
  totalClicks: number;
  totalImpressions: number;
  pages: Array<{
    page: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }>;
  severity: "high" | "medium" | "low";
};

export type Summary = Metric & {
  clicksChangePct: number;
  impressionsChangePct: number;
  ctrChangePct: number;
  positionChange: number;
  comparisonAvailable: boolean;
};

export type DataQuality = {
  level: "low" | "medium" | "high";
  score: number;
  observedDays: number;
  requestedDays: number;
  coveragePct: number;
  hasPreviousData: boolean;
  pageCount: number;
  queryCount: number;
  warnings: string[];
};

export type ActionPlanItem = {
  id: string;
  kind: "quick-win" | "decay" | "ctr" | "cannibalization" | "growth";
  priority: number;
  impact: "high" | "medium" | "low";
  effort: "low" | "medium" | "high";
  title: string;
  description: string;
  target: string;
  potentialClicks: number;
};

export type SeoBrief = {
  biggestWin?: {
    page: string;
    clickChangePct: number;
    clickDelta: number;
  };
  biggestLoss?: {
    page: string;
    clickChangePct: number;
    clickDelta: number;
  };
  enteredTop10: number;
  lostTop10: number;
  newQueries: number;
  decliningQueries: number;
  topPriority?: ActionPlanItem;
};

export type AnalyticsPayload = {
  mode: "demo" | "gsc";
  site: string;
  generatedAt: string;
  days: number;
  period: {
    currentStart: string;
    currentEnd: string;
    previousStart: string;
    previousEnd: string;
  };
  summary: Summary;
  dataQuality: DataQuality;
  trend: TrendPoint[];
  opportunities: Opportunity[];
  pages: PageInsight[];
  queries: QueryInsight[];
  cannibalizations: Cannibalization[];
  actionPlan: ActionPlanItem[];
  brief: SeoBrief;
  devices: BreakdownItem[];
  countries: BreakdownItem[];
  limitations?: string[];
};

export type SitePortfolioItem = {
  site: string;
  permissionLevel: string;
  current: Metric;
  previous: Metric;
  clicksChangePct: number;
  impressionsChangePct: number;
  positionChange: number;
  comparisonAvailable: boolean;
  attentionScore: number;
  attentionReason: string;
};

export type SitePortfolioPayload = {
  days: number;
  generatedAt: string;
  sites: SitePortfolioItem[];
  truncated: boolean;
};

export type PageExperimentResult = {
  site: string;
  page: string;
  optimizedAt: string;
  requestedDays: number;
  availableDays: number;
  status: "collecting" | "ready";
  before: Metric;
  after: Metric;
  clickChangePct: number;
  ctrChangePct: number;
  positionChange: number;
};

export type TechnicalAudit = {
  url: string;
  finalUrl: string;
  checkedAt: string;
  status: number;
  responseTimeMs: number;
  title: string;
  metaDescription: string;
  h1: string;
  canonical: string;
  indexable: boolean;
  robotsTxt: boolean;
  sitemapXml: boolean;
  issues: Array<{
    level: "error" | "warning" | "info";
    message: string;
  }>;
};
