import { NextResponse } from "next/server";
import { generateRequestSchema } from "@/lib/validation";
import { generateIdeas } from "@/lib/generation/generateIdeas";
import { providers } from "@/lib/integrations";
import type { UserProfile, Venue } from "@/lib/types";

export const runtime = "nodejs";

/**
 * POST /api/ideas
 * Body: GenerateRequestBody (see src/lib/validation.ts)
 * Returns 3-5 date ideas that respect all hard constraints.
 *
 * Pipeline: fetch candidate venues (Places + events) → compute travel times →
 * run generation (filter hard, rank soft, build plan, respect budget).
 */
export async function POST(req: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = generateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 },
    );
  }
  const input = parsed.data;

  const origin =
    input.homeBase.lat != null && input.homeBase.lng != null
      ? { lat: input.homeBase.lat, lng: input.homeBase.lng }
      : null;

  // Fetch candidates. If we have no coordinates we can't query providers yet —
  // return a clear error rather than fabricating venues.
  if (!origin) {
    return NextResponse.json(
      { error: "homeBase.lat/lng required to query venue providers" },
      { status: 422 },
    );
  }

  let candidates: Venue[] = [];
  try {
    const radiusMeters = Math.round((input.hard.maxMiles ?? 5) * 1609);
    const [places, events] = await Promise.all([
      providers.places.searchVenues({ near: origin, radiusMeters }),
      providers.events.searchEvents({
        near: origin,
        radiusMeters,
        dateFrom: new Date().toISOString(),
        dateTo: new Date(Date.now() + 14 * 864e5).toISOString(),
      }),
    ]);
    candidates = [...places, ...events];
  } catch (err) {
    // Providers handle their own retries/fallback; a throw here is unexpected.
    return NextResponse.json(
      { error: "Venue providers unavailable", detail: String(err) },
      { status: 502 },
    );
  }

  const travelMinutesById = await providers.travel.travelMinutes(
    origin,
    candidates.map((c) => ({ id: c.id, lat: c.lat, lng: c.lng })),
    input.transport,
  );

  const profile: UserProfile = {
    userId: "anonymous", // TODO: replace with session user id once auth is wired
    homeBase: input.homeBase,
    transport: input.transport,
    hard: input.hard,
    soft: { ...input.soft, embedding: undefined },
    occasion: input.occasion,
  };

  const result = generateIdeas({
    profile,
    candidates,
    travelMinutesById,
    count: input.count,
  });

  return NextResponse.json(result, { status: 200 });
}
