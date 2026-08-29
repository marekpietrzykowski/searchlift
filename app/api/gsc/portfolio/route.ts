import { NextRequest, NextResponse } from "next/server";
import { attachRefreshedCookie, getValidGoogleSession } from "@/lib/google-oauth";
import { loadSitePortfolio } from "@/lib/gsc";

export async function GET(request: NextRequest) {
  const raw = Number(request.nextUrl.searchParams.get("days") ?? 28);
  const days = raw === 90 ? 90 : 28;
  try {
    const { session, refreshedCookie } = await getValidGoogleSession(request);
    const payload = await loadSitePortfolio(session.accessToken, days, 8);
    const response = NextResponse.json(payload);
    attachRefreshedCookie(response, refreshedCookie);
    return response;
  } catch (errorValue) {
    const message = errorValue instanceof Error ? errorValue.message : "Nie udało się pobrać portfolio witryn.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
