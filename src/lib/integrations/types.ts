import type { Venue } from "@/lib/types";

/**
 * Clean, swappable provider interfaces. Every integration sits behind one of
 * these so providers can be replaced without touching generation logic.
 * Each implementation must handle auth, rate limits, retries, and graceful
 * fallback when the upstream API is unavailable.
 */

export interface PlacesProvider {
  searchVenues(query: PlacesQuery): Promise<Venue[]>;
  getVenue(id: string): Promise<Venue | null>;
}

export interface PlacesQuery {
  near: { lat: number; lng: number };
  radiusMeters: number;
  keyword?: string;
  category?: string;
  openAt?: { dayOfWeek: number; hour: number };
  maxPriceLevel?: number;
}

export interface TravelProvider {
  /** Returns travel minutes per destination venue id. */
  travelMinutes(
    origin: { lat: number; lng: number },
    destinations: Array<{ id: string; lat: number; lng: number }>,
    mode: "WALK" | "TRANSIT" | "CAR" | "RIDESHARE",
  ): Promise<Record<string, number>>;
}

export interface ReservationProvider {
  /** Availability check. May return [] when no partner API is configured. */
  availability(venue: Venue, when: Date, partySize: number): Promise<ReservationSlot[]>;
  /** Returns a deep link/handoff. Never auto-books — user always confirms. */
  bookingHandoff(venue: Venue, slot?: ReservationSlot): ReservationHandoff;
}

export interface ReservationSlot {
  time: string; // ISO
  partySize: number;
  /** True only when a real partner API can complete the booking in-app. */
  bookableInApp: boolean;
}

export interface ReservationHandoff {
  url: string | null;
  instructions: string;
  requiresPartnerApi: boolean;
}

export interface EventsProvider {
  searchEvents(query: PlacesQuery & { dateFrom: string; dateTo: string }): Promise<Venue[]>;
}

/** Shared retry helper contract — implementations import from ./http. */
export interface RetryOptions {
  retries: number;
  baseDelayMs: number;
}
