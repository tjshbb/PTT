import type { Venue } from "@/lib/types";
import { fetchJson, IntegrationError } from "./http";
import type { EventsProvider, PlacesQuery } from "./types";

/**
 * Ticketmaster Discovery API — concerts, shows, and local events.
 * Public API with an app key. Ticket purchase always hands off to Ticketmaster;
 * we never auto-purchase.
 *
 * TODO(verify): confirm Discovery API v2 query params and response fields
 * against current docs before production use.
 */

const BASE = "https://app.ticketmaster.com/discovery/v2/events.json";

function apiKey(): string {
  const k = process.env.TICKETMASTER_API_KEY;
  if (!k) throw new IntegrationError("TICKETMASTER_API_KEY not set", "ticketmaster");
  return k;
}

export const ticketmaster: EventsProvider = {
  async searchEvents(query: PlacesQuery & { dateFrom: string; dateTo: string }): Promise<Venue[]> {
    const params = new URLSearchParams({
      apikey: apiKey(),
      latlong: `${query.near.lat},${query.near.lng}`,
      radius: String(Math.round(query.radiusMeters / 1609)),
      unit: "miles",
      startDateTime: query.dateFrom,
      endDateTime: query.dateTo,
      size: "20",
    });
    if (query.keyword) params.set("keyword", query.keyword);

    try {
      const data = await fetchJson<TicketmasterResponse>(`${BASE}?${params.toString()}`, {
        provider: "ticketmaster",
      });
      const events = data._embedded?.events ?? [];
      return events.map(toVenue);
    } catch {
      return []; // graceful fallback — events simply omitted this run
    }
  },
};

function toVenue(e: TicketmasterEvent): Venue {
  const venue = e._embedded?.venues?.[0];
  return {
    id: e.id,
    source: "ticketmaster",
    name: e.name,
    category: e.classifications?.[0]?.segment?.name
      ? `event,${e.classifications[0]!.segment!.name}`
      : "event",
    lat: Number(venue?.location?.latitude ?? 0),
    lng: Number(venue?.location?.longitude ?? 0),
    rating: undefined,
    priceLevel: priceLevelFromRange(e.priceRanges),
    mapUrl: e.url,
  };
}

function priceLevelFromRange(ranges?: Array<{ min?: number }>): number | undefined {
  const min = ranges?.[0]?.min;
  if (min == null) return undefined;
  if (min < 25) return 1;
  if (min < 60) return 2;
  if (min < 120) return 3;
  return 4;
}

// --- Upstream response shapes (subset; verify) ---
interface TicketmasterResponse {
  _embedded?: { events?: TicketmasterEvent[] };
}
interface TicketmasterEvent {
  id: string;
  name: string;
  url: string;
  classifications?: Array<{ segment?: { name?: string } }>;
  priceRanges?: Array<{ min?: number; max?: number }>;
  _embedded?: { venues?: Array<{ location?: { latitude?: string; longitude?: string } }> };
}
