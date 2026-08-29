import { NextRequest, NextResponse } from "next/server";
import { getValidGoogleSession, hasGoogleConfiguration } from "@/lib/google-oauth";
export async function GET(request: NextRequest) {
    if (!hasGoogleConfiguration()) {
        return NextResponse.json({ connected: false, configured: false });
    }
    try {
        const { refreshedCookie } = await getValidGoogleSession(request);
        const response = NextResponse.json({ connected: true, configured: true });
        if (refreshedCookie) {
            response.cookies.set("searchlift_google_session", refreshedCookie, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                path: "/",
                maxAge: 60 * 60 * 24 * 30,
            });
        }
        return response;
    }
    catch {
        return NextResponse.json({ connected: false, configured: true });
    }
}

