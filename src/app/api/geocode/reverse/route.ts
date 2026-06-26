import { NextResponse } from "next/server";
import { geoPointSchema } from "@/lib/validation";
import { providers } from "@/lib/integrations";
import type { ResolvedPlace } from "@/lib/types";

export const runtime = "nodejs";

/**
 * POST /api/geocode/reverse
 * Body: { lat, lng }
 * Returns: ResolvedPlace ({ city?, neighborhood?, formatted? })
 *
 * Runs server-side so GOOGLE_MAPS_API_KEY stays off the client.
 */
export async function POST(req: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = geoPointSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  let place: ResolvedPlace | null;
  try {
    place = await providers.geocode.reverse(parsed.data);
  } catch (err) {
    return NextResponse.json(
      { error: "Geocoding unavailable", detail: String(err) },
      { status: 502 },
    );
  }

  // No match isn't an error — the caller keeps coordinates without a label.
  return NextResponse.json(place ?? {}, { status: 200 });
}
