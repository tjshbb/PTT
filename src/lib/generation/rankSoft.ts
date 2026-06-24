import type { SoftPreferences, Venue } from "@/lib/types";

export interface ScoredVenue {
  venue: Venue;
  score: number;
  reasons: string[];
}

/**
 * Step 2 of generation: rank the hard-constraint-passing venues by soft
 * preference fit. Soft prefs never exclude — they only order.
 */
export function rankBySoftPreferences(
  venues: Venue[],
  soft: SoftPreferences,
): ScoredVenue[] {
  return venues
    .map((venue) => score(venue, soft))
    .sort((a, b) => b.score - a.score);
}

function score(venue: Venue, soft: SoftPreferences): ScoredVenue {
  let score = 0;
  const reasons: string[] = [];
  const hay = `${venue.name} ${venue.category}`.toLowerCase();

  for (const c of soft.cuisinesLove) {
    if (hay.includes(c.toLowerCase())) {
      score += 3;
      reasons.push(`loves ${c}`);
    }
  }
  for (const c of soft.cuisinesLike) {
    if (hay.includes(c.toLowerCase())) {
      score += 1.5;
      reasons.push(`likes ${c}`);
    }
  }
  for (const c of soft.cuisinesAvoid) {
    if (hay.includes(c.toLowerCase())) {
      score -= 2;
      reasons.push(`tends to avoid ${c}`);
    }
  }
  for (const a of soft.activityTypes) {
    if (hay.includes(a.toLowerCase())) {
      score += 1;
      reasons.push(`matches ${a}`);
    }
  }
  for (const vibe of soft.vibes) {
    if (hay.includes(vibe.toLowerCase())) {
      score += 0.5;
      reasons.push(`${vibe} vibe`);
    }
  }

  // Avoid recent repeats.
  if (soft.recentVenueIds.includes(venue.id)) {
    score -= 4;
    reasons.push("visited recently");
  }

  // Quality nudge from provider rating, when present.
  if (venue.rating != null) score += (venue.rating - 3) * 0.5;

  // Optional embedding similarity hook.
  if (soft.embedding && (venue as { embedding?: number[] }).embedding) {
    score += cosineSimilarity(soft.embedding, (venue as { embedding?: number[] }).embedding!) * 2;
  }

  return { venue, score, reasons };
}

function cosineSimilarity(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < n; i++) {
    dot += a[i]! * b[i]!;
    na += a[i]! * a[i]!;
    nb += b[i]! * b[i]!;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
