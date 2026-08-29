import { NextRequest, NextResponse } from "next/server";
import { attachRefreshedCookie, getValidGoogleSession } from "@/lib/google-oauth";
import { loadPageExperiment } from "@/lib/gsc";

export async function GET(request: NextRequest) {
  const site = request.nextUrl.searchParams.get("site");
  const page = request.nextUrl.searchParams.get("page");
  const optimizedAt = request.nextUrl.searchParams.get("optimizedAt");
  const rawWindow = Number(request.nextUrl.searchParams.get("window") ?? 7);
  const window = rawWindow === 28 ? 28 : rawWindow === 14 ? 14 : 7;

  if (!site || !page || !optimizedAt) {
    return NextResponse.json({ error: "Brak site, page lub optimizedAt." }, { status: 400 });
  }

  try {
    const { session, refreshedCookie } = await getValidGoogleSession(request);
    const payload = await loadPageExperiment(
      session.accessToken,
      site,
      page,
      optimizedAt,
      window,
    );
    const response = NextResponse.json(payload);
    attachRefreshedCookie(response, refreshedCookie);
    return response;
  } catch (errorValue) {
    const message = errorValue instanceof Error ? errorValue.message : "Nie udało się zmierzyć eksperymentu.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
