import { NextResponse } from "next/server";
import { generateRequestSchema } from "@/lib/validation";
import { generateIdeas } from "@/lib/generation/generateIdeas";
import { providers } from "@/lib/integrations";
import type { UserProfile, Venue } from "@/lib/types";

export const runtime = "nodejs";

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

  if (!origin) {
    return NextResponse.json(
      { error: "homeBase.lat/lng required to query venue providers" },
      { status: 422 },
    );
  }

  const candidates: Venue[] = [];
  const radiusMeters = Math.round((input.hard.maxMiles ?? 5) * 1609);

  const [placesRes, eventsRes] = await Promise.allSettled([
    providers.places.searchVenues({ near: origin, radiusMeters }),
    providers.events.searchEvents({
      near: origin,
      radiusMeters,
      dateFrom: new Date().toISOString(),
      dateTo: new Date(Date.now() + 14 * 864e5).toISOString(),
    }),
  ]);

  if (placesRes.status === "fulfilled") {
    candidates.push(...placesRes.value);
  } else {
    console.error("Places provider failed:", placesRes.reason);
  }
  if (eventsRes.status === "fulfilled") {
    candidates.push(...eventsRes.value);
  } else {
    console.error("Events provider failed:", eventsRes.reason);
  }

  if (candidates.length === 0 && placesRes.status === "rejected") {
    return NextResponse.json(
      { error: "Venue providers unavailable", detail: String(placesRes.reason) },
      { status: 502 },
    );
  }

  const travelMinutesById = await providers.travel.travelMinutes(
    origin,
    candidates.map((c) => ({ id: c.id, lat: c.lat, lng: c.lng })),
    input.transport,
  );

  const profile: UserProfile = {
    userId: "anonymous",
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
