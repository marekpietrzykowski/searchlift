"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Sparkline } from "./sparkline";
import type {
  AnalyticsPayload,
  Cannibalization,
  Metric,
  Opportunity,
  PageExperimentResult,
  QueryInsight,
  SitePortfolioPayload,
  TechnicalAudit,
} from "@/lib/types";

type Tab =
  | "overview"
  | "sites"
  | "action-plan"
  | "opportunities"
  | "pages"
  | "queries"
  | "cannibalization"
  | "optimizations"
  | "settings";

type SiteEntry = {
  siteUrl: string;
  permissionLevel: string;
};

type TrackedOptimization = {
  id: string;
  page: string;
  site?: string;
  score: number;
  labels: string[];
  createdAt: string;
  optimizedAt?: string;
  status: "todo" | "in-progress" | "done";
  note: string;
  baseline?: Metric;
};

const nf = new Intl.NumberFormat("pl-PL");
const pf = new Intl.NumberFormat("pl-PL", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 2,
});

function fmt(value: number) {
  return nf.format(Math.round(value));
}

function fmtPct(decimal: number) {
  return pf.format(decimal);
}

function changeClass(value: number, inverse = false) {
  const good = inverse ? value <= 0 : value >= 0;
  return good ? "text-emerald-400" : "text-rose-400";
}

