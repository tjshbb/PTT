import type { GeoPoint, ResolvedPlace, Venue } from "@/lib/types";

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
  travelMinutes(
    origin: { lat: number; lng: number },
    destinations: Array<{ id: string; lat: number; lng: number }>,
    mode: "WALK" | "TRANSIT" | "CAR" | "RIDESHARE",
  ): Promise<Record<string, number>>;
}

export interface ReservationProvider {
  availability(venue: Venue, when: Date, partySize: number): Promise<ReservationSlot[]>;
  bookingHandoff(venue: Venue, slot?: ReservationSlot): ReservationHandoff;
}

export interface ReservationSlot {
  time: string;
  partySize: number;
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

export interface GeocodeProvider {
  /** Resolve coordinates to a city/neighborhood. Returns null on failure. */
  reverse(point: GeoPoint): Promise<ResolvedPlace | null>;
}

export interface RetryOptions {
  retries: number;
  baseDelayMs: number;
}
