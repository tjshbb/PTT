import type { GeoPoint, ResolvedPlace } from "@/lib/types";
import { fetchJson, IntegrationError } from "./http";
import type { GeocodeProvider } from "./types";

/**
 * Google Maps Platform — Geocoding API (reverse geocoding).
 * Turns lat/lng into a city + neighborhood for the user's home base.
 *
 * Requires the Geocoding API to be enabled on GOOGLE_MAPS_API_KEY (this is a
 * separate product from the Maps JavaScript API used for the map UI).
 */

const GEOCODE_BASE = "https://maps.googleapis.com/maps/api/geocode/json";

function apiKey(): string {
  const k = process.env.GOOGLE_MAPS_API_KEY;
  if (!k) throw new IntegrationError("GOOGLE_MAPS_API_KEY not set", "google_geocode");
  return k;
}

export const googleGeocode: GeocodeProvider = {
  async reverse(point: GeoPoint): Promise<ResolvedPlace | null> {
    const url =
      `${GEOCODE_BASE}?latlng=${point.lat},${point.lng}` +
      `&result_type=street_address|neighborhood|locality&key=${apiKey()}`;

    try {
      const data = await fetchJson<GeocodeResponse>(url, { provider: "google_geocode" });
      if (data.status !== "OK" || !data.results?.length) return null;
      return toResolvedPlace(data.results);
    } catch {
      return null; // graceful fallback — caller keeps coords without a label
    }
  },
};

/** Pull city + neighborhood out of the geocoder's address components. */
function toResolvedPlace(results: GeocodeResult[]): ResolvedPlace {
  const components = results.flatMap((r) => r.address_components ?? []);
  const pick = (type: string): string | undefined =>
    components.find((c) => c.types.includes(type))?.long_name;

  const city = pick("locality") ?? pick("postal_town") ?? pick("administrative_area_level_2");
  const neighborhood = pick("neighborhood") ?? pick("sublocality") ?? pick("sublocality_level_1");

  return {
    city,
    neighborhood,
    formatted: results[0]?.formatted_address,
  };
}

// --- Upstream response shapes (subset) ---
interface GeocodeResponse {
  status: string;
  results?: GeocodeResult[];
}

interface GeocodeResult {
  formatted_address?: string;
  address_components?: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
}
