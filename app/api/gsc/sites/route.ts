import { NextRequest, NextResponse } from "next/server";
import { attachRefreshedCookie, getValidGoogleSession } from "@/lib/google-oauth";
import { listSites } from "@/lib/gsc";
export async function GET(request: NextRequest) {
    try {
        const { session, refreshedCookie } = await getValidGoogleSession(request);
        const sites = await listSites(session.accessToken);
        const response = NextResponse.json({ sites });
        attachRefreshedCookie(response, refreshedCookie);
        return response;
    }
    catch (errorValue) {
        const message = errorValue instanceof Error ? errorValue.message : "Nie udało się pobrać witryn.";
        return NextResponse.json({ error: message }, { status: 401 });
    }
}

