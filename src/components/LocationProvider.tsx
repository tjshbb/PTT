"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { GeoPoint, ResolvedPlace } from "@/lib/types";

export type LocationStatus =
  | "idle" // haven't asked yet
  | "requesting" // browser prompt is up / resolving
  | "granted" // we have coordinates
  | "denied" // user declined
  | "unavailable" // no geolocation API / position unavailable
  | "error"; // unexpected failure

export interface LocationState {
  status: LocationStatus;
  point: GeoPoint | null;
  accuracyMeters: number | null;
  place: ResolvedPlace | null;
  /** True once the location was saved to the user's profile. */
  persisted: boolean;
  error: string | null;
}

export interface LocationContextValue extends LocationState {
  /** Trigger (or re-trigger) the browser location prompt. */
  requestLocation: () => void;
}

const INITIAL: LocationState = {
  status: "idle",
  point: null,
  accuracyMeters: null,
  place: null,
  persisted: false,
  error: null,
};

const LocationContext = createContext<LocationContextValue | null>(null);

export function useLocation(): LocationContextValue {
  const ctx = useContext(LocationContext);
  if (!ctx) {
    throw new Error("useLocation must be used within <LocationProvider>.");
  }
  return ctx;
}

export interface LocationProviderProps {
  children: ReactNode;
  /** Ask for location automatically on mount. Default true. */
  autoRequest?: boolean;
  /** Save the captured location to the user's profile. Default true. */
  persist?: boolean;
}

export function LocationProvider({
  children,
  autoRequest = true,
  persist = true,
}: LocationProviderProps) {
  const [state, setState] = useState<LocationState>(INITIAL);
  const aliveRef = useRef(true);
  const requestedRef = useRef(false);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const requestLocation = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setState((s) => ({ ...s, status: "unavailable" }));
      return;
    }

    setState((s) => ({ ...s, status: "requesting", error: null }));

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        if (!aliveRef.current) return;
        const point: GeoPoint = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const accuracyMeters = pos.coords.accuracy;
        setState((s) => ({ ...s, status: "granted", point, accuracyMeters }));

        // Reverse geocode for a human-readable label (best-effort).
        const place = await reverseGeocode(point).catch(() => null);
        if (aliveRef.current && place) {
          setState((s) => ({ ...s, place }));
        }

        // Persist to the user's profile (best-effort; needs auth + DB).
        if (persist) {
          const ok = await saveLocation({
            ...point,
            accuracyMeters,
            city: place?.city,
            neighborhood: place?.neighborhood,
          }).catch(() => false);
          if (aliveRef.current && ok) {
            setState((s) => ({ ...s, persisted: true }));
          }
        }
      },
      (err) => {
        if (!aliveRef.current) return;
        const status: LocationStatus =
          err.code === err.PERMISSION_DENIED
            ? "denied"
            : err.code === err.POSITION_UNAVAILABLE
              ? "unavailable"
              : "error";
        setState((s) => ({ ...s, status, error: err.message }));
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }, [persist]);

  useEffect(() => {
    if (autoRequest && !requestedRef.current) {
      requestedRef.current = true;
      requestLocation();
    }
  }, [autoRequest, requestLocation]);

  return (
    <LocationContext.Provider value={{ ...state, requestLocation }}>
      {children}
    </LocationContext.Provider>
  );
}

async function reverseGeocode(point: GeoPoint): Promise<ResolvedPlace | null> {
  const res = await fetch("/api/geocode/reverse", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(point),
  });
  if (!res.ok) return null;
  return (await res.json()) as ResolvedPlace;
}

interface SaveLocationPayload extends GeoPoint {
  accuracyMeters: number;
  city?: string;
  neighborhood?: string;
}

async function saveLocation(payload: SaveLocationPayload): Promise<boolean> {
  const res = await fetch("/api/profile/location", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.ok;
}
