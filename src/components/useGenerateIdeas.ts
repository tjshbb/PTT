"use client";

import { useCallback, useState } from "react";
import { useLocation } from "@/components/LocationProvider";
import type { BudgetBasis, DateIdea, Occasion, TransportMode } from "@/lib/types";

export interface GenerateParams {
  budgetDollars: number;
  budgetBasis?: BudgetBasis;
  occasion?: Occasion;
  transport?: TransportMode;
  maxMiles?: number;
  count?: number;
}

interface IdeasResult {
  ideas: DateIdea[];
  excluded: Array<{ venueId: string; reason: string }>;
}

export type GenerateStatus = "idle" | "loading" | "ready" | "error";

export interface UseGenerateIdeas {
  status: GenerateStatus;
  ideas: DateIdea[];
  error: string | null;
  canGenerate: boolean;
  generate: (params: GenerateParams) => Promise<void>;
}

export function useGenerateIdeas(): UseGenerateIdeas {
  const { point, place } = useLocation();
  const [status, setStatus] = useState<GenerateStatus>("idle");
  const [ideas, setIdeas] = useState<DateIdea[]>([]);
  const [error, setError] = useState<string | null>(null);

  const canGenerate = point != null;

  const generate = useCallback(
    async (params: GenerateParams) => {
      if (!point) {
        setStatus("error");
        setError("Location not available yet — enable location to generate ideas.");
        return;
      }

      setStatus("loading");
      setError(null);

      const body = {
        occasion: params.occasion,
        transport: params.transport,
        homeBase: {
          city: place?.city ?? place?.formatted ?? "Current location",
          neighborhood: place?.neighborhood,
          lat: point.lat,
          lng: point.lng,
        },
        hard: {
          budgetCeilingCents: Math.round(params.budgetDollars * 100),
          budgetBasis: params.budgetBasis,
          maxMiles: params.maxMiles,
        },
        count: params.count,
      };

      try {
        const res = await fetch("/api/ideas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = (await res.json()) as IdeasResult | { error: string };

        if (!res.ok) {
          setStatus("error");
          setError("error" in data ? data.error : `Request failed (${res.status})`);
          return;
        }

        setIdeas((data as IdeasResult).ideas);
        setStatus("ready");
      } catch (err) {
        setStatus("error");
        setError(err instanceof Error ? err.message : "Network error");
      }
    },
    [point, place],
  );

  return { status, ideas, error, canGenerate, generate };
}
