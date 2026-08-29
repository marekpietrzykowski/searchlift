import { NextRequest, NextResponse } from "next/server";
import { buildDemoPayload } from "@/lib/demo-data";
export async function GET(request: NextRequest) {
    const raw = Number(request.nextUrl.searchParams.get("days") ?? 28);
    const days = raw === 90 ? 90 : 28;
    return NextResponse.json(buildDemoPayload(days));
}

