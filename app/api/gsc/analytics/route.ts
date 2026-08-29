import { NextRequest, NextResponse } from "next/server";
import { attachRefreshedCookie, getValidGoogleSession } from "@/lib/google-oauth";
import { loadSearchConsoleAnalytics } from "@/lib/gsc";
export async function GET(request: NextRequest) {
    const site = request.nextUrl.searchParams.get("site");
    const daysRaw = Number(request.nextUrl.searchParams.get("days") ?? 28);
    const days = daysRaw === 90 ? 90 : 28;
    if (!site)
        return NextResponse.json({ error: "Brak parametru site." }, { status: 400 });
    try {
        const { session, refreshedCookie } = await getValidGoogleSession(request);
        const payload = await loadSearchConsoleAnalytics(session.accessToken, site, days);
        const response = NextResponse.json(payload);
        attachRefreshedCookie(response, refreshedCookie);
        return response;
    }
    catch (errorValue) {
        const message = errorValue instanceof Error ? errorValue.message : "Nie udało się pobrać danych.";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