function changeText(value: number, suffix = "%") {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value}${suffix}`;
}

function shortUrl(value: string) {
  try {
    const url = new URL(value);
    return `${url.pathname}${url.search}` || "/";
  } catch {
    return value;
  }
}

function hostname(value: string) {
  try {
    if (value.startsWith("sc-domain:")) return value.replace("sc-domain:", "");
    return new URL(value).hostname;
  } catch {
    return value;
  }
}

function labelClass(label: string) {
  if (label === "High impact") return "border-rose-500/30 bg-rose-500/10 text-rose-300";
  if (label === "Quick win") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  if (label === "Content decay") return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  if (label === "Low CTR") return "border-sky-500/30 bg-sky-500/10 text-sky-300";
  if (label === "Rising") return "border-violet-500/30 bg-violet-500/10 text-violet-300";
  return "border-zinc-700 bg-zinc-800 text-zinc-300";
}

function confidenceClass(value: Opportunity["confidence"]) {
  if (value === "high") return "text-emerald-300";
  if (value === "medium") return "text-amber-300";
  return "text-zinc-500";
}

function MetricCard({
  label,
  value,
  change,
  inverse,
  helper,
  comparisonAvailable = true,
}: {
  label: string;
  value: string;
  change: number;
  inverse?: boolean;
  helper?: string;
  comparisonAvailable?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 shadow-[0_12px_50px_rgba(0,0,0,.22)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-zinc-500">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-zinc-50">{value}</p>
        </div>
        <span
          className={`mt-8 text-sm font-semibold ${
            comparisonAvailable ? changeClass(change, inverse) : "text-sky-300"
          }`}
        >
          {comparisonAvailable
            ? changeText(change, label === "Average position" ? "" : "%")
            : "NEW"}
        </span>
      </div>
      {helper ? <p className="mt-3 text-xs text-zinc-600">{helper}</p> : null}
    </div>
  );
}

function SectionTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-xl font-semibold text-zinc-100">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-zinc-500">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

function Score({ value }: { value: number }) {
  const cls =
    value >= 75
      ? "bg-emerald-400/15 text-emerald-300"
      : value >= 55
        ? "bg-amber-400/15 text-amber-300"
        : "bg-zinc-800 text-zinc-300";
  return (
    <span className={`inline-flex min-w-12 justify-center rounded-lg px-2.5 py-1.5 text-sm font-bold ${cls}`}>
      {value}
    </span>
  );
}

function QualityCard({ data }: { data: AnalyticsPayload }) {
  const q = data.dataQuality;
  const levelClass =
    q.level === "high"
      ? "border-emerald-500/25 bg-emerald-500/5"
      : q.level === "medium"
        ? "border-amber-500/25 bg-amber-500/5"
        : "border-rose-500/25 bg-rose-500/5";
  return (
    <div className={`rounded-2xl border p-5 ${levelClass}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.18em] text-zinc-500">Data confidence</p>
          <div className="mt-2 flex items-baseline gap-3">
            <span className="text-3xl font-semibold">{q.score}/100</span>
            <span className="text-sm uppercase text-zinc-500">{q.level}</span>
          </div>
        </div>
        <div className="text-right text-sm text-zinc-500">
          <p>{q.observedDays}/{q.requestedDays} days covered</p>
          <p>{q.queryCount} queries · {q.pageCount} pages</p>
        </div>
      </div>
      {q.warnings.length ? (
        <div className="mt-4 grid gap-2">
          {q.warnings.map((warning) => (
            <p key={warning} className="rounded-lg bg-black/20 px-3 py-2 text-xs leading-5 text-zinc-400">
              {warning}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function MiniMetric({ label, value, secondary }: { label: string; value: string; secondary?: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/55 p-3">
      <p className="text-xs text-zinc-600">{label}</p>
      <p className="mt-1 text-lg font-semibold text-zinc-100">{value}</p>
      {secondary ? <p className="mt-1 text-xs text-zinc-600">{secondary}</p> : null}
    </div>
  );
}

function TechnicalAuditPanel({ url }: { url: string }) {
  const [audit, setAudit] = useState<TechnicalAudit | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const isPublicUrl = /^https?:\/\//i.test(url);

  const run = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/audit/page?url=${encodeURIComponent(url)}`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Technical audit failed");
      setAudit(body as TechnicalAudit);
    } catch (errorValue) {
      setError(errorValue instanceof Error ? errorValue.message : "Technical audit failed");
    } finally {
      setLoading(false);
    }
  };

  if (!isPublicUrl) {
    return <p className="text-xs text-zinc-600">Technical check is available for live GSC URLs.</p>;
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/45 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="font-medium text-zinc-200">Technical context</h4>
          <p className="mt-1 text-xs text-zinc-600">On-demand server check with SSRF guardrails.</p>
        </div>
        <button
          onClick={run}
          disabled={loading}
          className="rounded-xl border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:border-emerald-500/50 disabled:opacity-50"
        >
          {loading ? "Checking…" : audit ? "Run again" : "Run technical check"}
        </button>
      </div>
      {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
      {audit ? (
        <div className="mt-4 grid gap-3">
          <div className="grid gap-3 sm:grid-cols-4">
            <MiniMetric label="HTTP" value={String(audit.status)} />
            <MiniMetric label="Response" value={`${audit.responseTimeMs} ms`} />
            <MiniMetric label="Indexable" value={audit.indexable ? "Yes" : "No"} />
            <MiniMetric label="Issues" value={String(audit.issues.length)} />
          </div>
          <div className="grid gap-2 text-sm text-zinc-500">
            <p><span className="text-zinc-300">Title:</span> {audit.title || "missing"}</p>
            <p><span className="text-zinc-300">Description:</span> {audit.metaDescription || "missing"}</p>
            <p><span className="text-zinc-300">H1:</span> {audit.h1 || "missing"}</p>
            <p className="break-all"><span className="text-zinc-300">Canonical:</span> {audit.canonical || "missing"}</p>
            <p><span className="text-zinc-300">robots.txt:</span> {audit.robotsTxt ? "found" : "missing"} · <span className="text-zinc-300">sitemap.xml:</span> {audit.sitemapXml ? "found" : "missing"}</p>
          </div>
          {audit.issues.length ? (
            <div className="grid gap-2">
              {audit.issues.map((issue, index) => (
                <p
                  key={`${issue.message}-${index}`}
                  className={`rounded-lg px-3 py-2 text-xs ${
                    issue.level === "error"
                      ? "bg-rose-500/10 text-rose-300"
                      : issue.level === "warning"
                        ? "bg-amber-500/10 text-amber-300"
                        : "bg-sky-500/10 text-sky-300"
                  }`}
                >
                  {issue.message}
                </p>
              ))}
            </div>
          ) : (
            <p className="text-xs text-emerald-300">No obvious technical blockers detected by the lightweight check.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

function OpportunityDetail({
  row,
  onClose,
  onTrack,
}: {
  row: Opportunity;
  onClose: () => void;
  onTrack: (row: Opportunity) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm" onMouseDown={onClose}>
      <div
        className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl scrollbar-thin"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Score value={row.score} />
              <span className={`text-xs font-semibold uppercase ${confidenceClass(row.confidence)}`}>
                {row.confidence} confidence
              </span>
            </div>
            <h3 className="mt-4 break-all text-xl font-semibold">{shortUrl(row.page)}</h3>
            <p className="mt-1 break-all text-xs text-zinc-600">{row.page}</p>
          </div>
          <button onClick={onClose} className="text-sm text-zinc-500 hover:text-zinc-200">Close</button>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {row.labels.map((label) => (
            <span key={label} className={`rounded-full border px-2.5 py-1 text-xs ${labelClass(label)}`}>
              {label}
            </span>
          ))}
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MiniMetric label="Clicks" value={fmt(row.current.clicks)} secondary={`${changeText(row.clickChangePct)} vs prev.`} />
          <MiniMetric label="Impressions" value={fmt(row.current.impressions)} />
          <MiniMetric label="CTR" value={fmtPct(row.current.ctr)} secondary={`benchmark ${fmtPct(row.expectedCtr)}`} />
          <MiniMetric label="Position" value={row.current.position.toFixed(1)} secondary={`target ~${row.targetPosition.toFixed(1)}`} />
        </div>

        <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
          <p className="text-xs font-semibold uppercase tracking-[.18em] text-emerald-300">Estimated click gain</p>
          <p className="mt-2 text-3xl font-semibold text-emerald-200">+{fmt(row.potentialClicks)}</p>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Model assumes movement toward position {row.targetPosition.toFixed(1)} and the benchmark CTR for that zone. This is an estimate, not a Google forecast.
          </p>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
            <h4 className="font-medium">Why SearchLift flagged it</h4>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-zinc-500">
              {row.reasons.map((reason) => <li key={reason}>• {reason}</li>)}
            </ul>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
            <h4 className="font-medium">Suggested action</h4>
            <p className="mt-3 text-sm leading-6 text-zinc-500">{row.recommendation}</p>
            <button
              onClick={() => onTrack(row)}
              className="mt-4 rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-bold text-zinc-950 hover:bg-emerald-300"
            >
              Add to Optimization Tracker
            </button>
          </div>
        </div>

        {row.lostQueries.length ? (
          <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
            <SectionTitle title="Lost-query diagnosis" subtitle="Queries contributing most to decline or position loss on this URL." />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-zinc-600">
                  <tr><th className="pb-3">Query</th><th>Clicks before</th><th>Clicks now</th><th>Δ clicks</th><th>Position</th></tr>
                </thead>
                <tbody>
                  {row.lostQueries.map((item) => (
                    <tr key={item.query} className="border-t border-zinc-800/70">
                      <td className="py-3 pr-4 font-medium text-zinc-300">{item.query}</td>
                      <td>{fmt(item.previousClicks)}</td>
                      <td>{fmt(item.currentClicks)}</td>
                      <td className={item.clickDelta < 0 ? "text-rose-400" : "text-zinc-400"}>{item.clickDelta > 0 ? "+" : ""}{fmt(item.clickDelta)}</td>
                      <td>{item.previousPosition.toFixed(1)} → {item.currentPosition.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        <div className="mt-6">
          <TechnicalAuditPanel url={row.page} />
        </div>
      </div>
    </div>
  );
}

function OpportunityTable({
  rows,
  onTrack,
  onSelect,
  compact = false,
}: {
  rows: Opportunity[];
  onTrack: (row: Opportunity) => void;
  onSelect: (row: Opportunity) => void;
  compact?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/70">
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full min-w-[1050px] text-left text-sm">
          <thead className="border-b border-zinc-800 text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-5 py-4">Score</th><th>Page</th><th>Signals</th><th>Position</th><th>CTR</th><th>Impressions</th><th>Δ clicks</th><th>Est. gain</th><th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.page} className="border-b border-zinc-800/70 last:border-0 hover:bg-zinc-800/25">
                <td className="px-5 py-4"><Score value={row.score} /></td>
                <td className="max-w-[300px] py-4 pr-5">
                  <button onClick={() => onSelect(row)} className="max-w-full truncate text-left font-medium text-zinc-100 hover:text-emerald-300" title={row.page}>{shortUrl(row.page)}</button>
                  <p className={`mt-1 text-xs ${confidenceClass(row.confidence)}`}>{row.confidence} confidence</p>
                </td>
                <td className="py-4 pr-5"><div className="flex max-w-[260px] flex-wrap gap-1.5">{row.labels.slice(0, compact ? 1 : 3).map((label) => <span key={label} className={`rounded-full border px-2 py-0.5 text-[11px] ${labelClass(label)}`}>{label}</span>)}</div></td>
                <td>{row.current.position.toFixed(1)}</td>
                <td>{fmtPct(row.current.ctr)}</td>
                <td>{fmt(row.current.impressions)}</td>
                <td className={row.previous.impressions > 0 || row.previous.clicks > 0 ? changeClass(row.clickChangePct) : "text-sky-300"}>{row.previous.impressions > 0 || row.previous.clicks > 0 ? changeText(row.clickChangePct) : "NEW"}</td>
                <td className="font-semibold text-emerald-300">+{fmt(row.potentialClicks)}</td>
                <td className="pr-5 text-right"><button onClick={() => onTrack(row)} className="rounded-lg border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-300 hover:border-emerald-500/50">Track</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Navigation({ active, onChange }: { active: Tab; onChange: (value: Tab) => void }) {
  const items: Array<{ id: Tab; label: string }> = [
    { id: "overview", label: "Overview" },
    { id: "sites", label: "Sites" },
    { id: "action-plan", label: "Action Plan" },
    { id: "opportunities", label: "Opportunities" },
    { id: "pages", label: "Pages" },
    { id: "queries", label: "Queries" },
    { id: "cannibalization", label: "Cannibalization" },
    { id: "optimizations", label: "Optimizations" },
    { id: "settings", label: "Settings" },
  ];
  return (
    <aside className="border-b border-zinc-800 bg-zinc-950/80 p-4 backdrop-blur lg:min-h-screen lg:w-60 lg:border-b-0 lg:border-r lg:p-5">
      <div className="flex items-center gap-3 lg:mb-8">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-400 font-black text-zinc-950">S</div>
        <div><p className="font-semibold">SearchLift</p><p className="text-xs text-zinc-600">SEO growth workspace</p></div>
      </div>
      <nav className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:mt-0 lg:grid lg:overflow-visible">
        {items.map((item) => (
          <button key={item.id} onClick={() => onChange(item.id)} className={`whitespace-nowrap rounded-xl px-3 py-2.5 text-left text-sm transition ${active === item.id ? "bg-emerald-400/10 text-emerald-300" : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200"}`}>{item.label}</button>
        ))}
      </nav>
    </aside>
  );
}

function FocusNow({ data, onSelect }: { data: AnalyticsPayload; onSelect: (row: Opportunity) => void }) {
  const top = data.opportunities.filter((row) => row.confidence !== "low").slice(0, 3);
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
      <SectionTitle title="What should I work on?" subtitle="Highest-confidence opportunities ranked by likely impact." />
      {top.length ? (
        <div className="grid gap-3">
          {top.map((row, index) => (
            <button key={row.page} onClick={() => onSelect(row)} className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-950/45 p-4 text-left hover:border-emerald-500/35">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-zinc-800 text-sm font-bold text-zinc-400">{index + 1}</div>
              <div className="min-w-0 flex-1"><p className="truncate font-medium text-zinc-200">{shortUrl(row.page)}</p><p className="mt-1 truncate text-xs text-zinc-600">{row.recommendation}</p></div>
              <div className="text-right"><Score value={row.score} /><p className="mt-1 text-xs font-semibold text-emerald-300">+{fmt(row.potentialClicks)} est.</p></div>
            </button>
          ))}
        </div>
      ) : <Empty title="More data needed" text="SearchLift needs a larger Search Console sample before recommending high-confidence actions." />}
    </div>
  );
}

function SeoBriefPanel({ data }: { data: AnalyticsPayload }) {
  const brief = data.brief;
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
      <SectionTitle title="SEO Brief" subtitle="A compact summary of what changed and what deserves attention." />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <MiniMetric label="Queries entered TOP 10" value={fmt(brief.enteredTop10)} />
        <MiniMetric label="Queries lost TOP 10" value={fmt(brief.lostTop10)} />
        <MiniMetric label="New queries" value={fmt(brief.newQueries)} />
        <MiniMetric label="Declining queries" value={fmt(brief.decliningQueries)} />
        <MiniMetric label="Biggest page win" value={brief.biggestWin ? `+${fmt(brief.biggestWin.clickDelta)} clicks` : "—"} secondary={brief.biggestWin ? shortUrl(brief.biggestWin.page) : "No comparable gain"} />
        <MiniMetric label="Biggest page loss" value={brief.biggestLoss ? `${fmt(brief.biggestLoss.clickDelta)} clicks` : "—"} secondary={brief.biggestLoss ? shortUrl(brief.biggestLoss.page) : "No comparable loss"} />
      </div>
      {brief.topPriority ? (
        <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-emerald-300">Top priority</p>
          <p className="mt-2 font-medium text-zinc-200">{brief.topPriority.title}</p>
          <p className="mt-1 break-all text-sm text-zinc-500">{brief.topPriority.target}</p>
        </div>
      ) : null}
    </div>
  );
}

