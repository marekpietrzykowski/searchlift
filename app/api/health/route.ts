import { NextResponse } from "next/server";
import { hasGoogleConfiguration } from "@/lib/google-oauth";
export function GET() {
    return NextResponse.json({
        ok: true,
        app: "SearchLift",
        version: "4.0.0",
        googleConfigured: hasGoogleConfiguration(),
        timestamp: new Date().toISOString(),
    });
}

