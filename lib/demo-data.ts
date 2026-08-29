import { buildAnalyticsPayload } from "./seo-engine";
import { getComparisonPeriod } from "./date-ranges";
import type { BreakdownItem, Metric, PagePeriodRow, QueryPagePeriodRow, TrendPoint, } from "./types";
const pages: PagePeriodRow[] = [
    {
        page: "/poradnik/seo-audit",
        current: { clicks: 322, impressions: 18430, ctr: 0.0175, position: 7.8 },
        previous: { clicks: 421, impressions: 17100, ctr: 0.0246, position: 6.1 },
    },
    {
        page: "/blog/jak-poprawic-ctr",
        current: { clicks: 291, impressions: 31200, ctr: 0.0093, position: 10.9 },
        previous: { clicks: 246, impressions: 28400, ctr: 0.0087, position: 11.8 },
    },
    {
        page: "/narzedzia/search-console",
        current: { clicks: 501, impressions: 12800, ctr: 0.0391, position: 4.5 },
        previous: { clicks: 548, impressions: 12100, ctr: 0.0453, position: 4.1 },
    },
    {
        page: "/poradnik/linkowanie-wewnetrzne",
        current: { clicks: 218, impressions: 9900, ctr: 0.022, position: 8.6 },
        previous: { clicks: 165, impressions: 7600, ctr: 0.0217, position: 10.5 },
    },
    {
        page: "/blog/content-decay",
        current: { clicks: 143, impressions: 8200, ctr: 0.0174, position: 13.2 },
        previous: { clicks: 266, impressions: 10900, ctr: 0.0244, position: 8.7 },
    },
    {
        page: "/poradnik/keyword-research",
        current: { clicks: 412, impressions: 22200, ctr: 0.0186, position: 9.2 },
        previous: { clicks: 356, impressions: 19800, ctr: 0.018, position: 10.3 },
    },
    {
        page: "/blog/core-web-vitals",
        current: { clicks: 177, impressions: 6400, ctr: 0.0277, position: 12.4 },
        previous: { clicks: 129, impressions: 5200, ctr: 0.0248, position: 15.1 },
    },
    {
        page: "/poradnik/meta-description",
        current: { clicks: 98, impressions: 15300, ctr: 0.0064, position: 5.8 },
        previous: { clicks: 102, impressions: 14100, ctr: 0.0072, position: 5.6 },
    },
    {
        page: "/blog/nextjs-seo",
        current: { clicks: 365, impressions: 11800, ctr: 0.0309, position: 6.4 },
        previous: { clicks: 281, impressions: 9700, ctr: 0.029, position: 8.1 },
    },
    {
        page: "/checklista/techniczne-seo",
        current: { clicks: 256, impressions: 7400, ctr: 0.0346, position: 7.1 },
        previous: { clicks: 271, impressions: 7900, ctr: 0.0343, position: 6.9 },
    },
    {
        page: "/blog/kanibalizacja-slow-kluczowych",
        current: { clicks: 119, impressions: 6800, ctr: 0.0175, position: 14.8 },
        previous: { clicks: 78, impressions: 4200, ctr: 0.0186, position: 18.5 },
    },
    {
        page: "/poradnik/optymalizacja-title",
        current: { clicks: 204, impressions: 11600, ctr: 0.0176, position: 9.7 },
        previous: { clicks: 218, impressions: 10800, ctr: 0.0202, position: 8.9 },
    },
];
const queryPages: QueryPagePeriodRow[] = [
    {
        query: "audyt seo strony",
        page: "/poradnik/seo-audit",
        current: { clicks: 108, impressions: 5100, ctr: 0.0212, position: 7.1 },
        previous: { clicks: 142, impressions: 5000, ctr: 0.0284, position: 5.8 },
    },
    {
        query: "audyt seo strony",
        page: "/checklista/techniczne-seo",
        current: { clicks: 41, impressions: 1900, ctr: 0.0216, position: 9.8 },
        previous: { clicks: 34, impressions: 1600, ctr: 0.0213, position: 11.1 },
    },
    {
        query: "jak poprawić ctr",
        page: "/blog/jak-poprawic-ctr",
        current: { clicks: 94, impressions: 9200, ctr: 0.0102, position: 6.7 },
        previous: { clicks: 79, impressions: 8300, ctr: 0.0095, position: 7.3 },
    },
    {
        query: "meta description ctr",
        page: "/blog/jak-poprawic-ctr",
        current: { clicks: 38, impressions: 5400, ctr: 0.007, position: 9.4 },
        previous: { clicks: 31, impressions: 4900, ctr: 0.0063, position: 10.2 },
    },
    {
        query: "meta description",
        page: "/poradnik/meta-description",
        current: { clicks: 54, impressions: 8600, ctr: 0.0063, position: 5.5 },
        previous: { clicks: 59, impressions: 8100, ctr: 0.0073, position: 5.2 },
    },
    {
        query: "google search console",
        page: "/narzedzia/search-console",
        current: { clicks: 213, impressions: 4700, ctr: 0.0453, position: 3.9 },
        previous: { clicks: 225, impressions: 4500, ctr: 0.05, position: 3.7 },
    },
    {
        query: "linkowanie wewnętrzne seo",
        page: "/poradnik/linkowanie-wewnetrzne",
        current: { clicks: 87, impressions: 3300, ctr: 0.0264, position: 7.9 },
        previous: { clicks: 61, impressions: 2600, ctr: 0.0235, position: 9.7 },
    },
    {
        query: "content decay seo",
        page: "/blog/content-decay",
        current: { clicks: 61, impressions: 3600, ctr: 0.0169, position: 12.8 },
        previous: { clicks: 121, impressions: 4800, ctr: 0.0252, position: 8.1 },
    },
    {
        query: "keyword research",
        page: "/poradnik/keyword-research",
        current: { clicks: 142, impressions: 7800, ctr: 0.0182, position: 8.8 },
        previous: { clicks: 118, impressions: 6900, ctr: 0.0171, position: 9.9 },
    },
    {
        query: "core web vitals",
        page: "/blog/core-web-vitals",
        current: { clicks: 71, impressions: 2300, ctr: 0.0309, position: 11.7 },
        previous: { clicks: 49, impressions: 1900, ctr: 0.0258, position: 14.2 },
    },
    {
        query: "nextjs seo",
        page: "/blog/nextjs-seo",
        current: { clicks: 163, impressions: 4600, ctr: 0.0354, position: 5.9 },
        previous: { clicks: 111, impressions: 3500, ctr: 0.0317, position: 7.7 },
    },
    {
        query: "techniczne seo",
        page: "/checklista/techniczne-seo",
        current: { clicks: 89, impressions: 2500, ctr: 0.0356, position: 6.9 },
        previous: { clicks: 96, impressions: 2700, ctr: 0.0356, position: 6.6 },
    },
    {
        query: "techniczne seo",
        page: "/poradnik/seo-audit",
        current: { clicks: 52, impressions: 1700, ctr: 0.0306, position: 8.4 },
        previous: { clicks: 61, impressions: 1800, ctr: 0.0339, position: 7.6 },
    },
    {
        query: "kanibalizacja słów kluczowych",
        page: "/blog/kanibalizacja-slow-kluczowych",
        current: { clicks: 58, impressions: 2600, ctr: 0.0223, position: 11.9 },
        previous: { clicks: 31, impressions: 1500, ctr: 0.0207, position: 16.7 },
    },
    {
        query: "optymalizacja title",
        page: "/poradnik/optymalizacja-title",
        current: { clicks: 83, impressions: 4200, ctr: 0.0198, position: 8.9 },
        previous: { clicks: 91, impressions: 4100, ctr: 0.0222, position: 8.2 },
    },
    {
        query: "seo title",
        page: "/poradnik/optymalizacja-title",
        current: { clicks: 47, impressions: 3100, ctr: 0.0152, position: 10.4 },
        previous: { clicks: 54, impressions: 2900, ctr: 0.0186, position: 9.6 },
    },
    {
        query: "seo title",
        page: "/blog/jak-poprawic-ctr",
        current: { clicks: 29, impressions: 1800, ctr: 0.0161, position: 12.2 },
        previous: { clicks: 26, impressions: 1500, ctr: 0.0173, position: 12.8 },
    },
];
function aggregate(rows: PagePeriodRow[], period: "current" | "previous"): Metric {
    const clicks = rows.reduce((sum, row) => sum + row[period].clicks, 0);
    const impressions = rows.reduce((sum, row) => sum + row[period].impressions, 0);
    const ctr = clicks / impressions;
    const position = rows.reduce((sum, row) => sum + row[period].position * row[period].impressions, 0) /
        impressions;
    return { clicks, impressions, ctr, position };
}
function trend(days: number): TrendPoint[] {
    const out: TrendPoint[] = [];
    const now = new Date();
    now.setUTCDate(now.getUTCDate() - 3);
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setUTCDate(now.getUTCDate() - i);
        const idx = days - 1 - i;
        const wave = Math.sin(idx / 2.4) * 18 + Math.cos(idx / 5.2) * 11;
        const growth = idx * 1.1;
        const clicks = Math.max(70, Math.round(118 + wave + growth));
        const impressions = Math.round(clicks * (28 + Math.sin(idx / 4) * 3));
        out.push({
            date: date.toISOString().slice(0, 10),
            clicks,
            impressions,
            ctr: clicks / impressions,
            position: Math.max(5.5, 9.4 - idx * 0.035 + Math.sin(idx / 3) * 0.35),
        });
    }
    return out;
}
const devices: BreakdownItem[] = [
    { key: "MOBILE", clicks: 2140, impressions: 68100, ctr: 0.0314, position: 8.9 },
    { key: "DESKTOP", clicks: 1268, impressions: 35800, ctr: 0.0354, position: 7.7 },
    { key: "TABLET", clicks: 398, impressions: 10400, ctr: 0.0383, position: 9.4 },
];
const countries: BreakdownItem[] = [
    { key: "pol", clicks: 3010, impressions: 89200, ctr: 0.0337, position: 8.1 },
    { key: "deu", clicks: 278, impressions: 9900, ctr: 0.0281, position: 10.2 },
    { key: "gbr", clicks: 184, impressions: 6700, ctr: 0.0275, position: 11.1 },
    { key: "usa", clicks: 163, impressions: 5400, ctr: 0.0302, position: 9.7 },
];
export function buildDemoPayload(days = 28) {
    const period = getComparisonPeriod(days);
    return buildAnalyticsPayload({
        mode: "demo",
        site: "demo.searchlift.app",
        days: period.days,
        period,
        currentTotal: aggregate(pages, "current"),
        previousTotal: aggregate(pages, "previous"),
        pages,
        queryPages,
        trend: trend(period.days),
        devices,
        countries,
        limitations: [
            "Dane demonstracyjne służą wyłącznie do pokazania działania algorytmów przed podłączeniem Search Console.",
        ],
    });
}