function Overview({ data, onTrack, onSelect }: { data: AnalyticsPayload; onTrack: (row: Opportunity) => void; onSelect: (row: Opportunity) => void }) {
  const highImpact = data.opportunities.filter((o) => o.labels.includes("High impact")).length;
  const decays = data.pages.filter((o) => o.labels.includes("Content decay")).length;
  const rising = data.pages.filter((o) => o.labels.includes("Rising")).length;
  const comparisonAvailable = data.summary.comparisonAvailable;
  return (
    <div className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Organic clicks" value={fmt(data.summary.clicks)} change={data.summary.clicksChangePct} comparisonAvailable={comparisonAvailable} />
        <MetricCard label="Impressions" value={fmt(data.summary.impressions)} change={data.summary.impressionsChangePct} comparisonAvailable={comparisonAvailable} />
        <MetricCard label="Average CTR" value={fmtPct(data.summary.ctr)} change={data.summary.ctrChangePct} comparisonAvailable={comparisonAvailable} />
        <MetricCard label="Average position" value={data.summary.position.toFixed(1)} change={data.summary.positionChange} inverse comparisonAvailable={comparisonAvailable} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MiniMetric label="High-impact opportunities" value={fmt(highImpact)} secondary="Prioritized by score + confidence" />
        <MiniMetric label="Pages losing traffic" value={fmt(decays)} secondary="Content decay signals" />
        <MiniMetric label="Rising pages" value={fmt(rising)} secondary="Momentum worth protecting" />
      </div>

      <QualityCard data={data} />
      <FocusNow data={data} onSelect={onSelect} />
      <SeoBriefPanel data={data} />

      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
          <SectionTitle title="Organic clicks trend" subtitle={`${data.period.currentStart} → ${data.period.currentEnd}`} />
          <Sparkline values={data.trend.map((point) => point.clicks)} />
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
          <SectionTitle title="Traffic by device" subtitle="Current period" />
          <div className="space-y-4">
            {data.devices.map((item) => {
              const total = data.devices.reduce((sum, x) => sum + x.clicks, 0) || 1;
              const share = (item.clicks / total) * 100;
              return <div key={item.key}><div className="mb-1.5 flex justify-between text-sm"><span className="text-zinc-300">{item.key}</span><span className="text-zinc-500">{fmt(item.clicks)} clicks</span></div><div className="h-2 rounded-full bg-zinc-800"><div className="h-2 rounded-full bg-emerald-400" style={{ width: `${Math.max(2, share)}%` }} /></div></div>;
            })}
          </div>
        </div>
      </div>

      <div>
        <SectionTitle title="Top opportunities" subtitle="Score, confidence and modeled upside are transparent and inspectable." />
        <OpportunityTable rows={data.opportunities.slice(0, 8)} onTrack={onTrack} onSelect={onSelect} compact />
      </div>
    </div>
  );
}

