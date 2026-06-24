import type { Venue } from "@/lib/types";
import type { ReservationProvider, ReservationHandoff, ReservationSlot } from "./types";

/**
 * OpenTable integration.
 *
 * IMPORTANT: Like Resy, OpenTable does NOT offer a fully open public booking
 * API. Same three-path design: (a) partner API, (b) pre-filled deep link,
 * (c) availability + handoff fallback. Never auto-books.
 *
 * TODO(verify): OpenTable affiliate/partner program endpoints require approval.
 * Do not invent endpoints or response shapes. Until OPENTABLE_PARTNER_ID is set
 * and verified, we hand off via deep link.
 */

function hasPartnerAccess(): boolean {
  return Boolean(process.env.OPENTABLE_PARTNER_ID);
}

export const openTable: ReservationProvider = {
  async availability(_venue: Venue, _when: Date, _partySize: number): Promise<ReservationSlot[]> {
    if (!hasPartnerAccess()) return [];
    // TODO(verify): implement against real OpenTable partner API once approved.
    return [];
  },

  bookingHandoff(venue: Venue, slot?: ReservationSlot): ReservationHandoff {
    const params = new URLSearchParams({ term: venue.name });
    if (slot) params.set("dateTime", slot.time);
    const url = `https://www.opentable.com/s?${params.toString()}`;
    return {
      url,
      instructions: `Open OpenTable, confirm availability for "${venue.name}", and complete the booking yourself.`,
      requiresPartnerApi: !hasPartnerAccess(),
    };
  },
};
