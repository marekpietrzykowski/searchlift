import crypto from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";
export type GoogleSession = {
    accessToken: string;
    refreshToken?: string;
    expiresAt: number;
};
const SESSION_COOKIE = "searchlift_google_session";
const STATE_COOKIE = "searchlift_oauth_state";
const SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
function sessionSecret(): string {
    const value = process.env.SESSION_SECRET;
    if (!value)
        throw new Error("Brak SESSION_SECRET w .env.local");
    return value;
}
function key(): Buffer {
    return crypto.createHash("sha256").update(sessionSecret()).digest();
}
function seal(value: GoogleSession): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
    const plaintext = Buffer.from(JSON.stringify(value), "utf8");
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, ciphertext]).toString("base64url");
}
function unseal(value: string): GoogleSession | null {
    try {
        const raw = Buffer.from(value, "base64url");
        const iv = raw.subarray(0, 12);
        const tag = raw.subarray(12, 28);
        const ciphertext = raw.subarray(28);
        const decipher = crypto.createDecipheriv("aes-256-gcm", key(), iv);
        decipher.setAuthTag(tag);
        const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
        return JSON.parse(plaintext.toString("utf8")) as GoogleSession;
    }
    catch {
        return null;
    }
}
export function getRedirectUri(origin: string): string {
    return process.env.GOOGLE_REDIRECT_URI || `${origin}/api/auth/google/callback`;
}
export function createGoogleAuthUrl(origin: string, state: string): string {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId)
        throw new Error("Brak GOOGLE_CLIENT_ID w .env.local");
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", getRedirectUri(origin));
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", SCOPE);
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
    url.searchParams.set("state", state);
    return url.toString();
}
export async function exchangeCodeForSession(origin: string, code: string): Promise<GoogleSession> {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
        throw new Error("Brak GOOGLE_CLIENT_ID lub GOOGLE_CLIENT_SECRET w .env.local");
    }
    const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: getRedirectUri(origin),
            grant_type: "authorization_code",
        }),
        cache: "no-store",
    });
    if (!response.ok) {
        throw new Error(`Google token exchange failed (${response.status})`);
    }
    const body = (await response.json()) as {
        access_token: string;
        refresh_token?: string;
        expires_in: number;
    };
    return {
        accessToken: body.access_token,
        refreshToken: body.refresh_token,
        expiresAt: Date.now() + body.expires_in * 1000,
    };
}
async function refreshSession(session: GoogleSession): Promise<GoogleSession> {
    if (!session.refreshToken)
        throw new Error("Sesja Google wygasła. Połącz konto ponownie.");
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret)
        throw new Error("Brak konfiguracji Google OAuth.");
    const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            refresh_token: session.refreshToken,
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: "refresh_token",
        }),
        cache: "no-store",
    });
    if (!response.ok)
        throw new Error("Nie udało się odświeżyć sesji Google.");
    const body = (await response.json()) as {
        access_token: string;
        expires_in: number;
    };
    return {
        ...session,
        accessToken: body.access_token,
        expiresAt: Date.now() + body.expires_in * 1000,
    };
}
export async function getValidGoogleSession(request: NextRequest): Promise<{
    session: GoogleSession;
    refreshedCookie?: string;
}> {
    const cookie = request.cookies.get(SESSION_COOKIE)?.value;
    if (!cookie)
        throw new Error("Google Search Console nie jest połączone.");
    const session = unseal(cookie);
    if (!session)
        throw new Error("Nieprawidłowa sesja Google. Połącz konto ponownie.");
    if (session.expiresAt > Date.now() + 60000)
        return { session };
    const refreshed = await refreshSession(session);
    return { session: refreshed, refreshedCookie: seal(refreshed) };
}
export function setSessionCookie(response: NextResponse, session: GoogleSession) {
    response.cookies.set(SESSION_COOKIE, seal(session), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
    });
}
export function attachRefreshedCookie(response: NextResponse, sealed?: string) {
    if (!sealed)
        return;
    response.cookies.set(SESSION_COOKIE, sealed, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
    });
}
export function clearSessionCookie(response: NextResponse) {
    response.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
}
export function createState(): string {
    return crypto.randomBytes(24).toString("base64url");
}
export function setStateCookie(response: NextResponse, state: string) {
    response.cookies.set(STATE_COOKIE, state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 10 * 60,
    });
}
export function validateState(request: NextRequest, state: string): boolean {
    const stored = request.cookies.get(STATE_COOKIE)?.value;
    if (!stored)
        return false;
    try {
        return crypto.timingSafeEqual(Buffer.from(stored), Buffer.from(state));
    }
    catch {
        return false;
    }
}
export function clearStateCookie(response: NextResponse) {
    response.cookies.set(STATE_COOKIE, "", { path: "/", maxAge: 0 });
}
export function hasGoogleConfiguration(): boolean {
    return Boolean(process.env.GOOGLE_CLIENT_ID &&
        process.env.GOOGLE_CLIENT_SECRET &&
        process.env.SESSION_SECRET);
}