function SitesPortfolio({ connected, days, onOpenSite }: { connected: boolean; days: number; onOpenSite: (site: string) => void }) {
  const [data, setData] = useState<SitePortfolioPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!connected) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    fetch(`/api/gsc/portfolio?days=${days}`, { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "Portfolio loading failed");
        if (!cancelled) setData(body as SitePortfolioPayload);
      })
      .catch((errorValue) => {
        if (!cancelled) setError(errorValue instanceof Error ? errorValue.message : "Portfolio loading failed");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [connected, days]);

  if (!connected) return <Empty title="Connect Search Console" text="The Sites view compares multiple verified GSC properties in one place." />;
  if (loading) return <div className="grid min-h-[280px] place-items-center text-sm text-zinc-500">Comparing properties…</div>;
  if (error) return <Empty title="Could not load sites" text={error} />;
  if (!data?.sites.length) return <Empty title="No Search Console properties" text="No verified properties were returned for this Google account." />;

  return (
    <div>
      <SectionTitle title="Site Portfolio" subtitle="Compare properties and surface the sites that need attention first." />
      <div className="grid gap-4">
        {data.sites.map((row) => (
          <button key={row.site} onClick={() => onOpenSite(row.site)} className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 text-left hover:border-emerald-500/35">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div><p className="font-semibold text-zinc-100">{hostname(row.site)}</p><p className="mt-1 text-xs text-zinc-600">{row.permissionLevel}</p></div>
              <div className="text-right"><p className={`text-2xl font-semibold ${row.attentionScore >= 50 ? "text-rose-300" : row.attentionScore >= 25 ? "text-amber-300" : "text-emerald-300"}`}>{row.attentionScore}</p><p className="text-xs text-zinc-600">attention score</p></div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              <MiniMetric label="Clicks" value={fmt(row.current.clicks)} secondary={row.comparisonAvailable ? changeText(row.clicksChangePct) : "NEW"} />
              <MiniMetric label="Impressions" value={fmt(row.current.impressions)} secondary={row.comparisonAvailable ? changeText(row.impressionsChangePct) : "NEW"} />
              <MiniMetric label="CTR" value={fmtPct(row.current.ctr)} />
              <MiniMetric label="Position" value={row.current.position.toFixed(1)} secondary={row.comparisonAvailable ? `Δ ${row.positionChange > 0 ? "+" : ""}${row.positionChange}` : "No comparison"} />
            </div>
            <p className="mt-4 text-xs text-zinc-600">{row.attentionReason}</p>
          </button>
        ))}
      </div>
      {data.truncated ? <p className="mt-4 text-xs text-zinc-600">Showing the first 8 Search Console properties to keep API usage reasonable.</p> : null}
    </div>
  );
}

