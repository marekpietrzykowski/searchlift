import { NextRequest, NextResponse } from "next/server";
import { createGoogleAuthUrl, createState, hasGoogleConfiguration, setStateCookie, } from "@/lib/google-oauth";
export async function GET(request: NextRequest) {
    if (!hasGoogleConfiguration()) {
        return NextResponse.redirect(new URL("/?oauth=missing-config", request.url));
    }
    const state = createState();
    const authUrl = createGoogleAuthUrl(request.nextUrl.origin, state);
    const response = NextResponse.redirect(authUrl);
    setStateCookie(response, state);
    return response;
}

