import type { Venue } from "@/lib/types";
import { fetchJson, IntegrationError } from "./http";
import type { PlacesProvider, PlacesQuery, TravelProvider } from "./types";

/**
 * Google Maps Platform — Places (search/details) + Distance Matrix (travel).
 *
 * NOTE: response shapes below follow the documented Places API (v1) and
 * Distance Matrix API as of this writing, but field names should be verified
 * against the live API before relying on them in production.
 * TODO(verify): confirm Places API (New) field masks + Distance Matrix schema.
 */

const PLACES_BASE = "https://places.googleapis.com/v1";
const DISTANCE_BASE = "https://maps.googleapis.com/maps/api/distancematrix/json";

function apiKey(): string {
  const k = process.env.GOOGLE_MAPS_API_KEY;
  if (!k) throw new IntegrationError("GOOGLE_MAPS_API_KEY not set", "google_maps");
  return k;
}

export const googlePlaces: PlacesProvider = {
  async searchVenues(query: PlacesQuery): Promise<Venue[]> {
    // TODO(verify): Places API (New) Text/Nearby Search request body & FieldMask.
    const body = {
      includedTypes: query.category ? [query.category] : undefined,
      maxResultCount: 20,
      locationRestriction: {
        circle: {
          center: { latitude: query.near.lat, longitude: query.near.lng },
          radius: query.radiusMeters,
        },
      },
    };
    const data = await fetchJson<{ places?: GooglePlace[] }>(
      `${PLACES_BASE}/places:searchNearby`,
      {
        provider: "google_maps",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey(),
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.location,places.priceLevel,places.rating,places.types,places.googleMapsUri,places.regularOpeningHours",
        },
        body: JSON.stringify(body),
      },
    );
    return (data.places ?? []).map(toVenue);
  },

  async getVenue(id: string): Promise<Venue | null> {
    try {
      const place = await fetchJson<GooglePlace>(`${PLACES_BASE}/places/${id}`, {
        provider: "google_maps",
        headers: {
          "X-Goog-Api-Key": apiKey(),
          "X-Goog-FieldMask":
            "id,displayName,location,priceLevel,rating,types,googleMapsUri,regularOpeningHours",
        },
      });
      return toVenue(place);
    } catch {
      return null; // graceful fallback — caller drops this candidate
    }
  },
};

export const googleTravel: TravelProvider = {
  async travelMinutes(origin, destinations, mode) {
    if (destinations.length === 0) return {};
    const modeParam = mapMode(mode);
    const dests = destinations.map((d) => `${d.lat},${d.lng}`).join("|");
    const url =
      `${DISTANCE_BASE}?origins=${origin.lat},${origin.lng}` +
      `&destinations=${encodeURIComponent(dests)}&mode=${modeParam}&key=${apiKey()}`;

    try {
      const data = await fetchJson<DistanceMatrixResponse>(url, { provider: "google_maps" });
      const row = data.rows?.[0]?.elements ?? [];
      const out: Record<string, number> = {};
      destinations.forEach((d, i) => {
        const el = row[i];
        if (el?.status === "OK" && el.duration) out[d.id] = Math.round(el.duration.value / 60);
      });
      return out;
    } catch {
      return {}; // fallback: unknown travel times → generation treats as no ceiling failure
    }
  },
};

function mapMode(mode: "WALK" | "TRANSIT" | "CAR" | "RIDESHARE"): string {
  switch (mode) {
    case "WALK":
      return "walking";
    case "TRANSIT":
      return "transit";
    default:
      return "driving";
  }
}

function toVenue(p: GooglePlace): Venue {
  return {
    id: p.id,
    source: "google_places",
    name: p.displayName?.text ?? "Unknown",
    category: (p.types ?? []).join(",") || "place",
    lat: p.location?.latitude ?? 0,
    lng: p.location?.longitude ?? 0,
    priceLevel: priceLevelToNumber(p.priceLevel),
    rating: p.rating,
    mapUrl: p.googleMapsUri ?? `https://www.google.com/maps/place/?q=place_id:${p.id}`,
    openHours: (p.regularOpeningHours?.periods ?? []).map((per) => ({
      dayOfWeek: per.open?.day ?? 0,
      open: (per.open?.hour ?? 0) + (per.open?.minute ?? 0) / 60,
      close: (per.close?.hour ?? 24) + (per.close?.minute ?? 0) / 60,
    })),
  };
}

function priceLevelToNumber(level?: string): number | undefined {
  const map: Record<string, number> = {
    PRICE_LEVEL_FREE: 0,
    PRICE_LEVEL_INEXPENSIVE: 1,
    PRICE_LEVEL_MODERATE: 2,
    PRICE_LEVEL_EXPENSIVE: 3,
    PRICE_LEVEL_VERY_EXPENSIVE: 4,
  };
  return level ? map[level] : undefined;
}

// --- Upstream response shapes (subset; verify against live API) ---
interface GooglePlace {
  id: string;
  displayName?: { text: string };
  location?: { latitude: number; longitude: number };
  priceLevel?: string;
  rating?: number;
  types?: string[];
  googleMapsUri?: string;
  regularOpeningHours?: {
    periods?: Array<{
      open?: { day: number; hour: number; minute: number };
      close?: { day: number; hour: number; minute: number };
    }>;
  };
}

interface DistanceMatrixResponse {
  rows?: Array<{
    elements?: Array<{ status: string; duration?: { value: number } }>;
  }>;
}