function ActionPlan({ data, onOpen }: { data: AnalyticsPayload; onOpen: (row: Opportunity) => void }) {
  const [impact, setImpact] = useState("all");
  const rows = data.actionPlan.filter((item) => impact === "all" || item.impact === impact);
  return (
    <div>
      <SectionTitle
        title="Prioritized Action Plan"
        subtitle="A practical queue generated from Search Console signals — impact, effort, confidence and estimated upside."
        action={<select value={impact} onChange={(e) => setImpact(e.target.value)} className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm"><option value="all">All impact</option><option value="high">High impact</option><option value="medium">Medium impact</option><option value="low">Low impact</option></select>}
      />
      {rows.length === 0 ? <Empty title="No reliable actions yet" text="SearchLift needs more Search Console data before it can create a trustworthy plan." /> : (
        <div className="grid gap-4">
          {rows.map((item, index) => {
            const related = data.pages.find((page) => page.page === item.target);
            return (
              <div key={item.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
                <div className="flex flex-wrap items-start gap-4">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-zinc-800 font-bold text-zinc-300">{index + 1}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-zinc-100">{item.title}</h3><span className="rounded-full border border-zinc-700 px-2 py-0.5 text-xs text-zinc-400">{item.kind}</span><span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-xs text-emerald-300">priority {item.priority}</span></div>
                    <p className="mt-2 break-all text-sm text-zinc-400">{item.target}</p>
                    <p className="mt-2 text-sm leading-6 text-zinc-500">{item.description}</p>
                    <div className="mt-4 flex flex-wrap gap-4 text-xs text-zinc-500"><span>Impact: <b className="text-zinc-300">{item.impact}</b></span><span>Effort: <b className="text-zinc-300">{item.effort}</b></span>{item.potentialClicks > 0 ? <span>Estimated upside: <b className="text-emerald-300">+{fmt(item.potentialClicks)} clicks</b></span> : null}</div>
                  </div>
                  {related ? <button onClick={() => onOpen(related)} className="rounded-xl border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:border-emerald-500/50">Inspect</button> : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Opportunities({ data, onTrack, onSelect }: { data: AnalyticsPayload; onTrack: (row: Opportunity) => void; onSelect: (row: Opportunity) => void }) {
  const [filter, setFilter] = useState("All");
  const [needle, setNeedle] = useState("");
  const [sort, setSort] = useState<"score" | "potential" | "impressions">("score");
  const labels = ["All", "High impact", "Quick win", "Content decay", "Low CTR", "Rising", "Monitor"];
  const rows = useMemo(() => {
    return data.opportunities
      .filter((row) => filter === "All" || row.labels.includes(filter as Opportunity["labels"][number]))
      .filter((row) => row.page.toLowerCase().includes(needle.toLowerCase()))
      .sort((a, b) => sort === "potential" ? b.potentialClicks - a.potentialClicks : sort === "impressions" ? b.current.impressions - a.current.impressions : b.score - a.score);
  }, [data.opportunities, filter, needle, sort]);

  return (
    <div>
      <SectionTitle title="SEO Opportunities" subtitle="Filter by signal and sort by score, estimated click gain or search visibility." action={<div className="flex flex-wrap gap-2"><input value={needle} onChange={(e) => setNeedle(e.target.value)} placeholder="Search URL…" className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-emerald-500/50" /><select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm"><option value="score">Sort: score</option><option value="potential">Sort: potential clicks</option><option value="impressions">Sort: impressions</option></select></div>} />
      <div className="mb-4 flex flex-wrap gap-2">{labels.map((label) => <button key={label} onClick={() => setFilter(label)} className={`rounded-full border px-3 py-1.5 text-xs ${filter === label ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : "border-zinc-800 text-zinc-500"}`}>{label}</button>)}</div>
      <OpportunityTable rows={rows} onTrack={onTrack} onSelect={onSelect} />
    </div>
  );
}

function Pages({ data, onSelect }: { data: AnalyticsPayload; onSelect: (row: Opportunity) => void }) {
  const [needle, setNeedle] = useState("");
  const [sort, setSort] = useState<"score" | "clicks" | "impressions" | "position">("score");
  const rows = useMemo(() => data.pages.filter((row) => row.page.toLowerCase().includes(needle.toLowerCase())).sort((a, b) => sort === "clicks" ? b.current.clicks - a.current.clicks : sort === "impressions" ? b.current.impressions - a.current.impressions : sort === "position" ? a.current.position - b.current.position : b.score - a.score), [data.pages, needle, sort]);
  return <div><SectionTitle title="Page Explorer" subtitle="Inspect every landing page returned by Search Console." action={<div className="flex gap-2"><input value={needle} onChange={(e) => setNeedle(e.target.value)} placeholder="Search page…" className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm outline-none" /><select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm"><option value="score">Score</option><option value="clicks">Clicks</option><option value="impressions">Impressions</option><option value="position">Position</option></select></div>} /><div className="grid gap-3">{rows.slice(0, 300).map((row) => <button key={row.page} onClick={() => onSelect(row)} className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 text-left hover:border-emerald-500/35"><div className="flex flex-wrap items-center gap-3"><Score value={row.score} /><span className="min-w-0 flex-1 truncate font-medium text-zinc-200">{shortUrl(row.page)}</span><span className="text-sm text-zinc-500">{fmt(row.current.clicks)} clicks</span><span className="text-sm text-zinc-500">{fmt(row.current.impressions)} imp.</span><span className="text-sm text-zinc-500">pos. {row.current.position.toFixed(1)}</span><span className="text-sm font-medium text-emerald-300">+{fmt(row.potentialClicks)} est.</span></div></button>)}</div></div>;
}

function Queries({ data }: { data: AnalyticsPayload }) {
  const [needle, setNeedle] = useState("");
  const [mode, setMode] = useState<"all" | "potential" | "declining" | "top10" | "new">("all");
  const rows = useMemo(() => data.queries.filter((q) => q.query.toLowerCase().includes(needle.toLowerCase())).filter((q) => mode === "potential" ? q.potentialClicks >= 10 : mode === "declining" ? q.clickChangePct < -10 : mode === "top10" ? q.enteredTop10 : mode === "new" ? q.isNew : true).sort((a, b) => mode === "potential" ? b.potentialClicks - a.potentialClicks : b.current.impressions - a.current.impressions).slice(0, 300), [data.queries, needle, mode]);
  return <div><SectionTitle title="Query Explorer" subtitle="Find rising queries, lost demand and search terms close to a larger click opportunity." action={<div className="flex gap-2"><input value={needle} onChange={(e) => setNeedle(e.target.value)} placeholder="Search query…" className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm outline-none" /><select value={mode} onChange={(e) => setMode(e.target.value as typeof mode)} className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm"><option value="all">All queries</option><option value="potential">High potential</option><option value="declining">Declining</option><option value="top10">Entered TOP 10</option><option value="new">New queries</option></select></div>} /><div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/70"><div className="overflow-x-auto scrollbar-thin"><table className="w-full min-w-[1050px] text-left text-sm"><thead className="border-b border-zinc-800 text-xs uppercase tracking-wide text-zinc-500"><tr><th className="px-5 py-4">Query</th><th>Top page</th><th>Clicks</th><th>Δ clicks</th><th>Impressions</th><th>CTR</th><th>Position</th><th>Potential</th><th>Signal</th></tr></thead><tbody>{rows.map((row) => <QueryRow key={row.query} row={row} />)}</tbody></table></div></div></div>;
}

function QueryRow({ row }: { row: QueryInsight }) {
  const signal = row.enteredTop10 ? "TOP 10 ↑" : row.lostTop10 ? "TOP 10 ↓" : row.isNew ? "NEW" : row.clickChangePct <= -15 ? "DECLINE" : "";
  return <tr className="border-b border-zinc-800/70 last:border-0 hover:bg-zinc-800/25"><td className="px-5 py-4 font-medium text-zinc-100">{row.query}</td><td className="max-w-72 truncate text-zinc-500" title={row.topPage}>{shortUrl(row.topPage)}</td><td>{fmt(row.current.clicks)}</td><td className={row.previous.impressions || row.previous.clicks ? changeClass(row.clickChangePct) : "text-sky-300"}>{row.previous.impressions || row.previous.clicks ? changeText(row.clickChangePct) : "NEW"}</td><td>{fmt(row.current.impressions)}</td><td>{fmtPct(row.current.ctr)}</td><td>{row.current.position.toFixed(1)}</td><td className="font-semibold text-emerald-300">+{fmt(row.potentialClicks)}</td><td className="pr-4 text-xs text-zinc-500">{signal}</td></tr>;
}

function CannibalizationView({ rows }: { rows: Cannibalization[] }) {
  return <div><SectionTitle title="Cannibalization Detector" subtitle="Queries where several URLs capture meaningful visibility. Treat this as a review signal, not an automatic diagnosis." /><div className="grid gap-4">{rows.length === 0 ? <Empty title="No strong cannibalization signals" text="No queries met SearchLift's current thresholds." /> : rows.map((row) => <div key={row.query} className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold text-zinc-100">{row.query}</h3><p className="mt-1 text-sm text-zinc-500">{fmt(row.totalImpressions)} impressions · {fmt(row.totalClicks)} clicks</p></div><span className={`rounded-full border px-3 py-1 text-xs ${row.severity === "high" ? "border-rose-500/30 bg-rose-500/10 text-rose-300" : row.severity === "medium" ? "border-amber-500/30 bg-amber-500/10 text-amber-300" : "border-zinc-700 text-zinc-400"}`}>{row.severity} signal</span></div><div className="mt-4 grid gap-2">{row.pages.map((page) => <div key={page.page} className="grid grid-cols-[1fr_auto_auto] gap-4 rounded-xl bg-zinc-950/50 px-4 py-3 text-sm"><span className="truncate text-zinc-300" title={page.page}>{shortUrl(page.page)}</span><span className="text-zinc-500">pos. {page.position.toFixed(1)}</span><span>{fmt(page.impressions)} imp.</span></div>)}</div><p className="mt-4 text-xs leading-5 text-zinc-600">Review search intent, internal links, topic overlap and whether consolidation is justified. Multiple ranking pages are not always a problem.</p></div>)}</div></div>;
}

function ExperimentMeasure({ item }: { item: TrackedOptimization }) {
  const [window, setWindow] = useState<7 | 14 | 28>(7);
  const [result, setResult] = useState<PageExperimentResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const measure = async () => {
    if (!item.site || !item.optimizedAt) return;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ site: item.site, page: item.page, optimizedAt: item.optimizedAt, window: String(window) });
      const response = await fetch(`/api/gsc/experiment?${params.toString()}`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Experiment measurement failed");
      setResult(body as PageExperimentResult);
    } catch (errorValue) {
      setError(errorValue instanceof Error ? errorValue.message : "Experiment measurement failed");
    } finally {
      setLoading(false);
    }
  };

  if (!item.optimizedAt || !item.site) return null;

  return (
    <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/45 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-sm font-medium text-zinc-300">Before / after experiment</p><p className="mt-1 text-xs text-zinc-600">Uses exact pre/post windows around {item.optimizedAt.slice(0, 10)} with GSC's final-data lag respected.</p></div>
        <div className="flex gap-2"><select value={window} onChange={(e) => setWindow(Number(e.target.value) as 7 | 14 | 28)} className="rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-xs"><option value={7}>7 days</option><option value={14}>14 days</option><option value={28}>28 days</option></select><button onClick={measure} disabled={loading} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs hover:border-emerald-500/50 disabled:opacity-50">{loading ? "Measuring…" : "Measure"}</button></div>
      </div>
      {error ? <p className="mt-3 text-xs text-rose-300">{error}</p> : null}
      {result ? (
        <div className="mt-4">
          <p className={`mb-3 text-xs font-semibold uppercase tracking-[.16em] ${result.status === "ready" ? "text-emerald-300" : "text-amber-300"}`}>{result.status === "ready" ? "Full comparison ready" : `Collecting data: ${result.availableDays}/${result.requestedDays} days`}</p>
          <div className="grid gap-3 sm:grid-cols-3"><MiniMetric label="Clicks" value={`${fmt(result.before.clicks)} → ${fmt(result.after.clicks)}`} secondary={result.before.clicks || result.before.impressions ? changeText(result.clickChangePct) : "No baseline"} /><MiniMetric label="CTR" value={`${fmtPct(result.before.ctr)} → ${fmtPct(result.after.ctr)}`} secondary={result.before.ctr ? changeText(result.ctrChangePct) : "No baseline"} /><MiniMetric label="Position" value={`${result.before.position.toFixed(1)} → ${result.after.position.toFixed(1)}`} secondary={`Δ ${result.positionChange > 0 ? "+" : ""}${result.positionChange}`} /></div>
        </div>
      ) : null}
    </div>
  );
}

function OptimizationTracker({ items, data, onUpdate, onDelete }: { items: TrackedOptimization[]; data: AnalyticsPayload; onUpdate: (item: TrackedOptimization) => void; onDelete: (id: string) => void }) {
  return <div><SectionTitle title="Optimization Tracker" subtitle="Track a real SEO change, mark the implementation date and measure exact before/after windows in Search Console." />{items.length === 0 ? <Empty title="No tracked optimizations yet" text="Open an Opportunity and add the URL to the tracker." /> : <div className="grid gap-4">{items.map((item) => { const current = data.pages.find((page) => page.page === item.page)?.current; const sameSite = !item.site || item.site === data.site; const clickDelta = sameSite && item.baseline && current ? current.clicks - item.baseline.clicks : null; return <div key={item.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-3"><Score value={item.score} /><h3 className="font-semibold">{shortUrl(item.page)}</h3></div><p className="mt-2 text-xs text-zinc-600">Added {new Date(item.createdAt).toLocaleString("pl-PL")} {item.site ? `· ${hostname(item.site)}` : ""}</p></div><button onClick={() => onDelete(item.id)} className="text-xs text-zinc-600 hover:text-rose-300">Remove</button></div>{item.baseline ? <div className="mt-4 grid gap-3 sm:grid-cols-3"><MiniMetric label="Tracked-window clicks" value={fmt(item.baseline.clicks)} secondary={clickDelta === null ? "Switch to tracked site" : `${clickDelta >= 0 ? "+" : ""}${fmt(clickDelta)} current-window delta`} /><MiniMetric label="Baseline CTR" value={fmtPct(item.baseline.ctr)} secondary={current ? `current window ${fmtPct(current.ctr)}` : "No current row"} /><MiniMetric label="Baseline position" value={item.baseline.position.toFixed(1)} secondary={current ? `current ${current.position.toFixed(1)}` : "No current row"} /></div> : null}<div className="mt-4 grid gap-3 md:grid-cols-[180px_1fr_auto]"><select value={item.status} onChange={(e) => onUpdate({ ...item, status: e.target.value as TrackedOptimization["status"] })} className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"><option value="todo">To do</option><option value="in-progress">In progress</option><option value="done">Done</option></select><input value={item.note} onChange={(e) => onUpdate({ ...item, note: e.target.value })} placeholder="What did you change? title, content, internal links…" className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-emerald-500/50" />{!item.optimizedAt ? <button onClick={() => onUpdate({ ...item, status: "done", optimizedAt: new Date().toISOString() })} className="rounded-xl bg-emerald-400 px-3 py-2 text-sm font-semibold text-zinc-950">Optimized now</button> : <button onClick={() => onUpdate({ ...item, optimizedAt: undefined })} className="rounded-xl border border-zinc-700 px-3 py-2 text-xs text-zinc-400">Reset date</button>}</div>{item.optimizedAt ? <p className="mt-3 text-xs text-emerald-300">Optimization date: {new Date(item.optimizedAt).toLocaleString("pl-PL")}</p> : null}<ExperimentMeasure item={item} /></div>; })}</div>}</div>;
}

function Empty({ title, text }: { title: string; text: string }) {
  return <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/40 p-10 text-center"><h3 className="font-semibold text-zinc-200">{title}</h3><p className="mx-auto mt-2 max-w-xl text-sm text-zinc-500">{text}</p></div>;
}

function Settings({ data, connected, configured, onDisconnect }: { data: AnalyticsPayload | null; connected: boolean; configured: boolean; onDisconnect: () => void }) {
  return <div className="grid gap-5 xl:grid-cols-2"><div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5"><SectionTitle title="Google Search Console" /><p className="text-sm leading-6 text-zinc-500">Status: <span className={connected ? "text-emerald-300" : "text-zinc-300"}>{connected ? "Connected" : configured ? "Configured, not connected" : "Demo-only: missing .env.local"}</span></p>{data ? <div className="mt-4 grid gap-2 text-sm text-zinc-500"><p>Property: <span className="text-zinc-300">{data.site}</span></p><p>Last sync: <span className="text-zinc-300">{new Date(data.generatedAt).toLocaleString("pl-PL")}</span></p><p>Data confidence: <span className="text-zinc-300">{data.dataQuality.score}/100 ({data.dataQuality.level})</span></p></div> : null}{connected ? <button onClick={onDisconnect} className="mt-4 rounded-xl border border-zinc-700 px-4 py-2 text-sm hover:border-rose-500/50 hover:text-rose-300">Disconnect Google</button> : null}</div><div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5"><SectionTitle title="Architecture" /><div className="grid gap-2 text-center text-xs font-medium text-zinc-400"><div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">Google Search Console API</div><div>↓ OAuth 2.0 + server fetch</div><div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">Next.js Route Handlers</div><div>↓ normalization + scoring</div><div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">Opportunity / Decay / Experiment engines</div><div>↓ typed JSON</div><div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">React Dashboard</div></div></div><div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5"><SectionTitle title="Security & privacy" /><ul className="space-y-2 text-sm leading-6 text-zinc-500"><li>• Google Client Secret stays server-side in environment variables.</li><li>• OAuth tokens are stored in an encrypted HTTP-only cookie.</li><li>• SearchLift requests read-only Search Console access.</li><li>• Technical page checks validate DNS/IPs to block private-network SSRF targets.</li><li>• Optimization notes are local browser data in this portfolio build.</li></ul></div><div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5"><SectionTitle title="How estimates work" /><ul className="space-y-2 text-sm leading-6 text-zinc-500"><li>• opportunity score prioritizes position, visibility, CTR gap and trend,</li><li>• estimated clicks model a realistic next target position rather than promising a result,</li><li>• low-data guardrails cap scores when the sample is weak,</li><li>• content decay exposes the queries contributing to losses,</li><li>• experiment tracking compares exact pre/post GSC windows.</li></ul></div>{data?.limitations?.map((item) => <div key={item} className="rounded-xl border border-amber-500/15 bg-amber-500/5 p-4 text-sm leading-6 text-amber-200/70">{item}</div>)}</div>;
}

function exportCsv(data: AnalyticsPayload) {
  const rows = [["score", "confidence", "page", "labels", "clicks", "impressions", "ctr", "position", "target_position", "click_change_pct", "estimated_click_gain"], ...data.opportunities.map((row) => [row.score, row.confidence, row.page, row.labels.join(" | "), row.current.clicks, row.current.impressions, row.current.ctr, row.current.position, row.targetPosition, row.clickChangePct, row.potentialClicks])];
  const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `searchlift-opportunities-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function SearchLiftApp() {
  const [active, setActive] = useState<Tab>("overview");
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [days, setDays] = useState<28 | 90>(28);
  const [connected, setConnected] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [sites, setSites] = useState<SiteEntry[]>([]);
  const [site, setSite] = useState("");
  const [tracked, setTracked] = useState<TrackedOptimization[]>([]);
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("searchlift_optimizations");
    if (saved) {
      try { setTracked(JSON.parse(saved) as TrackedOptimization[]); } catch { /* ignore malformed local data */ }
    }
    const savedSite = localStorage.getItem("searchlift_site");
    if (savedSite) setSite(savedSite);
  }, []);

  const persistTracked = useCallback((next: TrackedOptimization[]) => {
    setTracked(next);
    localStorage.setItem("searchlift_optimizations", JSON.stringify(next));
  }, []);

  const loadDemo = useCallback(async (periodDays: number) => {
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/demo?days=${periodDays}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load demo data.");
      setData(await response.json() as AnalyticsPayload);
    } catch (errorValue) {
      setError(errorValue instanceof Error ? errorValue.message : "Demo data error");
    } finally { setLoading(false); }
  }, []);

  const loadReal = useCallback(async (siteUrl: string, periodDays: number) => {
    if (!siteUrl) return;
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/gsc/analytics?site=${encodeURIComponent(siteUrl)}&days=${periodDays}`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Search Console API error");
      setData(body as AnalyticsPayload);
    } catch (errorValue) {
      setError(errorValue instanceof Error ? errorValue.message : "Search Console API error");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const status = await fetch("/api/auth/google/status", { cache: "no-store" }).then((response) => response.json()) as { connected: boolean; configured: boolean };
        setConnected(status.connected);
        setConfigured(status.configured);
        if (status.connected) {
          const response = await fetch("/api/gsc/sites", { cache: "no-store" });
          if (response.ok) {
            const body = await response.json() as { sites: SiteEntry[] };
            setSites(body.sites);
            const savedSite = localStorage.getItem("searchlift_site");
            const chosen = savedSite && body.sites.some((x) => x.siteUrl === savedSite) ? savedSite : body.sites[0]?.siteUrl ?? "";
            if (chosen) {
              setSite(chosen);
              localStorage.setItem("searchlift_site", chosen);
              await loadReal(chosen, days);
              return;
            }
          }
        }
        await loadDemo(days);
      } catch {
        await loadDemo(days);
      }
    })();
  }, [days, loadDemo, loadReal]);

  const onSiteChange = async (value: string) => {
    setSite(value);
    localStorage.setItem("searchlift_site", value);
    await loadReal(value, days);
  };

  const openPortfolioSite = async (value: string) => {
    setSite(value);
    localStorage.setItem("searchlift_site", value);
    setActive("overview");
    await loadReal(value, days);
  };

  const onTrack = (row: Opportunity) => {
    if (tracked.some((item) => item.page === row.page && (!item.site || item.site === data?.site))) {
      setActive("optimizations");
      return;
    }
    const next: TrackedOptimization[] = [{ id: crypto.randomUUID(), page: row.page, site: data?.mode === "gsc" ? data.site : undefined, score: row.score, labels: row.labels, createdAt: new Date().toISOString(), status: "todo", note: "", baseline: row.current }, ...tracked];
    persistTracked(next);
    setActive("optimizations");
  };

  const onDisconnect = async () => {
    await fetch("/api/auth/google/disconnect", { method: "POST" });
    setConnected(false); setSites([]); setSite(""); localStorage.removeItem("searchlift_site");
    await loadDemo(days); setActive("overview");
  };

  const content = useMemo(() => {
    if (!data) return null;
    if (active === "overview") return <Overview data={data} onTrack={onTrack} onSelect={setSelectedOpportunity} />;
    if (active === "sites") return <SitesPortfolio connected={connected} days={days} onOpenSite={openPortfolioSite} />;
    if (active === "action-plan") return <ActionPlan data={data} onOpen={setSelectedOpportunity} />;
    if (active === "opportunities") return <Opportunities data={data} onTrack={onTrack} onSelect={setSelectedOpportunity} />;
    if (active === "pages") return <Pages data={data} onSelect={setSelectedOpportunity} />;
    if (active === "queries") return <Queries data={data} />;
    if (active === "cannibalization") return <CannibalizationView rows={data.cannibalizations} />;
    if (active === "optimizations") return <OptimizationTracker items={tracked} data={data} onUpdate={(item) => persistTracked(tracked.map((x) => x.id === item.id ? item : x))} onDelete={(id) => persistTracked(tracked.filter((x) => x.id !== id))} />;
    return <Settings data={data} connected={connected} configured={configured} onDisconnect={onDisconnect} />;
  }, [active, data, tracked, connected, configured, days, persistTracked]);

  return (
    <div className="min-h-screen bg-transparent text-zinc-100 lg:flex">
      <Navigation active={active} onChange={setActive} />
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-[1540px] px-4 py-6 sm:px-7 lg:px-10 lg:py-8">
          <header className="mb-8 flex flex-wrap items-start justify-between gap-5">
            <div>
              <div className="mb-2 flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${data?.mode === "gsc" ? "bg-emerald-400" : "bg-amber-400"}`} /><span className="text-xs font-semibold uppercase tracking-[.22em] text-zinc-500">{data?.mode === "gsc" ? "Live Search Console data" : "Demo mode"}</span></div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">SEO Growth Workspace</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">Turn Search Console data into a prioritized action plan, decay diagnosis and measurable SEO experiments.</p>
              {data ? <p className="mt-2 text-xs text-zinc-700">{hostname(data.site)} · synced {new Date(data.generatedAt).toLocaleString("pl-PL")}</p> : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select value={days} onChange={(e) => setDays(Number(e.target.value) as 28 | 90)} className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm"><option value={28}>28 days</option><option value={90}>90 days</option></select>
              {connected && sites.length > 0 ? <select value={site} onChange={(e) => onSiteChange(e.target.value)} className="max-w-[340px] rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm">{sites.map((x) => <option key={x.siteUrl} value={x.siteUrl}>{x.siteUrl}</option>)}</select> : null}
              {data ? <button onClick={() => exportCsv(data)} className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-300 hover:border-zinc-700">Export CSV</button> : null}
              {!connected && configured ? (
  <a
    href="/api/auth/google/start"
    className="rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-bold text-zinc-950 transition hover:bg-emerald-300"
  >
    Connect Search Console
  </a>
) : null}
            </div>
          </header>

          {!configured ? (
  <div className="mb-6 rounded-xl border border-sky-500/20 bg-sky-500/5 px-4 py-3 text-sm text-sky-100/70">
    Demo workspace — using synthetic Search Console data. Live Google Search Console integration is supported via OAuth 2.0.
  </div>
) : null}
          {error ? <div className="mb-6 rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-sm text-rose-200">{error} <button onClick={() => loadDemo(days)} className="ml-2 underline">Use demo</button></div> : null}
          {loading ? <div className="grid min-h-[420px] place-items-center"><div className="text-center"><div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-zinc-800 border-t-emerald-400" /><p className="mt-4 text-sm text-zinc-500">Analyzing Search Console data…</p></div></div> : content}
        </div>
      </main>
      {selectedOpportunity ? <OpportunityDetail row={selectedOpportunity} onClose={() => setSelectedOpportunity(null)} onTrack={onTrack} /> : null}
    </div>
  );
}
