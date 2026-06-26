"use client";

import { useState } from "react";
import { useLocation } from "@/components/LocationProvider";
import { useGenerateIdeas } from "@/components/useGenerateIdeas";
import type { DateIdea, Occasion } from "@/lib/types";

const OCCASIONS: Occasion[] = [
  "CASUAL",
  "FIRST_DATE",
  "ANNIVERSARY",
  "CELEBRATION",
  "SURPRISE",
  "SOLO",
];

export default function GenerateIdeasPanel() {
  const { status: locStatus, place, point, requestLocation } = useLocation();
  const { status, ideas, error, canGenerate, generate } = useGenerateIdeas();
  const [budget, setBudget] = useState(120);
  const [occasion, setOccasion] = useState<Occasion>("CASUAL");

  const locationLabel = describeLocation(place, point);

  return (
    <div className="rounded-xl border border-neutral-200 bg-white/70 p-5 text-sm text-neutral-700 shadow-lg backdrop-blur-md">
      <p className="font-medium">Generate date ideas</p>

      <p className="mt-1 text-neutral-600">
        {locationLabel ? (
          <>
            Near <span className="font-medium">{locationLabel}</span> (from your location)
          </>
        ) : (
          <>
            We need your location to find nearby ideas.{" "}
            <button
              type="button"
              onClick={requestLocation}
              className="font-medium text-brand underline"
            >
              {locStatus === "requesting" ? "Detecting…" : "Use my location"}
            </button>
          </>
        )}
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wide text-neutral-500">Budget (per couple)</span>
          <span className="flex items-center gap-2">
            <span className="text-neutral-500">$</span>
            <input
              type="number"
              min={0}
              step={10}
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              className="w-24 rounded border border-neutral-300 bg-white px-2 py-1"
            />
          </span>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wide text-neutral-500">Occasion</span>
          <select
            value={occasion}
            onChange={(e) => setOccasion(e.target.value as Occasion)}
            className="rounded border border-neutral-300 bg-white px-2 py-1"
          >
            {OCCASIONS.map((o) => (
              <option key={o} value={o}>
                {labelForOccasion(o)}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          disabled={!canGenerate || status === "loading"}
          onClick={() => generate({ budgetDollars: budget, occasion, budgetBasis: "PER_COUPLE" })}
          className="rounded-lg bg-brand px-4 py-2 font-medium text-white shadow-sm transition enabled:hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === "loading" ? "Finding ideas…" : "Generate ideas"}
        </button>
      </div>

      {error && <p className="mt-3 text-red-600">{error}</p>}

      {status === "ready" && ideas.length === 0 && (
        <p className="mt-3 text-neutral-600">
          No ideas matched within budget and distance. Try a higher budget or wider radius.
        </p>
      )}

      {ideas.length > 0 && (
        <ul className="mt-4 space-y-3">
          {ideas.map((idea, i) => (
            <IdeaCard key={`${idea.title}-${i}`} idea={idea} />
          ))}
        </ul>
      )}
    </div>
  );
}

function IdeaCard({ idea }: { idea: DateIdea }) {
  return (
    <li className="rounded-lg border border-neutral-200 bg-white/80 p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="font-medium text-neutral-900">{idea.title}</p>
        <span className="shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-xs uppercase tracking-wide text-neutral-600">
          {idea.tier.toLowerCase()}
        </span>
      </div>
      <p className="mt-1 text-neutral-600">{idea.pitch}</p>
      <p className="mt-2 text-neutral-700">
        Est. {formatCents(idea.estCostCents)}
        {idea.isStretch && <span className="ml-1 text-amber-600">(stretch — over budget)</span>}
        {idea.travelMinutes != null && (
          <span className="text-neutral-500"> · {idea.travelMinutes} min away</span>
        )}
      </p>
    </li>
  );
}

function describeLocation(
  place: ReturnType<typeof useLocation>["place"],
  point: ReturnType<typeof useLocation>["point"],
): string | null {
  if (place?.neighborhood && place.city) return `${place.neighborhood}, ${place.city}`;
  if (place?.city) return place.city;
  if (place?.formatted) return place.formatted;
  if (point) return `${point.lat.toFixed(3)}, ${point.lng.toFixed(3)}`;
  return null;
}

function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    cents / 100,
  );
}

function labelForOccasion(o: Occasion): string {
  return o
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
