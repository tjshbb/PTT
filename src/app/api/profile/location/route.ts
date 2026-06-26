import { NextResponse } from "next/server";
import { locationUpdateSchema } from "@/lib/validation";
import { providers } from "@/lib/integrations";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

/**
 * POST /api/profile/location
 * Body: LocationUpdateBody ({ lat, lng, accuracyMeters?, city?, neighborhood? })
 * Persists the user's captured location to their profile (Location model).
 *
 * Auth: this must be tied to the signed-in user. Until NextAuth is wired we
 * resolve the user id from an `x-user-id` header or the DEV_USER_ID env var.
 * TODO(auth): replace resolveUserId with the session user once Auth.js is set up.
 */
export async function POST(req: Request): Promise<NextResponse> {
  const userId = resolveUserId(req);
  if (!userId) {
    return NextResponse.json(
      { error: "Not authenticated", detail: "No session user (auth not yet wired)." },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = locationUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 },
    );
  }
  const input = parsed.data;

  // Fill in city/neighborhood server-side when the client didn't supply them,
  // so the stored profile always has a usable home-base label.
  let city = input.city;
  let neighborhood = input.neighborhood;
  if (!city) {
    const resolved = await providers.geocode
      .reverse({ lat: input.lat, lng: input.lng })
      .catch(() => null);
    city = resolved?.city ?? resolved?.formatted ?? "Unknown";
    neighborhood = neighborhood ?? resolved?.neighborhood;
  }

  try {
    const location = await prisma.location.upsert({
      where: { userId },
      create: { userId, city, neighborhood, lat: input.lat, lng: input.lng },
      update: { city, neighborhood, lat: input.lat, lng: input.lng },
    });
    return NextResponse.json({ ok: true, location }, { status: 200 });
  } catch (err) {
    // Most likely the DB isn't configured/migrated or the user row doesn't
    // exist yet. Surface clearly rather than pretending it persisted.
    return NextResponse.json(
      { error: "Could not persist location", detail: String(err) },
      { status: 503 },
    );
  }
}

/**
 * Resolve the current user id. Placeholder until Auth.js is wired.
 * Order: explicit header (for testing) → DEV_USER_ID env → none.
 */
function resolveUserId(req: Request): string | null {
  return req.headers.get("x-user-id") || process.env.DEV_USER_ID || null;
}
