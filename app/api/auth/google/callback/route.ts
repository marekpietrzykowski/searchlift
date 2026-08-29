import { NextRequest, NextResponse } from "next/server";
import { clearStateCookie, exchangeCodeForSession, setSessionCookie, validateState, } from "@/lib/google-oauth";
export async function GET(request: NextRequest) {
    const code = request.nextUrl.searchParams.get("code");
    const state = request.nextUrl.searchParams.get("state");
    const error = request.nextUrl.searchParams.get("error");
    if (error)
        return NextResponse.redirect(new URL(`/?oauth=${encodeURIComponent(error)}`, request.url));
    if (!code || !state || !validateState(request, state)) {
        return NextResponse.redirect(new URL("/?oauth=invalid-state", request.url));
    }
    try {
        const session = await exchangeCodeForSession(request.nextUrl.origin, code);
        const response = NextResponse.redirect(new URL("/?connected=1", request.url));
        setSessionCookie(response, session);
        clearStateCookie(response);
        return response;
    }
    catch (errorValue) {
        const message = errorValue instanceof Error ? errorValue.message : "oauth-error";
        return NextResponse.redirect(new URL(`/?oauth=${encodeURIComponent(message.slice(0, 100))}`, request.url));
    }
}

