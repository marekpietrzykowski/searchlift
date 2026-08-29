import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { NextRequest, NextResponse } from "next/server";
import type { TechnicalAudit } from "@/lib/types";

export const runtime = "nodejs";

const MAX_HTML_BYTES = 1_250_000;
const TIMEOUT_MS = 8_000;

function isPrivateIpv4(ip: string) {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return true;
  const [a, b] = parts;
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  if (a >= 224) return true;
  return false;
}

function isPrivateIp(ip: string) {
  if (isIP(ip) === 4) return isPrivateIpv4(ip);
  const lower = ip.toLowerCase();
  if (lower === "::1" || lower === "::") return true;
  if (lower.startsWith("fc") || lower.startsWith("fd") || lower.startsWith("fe80:")) return true;
  if (lower.startsWith("::ffff:")) {
    const ipv4 = lower.slice("::ffff:".length);
    if (isIP(ipv4) === 4) return isPrivateIpv4(ipv4);
  }
  return false;
}

async function assertPublicUrl(raw: string) {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Nieprawidłowy URL.");
  }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error("Dozwolone są tylko adresy http/https.");
  if (url.username || url.password) throw new Error("URL z danymi logowania jest niedozwolony.");
  const hostname = url.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".localhost")) throw new Error("Lokalne adresy są zablokowane.");
  if (isIP(hostname) && isPrivateIp(hostname)) throw new Error("Prywatne adresy IP są zablokowane.");
  const resolved = await lookup(hostname, { all: true, verbatim: true });
  if (!resolved.length || resolved.some((entry) => isPrivateIp(entry.address))) {
    throw new Error("Host rozwiązuje się do prywatnego lub niedozwolonego adresu IP.");
  }
  return url;
}

async function safeFetch(raw: string, redirects = 0): Promise<Response> {
  const url = await assertPublicUrl(raw);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      redirect: "manual",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "user-agent": "SearchLift/4.0 (+portfolio technical audit)",
        accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5",
      },
    });
    if (response.status >= 300 && response.status < 400 && response.headers.get("location")) {
      if (redirects >= 3) throw new Error("Za dużo przekierowań.");
      const next = new URL(response.headers.get("location")!, url).toString();
      response.body?.cancel().catch(() => undefined);
      return safeFetch(next, redirects + 1);
    }
    return response;
  } finally {
    clearTimeout(timer);
  }
}

async function readLimitedText(response: Response) {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_HTML_BYTES) {
      await reader.cancel();
      throw new Error("Dokument HTML jest zbyt duży do szybkiego audytu.");
    }
    chunks.push(value);
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(merged);
}

function clean(value: string) {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function first(html: string, re: RegExp) {
  return clean(html.match(re)?.[1] ?? "");
}

function metaContent(html: string, name: string) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta[^>]+name=["']${escaped}["'][^>]+content=["']([^"']*)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${escaped}["'][^>]*>`, "i"),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return clean(match[1]);
  }
  return "";
}

function linkHref(html: string, rel: string) {
  const escaped = rel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<link[^>]+rel=["'][^"']*${escaped}[^"']*["'][^>]+href=["']([^"']+)["'][^>]*>`, "i"),
    new RegExp(`<link[^>]+href=["']([^"']+)["'][^>]+rel=["'][^"']*${escaped}[^"']*["'][^>]*>`, "i"),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return clean(match[1]);
  }
  return "";
}

async function resourceExists(raw: string) {
  try {
    const response = await safeFetch(raw);
    response.body?.cancel().catch(() => undefined);
    return response.status >= 200 && response.status < 400;
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("url");
  if (!raw) return NextResponse.json({ error: "Brak parametru url." }, { status: 400 });

  try {
    const start = performance.now();
    const response = await safeFetch(raw);
    const responseTimeMs = Math.round(performance.now() - start);
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
      response.body?.cancel().catch(() => undefined);
      throw new Error("Adres nie zwraca dokumentu HTML.");
    }
    const html = await readLimitedText(response);
    const finalUrl = response.url || raw;
    const base = new URL(finalUrl);
    const title = first(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
    const metaDescription = metaContent(html, "description");
    const h1 = first(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i);
    const canonicalRaw = linkHref(html, "canonical");
    const canonical = canonicalRaw ? new URL(canonicalRaw, base).toString() : "";
    const robotsMeta = metaContent(html, "robots").toLowerCase();
    const indexable = !robotsMeta.split(",").map((x) => x.trim()).includes("noindex");
    const [robotsTxt, sitemapXml] = await Promise.all([
      resourceExists(new URL("/robots.txt", base.origin).toString()),
      resourceExists(new URL("/sitemap.xml", base.origin).toString()),
    ]);

    const issues: TechnicalAudit["issues"] = [];
    if (response.status >= 400) issues.push({ level: "error", message: `HTTP ${response.status}` });
    if (!title) issues.push({ level: "error", message: "Brak <title>." });
    else if (title.length > 65) issues.push({ level: "warning", message: `Title ma ${title.length} znaków.` });
    if (!metaDescription) issues.push({ level: "warning", message: "Brak meta description." });
    else if (metaDescription.length > 170) issues.push({ level: "warning", message: `Meta description ma ${metaDescription.length} znaków.` });
    if (!h1) issues.push({ level: "warning", message: "Brak nagłówka H1." });
    if (!canonical) issues.push({ level: "warning", message: "Brak canonical." });
    if (!indexable) issues.push({ level: "error", message: "Strona ma meta robots noindex." });
    if (!robotsTxt) issues.push({ level: "info", message: "Nie znaleziono /robots.txt." });
    if (!sitemapXml) issues.push({ level: "info", message: "Nie znaleziono /sitemap.xml." });
    if (responseTimeMs > 1500) issues.push({ level: "warning", message: `Wolna odpowiedź serwera: ${responseTimeMs} ms.` });

    const payload: TechnicalAudit = {
      url: raw,
      finalUrl,
      checkedAt: new Date().toISOString(),
      status: response.status,
      responseTimeMs,
      title,
      metaDescription,
      h1,
      canonical,
      indexable,
      robotsTxt,
      sitemapXml,
      issues,
    };
    return NextResponse.json(payload);
  } catch (errorValue) {
    const message = errorValue instanceof Error ? errorValue.message : "Nie udało się wykonać audytu.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
