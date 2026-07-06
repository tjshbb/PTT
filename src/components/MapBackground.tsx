"use client";

import { useEffect, useRef, useState } from "react";
import { useLocation } from "@/components/LocationProvider";

type LatLng = { lat: number; lng: number };

type MapBackgroundProps = {
  center?: LatLng;
  zoom?: number;
  followUserLocation?: boolean;
};

const DEFAULT_CENTER: LatLng = { lat: 40.7128, lng: -74.006 };
const DEFAULT_ZOOM = 14;

const SCRIPT_ID = "google-maps-js";

const CALLBACK_NAME = "__paintTheTownInitMaps__";

function loadMapConstructor(apiKey: string): Promise<typeof google.maps.Map> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps can only load in the browser."));
  }
  if (window.google?.maps?.Map) {
    return Promise.resolve(window.google.maps.Map);
  }

  return new Promise((resolve, reject) => {
    const finish = () => {
      if (window.google?.maps?.Map) resolve(window.google.maps.Map);
      else reject(new Error("Google Maps loaded but the Map constructor is missing."));
    };

    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", finish);
      existing.addEventListener("error", () =>
        reject(new Error("Failed to load the Google Maps script.")),
      );
      return;
    }

    (window as unknown as Record<string, () => void>)[CALLBACK_NAME] = finish;

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src =
      `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}` +
      `&loading=async&libraries=maps&callback=${CALLBACK_NAME}`;
    script.async = true;
    script.onerror = () => reject(new Error("Failed to load the Google Maps script."));
    document.head.appendChild(script);
  });
}

export default function MapBackground({
  center = DEFAULT_CENTER,
  zoom = DEFAULT_ZOOM,
  followUserLocation = true,
}: MapBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const [failed, setFailed] = useState(false);
  const [reason, setReason] = useState<string | null>(null);

  const { point } = useLocation();

  const pointRef = useRef(point);
  useEffect(() => {
    pointRef.current = point;
  }, [point]);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      setReason("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set (restart `npm run dev`).");
      setFailed(true);
      return;
    }

    let cancelled = false;

    loadMapConstructor(apiKey)
      .then((MapCtor) => {
        if (cancelled || !containerRef.current) return;
        mapRef.current = new MapCtor(containerRef.current, {
          center: followUserLocation && pointRef.current ? pointRef.current : center,
          zoom,
          disableDefaultUI: true,
          gestureHandling: "none",
          keyboardShortcuts: false,
          clickableIcons: false,
          backgroundColor: "#0b0f19",
        });
      })
      .catch((err) => {
        console.error("Background map failed to initialize:", err);
        if (!cancelled) {
          setReason(err instanceof Error ? err.message : "Map failed to load.");
          setFailed(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [center, zoom, followUserLocation]);

  useEffect(() => {
    if (followUserLocation && point && mapRef.current) {
      mapRef.current.setCenter(point);
    }
  }, [followUserLocation, point]);

  return (
    <div className="fixed inset-0 -z-10" aria-hidden="true">
      <div
        className={`absolute inset-0 bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 transition-opacity ${
          failed ? "opacity-100" : "opacity-0"
        }`}
      />
      <div ref={containerRef} className="absolute inset-0 h-full w-full" />
      <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px]" />
      {failed && reason && process.env.NODE_ENV !== "production" && (
        <div className="absolute bottom-2 left-2 rounded bg-black/70 px-2 py-1 text-xs text-white">
          Map unavailable: {reason}
        </div>
      )}
    </div>
  );
}
