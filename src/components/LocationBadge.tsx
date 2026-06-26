"use client";

import { useLocation } from "@/components/LocationProvider";

/**
 * Small status chip showing the captured location and offering a retry when the
 * browser prompt was declined or unavailable. Reads from the shared
 * LocationProvider — it does not request location itself.
 */
export default function LocationBadge() {
  const { status, place, point, persisted, requestLocation } = useLocation();

  const label = describePlace(place, point);

  if (status === "granted") {
    return (
      <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-sm text-neutral-700 shadow-sm backdrop-blur-md">
        <span aria-hidden="true">📍</span>
        <span>
          Using your location: <span className="font-medium">{label}</span>
        </span>
        {persisted && <span className="text-xs text-neutral-500">(saved)</span>}
      </div>
    );
  }

  if (status === "requesting" || status === "idle") {
    return (
      <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-sm text-neutral-600 shadow-sm backdrop-blur-md">
        <span aria-hidden="true">📍</span>
        <span>Detecting your location…</span>
      </div>
    );
  }

  // denied / unavailable / error
  return (
    <button
      type="button"
      onClick={requestLocation}
      className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-sm text-neutral-700 shadow-sm backdrop-blur-md transition hover:bg-white"
    >
      <span aria-hidden="true">📍</span>
      <span>Location off — tap to use your location</span>
    </button>
  );
}

function describePlace(
  place: ReturnType<typeof useLocation>["place"],
  point: ReturnType<typeof useLocation>["point"],
): string {
  if (place?.neighborhood && place.city) return `${place.neighborhood}, ${place.city}`;
  if (place?.city) return place.city;
  if (place?.formatted) return place.formatted;
  if (point) return `${point.lat.toFixed(3)}, ${point.lng.toFixed(3)}`;
  return "your area";
}
