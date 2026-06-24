import type { Venue } from "@/lib/types";
import type { ReservationProvider, ReservationHandoff, ReservationSlot } from "./types";

/**
 * Resy integration.
 *
 * IMPORTANT: Resy does NOT offer a fully open public booking API. This module
 * is designed for three paths, in priority order:
 *   (a) partner API access where granted (RESY_API_KEY),
 *   (b) a deep link that pre-fills the reservation,
 *   (c) a fallback that surfaces availability and hands off to Resy.
 *
 * Never auto-books — the user always confirms the final reservation.
 * TODO(verify): real Resy partner endpoints/response shapes require a signed
 * partnership. Do not invent endpoints. The availability() below returns [] and
 * we hand off via deep link until partner access is confirmed.
 */

function hasPartnerAccess(): boolean {
  return Boolean(process.env.RESY_API_KEY);
}

export const resy: ReservationProvider = {
  async availability(_venue: Venue, _when: Date, _partySize: number): Promise<ReservationSlot[]> {
    if (!hasPartnerAccess()) {
      // Path (c): no partner API → no programmatic availability. Hand off instead.
      return [];
    }
    // TODO(verify): implement against real Resy partner API once access is granted.
    // Must go through fetchJson() for retries/rate-limit handling.
    return [];
  },

  bookingHandoff(venue: Venue, _slot?: ReservationSlot): ReservationHandoff {
    // Path (b): pre-filled deep link / search link. Resy uses venue slugs that
    // we don't have without their API, so we hand off via a search URL.
    const url = `https://resy.com/cities?query=${encodeURIComponent(venue.name)}`;
    return {
      url,
      instructions: `Open Resy, confirm date/time/party size for "${venue.name}", and complete the booking yourself.`,
      requiresPartnerApi: !hasPartnerAccess(),
    };
  },
};
