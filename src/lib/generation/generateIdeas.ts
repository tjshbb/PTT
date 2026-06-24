import type {
  DateIdea,
  IdeaTier,
  UserProfile,
  Venue,
} from "@/lib/types";
import { filterByHardConstraints } from "./filterHard";
import { rankBySoftPreferences, type ScoredVenue } from "./rankSoft";

export interface GenerateInput {
  profile: UserProfile;
  /** Candidate venues already fetched from providers (Maps/Yelp/Ticketmaster). */
  candidates: Venue[];
  travelMinutesById: Record<string, number>;
  /** How many ideas to return (3-5). */
  count?: number;
}

export interface GenerateOutput {
  ideas: DateIdea[];
  excluded: Array<{ venueId: string; reason: string }>;
}

/**
 * Orchestrates the generation pipeline:
 *   1. Filter by HARD constraints (fail closed).
 *   2. Rank survivors by SOFT preferences.
 *   3. Build a concrete plan per idea, spanning safe / novel / splurge.
 *   4. Respect the budget ceiling; label any stretch options.
 *
 * This is deterministic, testable scaffolding. In production the concrete
 * plan/pitch copy can be refined by the Claude API, but cost and constraint
 * checks always run here so the model can never violate a hard constraint.
 */
export function generateIdeas(input: GenerateInput): GenerateOutput {
  const { profile, candidates, travelMinutesById } = input;
  const count = clamp(input.count ?? 4, 3, 5);

  const { kept, excluded } = filterByHardConstraints(
    candidates,
    profile.hard,
    travelMinutesById,
  );
  const ranked = rankBySoftPreferences(kept, profile.soft);

  const ceiling = profile.hard.budgetCeilingCents;
  const tiers: IdeaTier[] = ["SAFE", "NOVEL", "SPLURGE"];
  const ideas: DateIdea[] = [];

  for (let i = 0; i < ranked.length && ideas.length < count; i++) {
    const scored = ranked[i]!;
    const tier = tiers[ideas.length % tiers.length]!;
    const idea = buildIdea(scored, tier, profile, travelMinutesById[scored.venue.id]);
    if (!idea) continue;
    // Hard rule: never exceed ceiling. Stretch = within 10% over, clearly labeled & optional.
    if (idea.estCostCents <= ceiling) {
      ideas.push(idea);
    } else if (tier === "SPLURGE" && idea.estCostCents <= Math.round(ceiling * 1.1)) {
      ideas.push({ ...idea, isStretch: true });
    }
  }

  return {
    ideas,
    excluded: excluded.map((e) => ({ venueId: e.venue.id, reason: e.reason })),
  };
}

function buildIdea(
  scored: ScoredVenue,
  tier: IdeaTier,
  profile: UserProfile,
  travelMinutes: number | undefined,
): DateIdea | null {
  const v = scored.venue;
  // Estimate cost from Google price level when present; otherwise a conservative
  // tier baseline. Estimates are explicitly labeled in the breakdown.
  const perPersonCents = estimatePerPersonCents(v.priceLevel, tier);
  const heads = profile.hard.budgetBasis === "PER_PERSON" ? 1 : 2;
  const venueCents = perPersonCents * heads;
  const travelCents = travelCostCents(profile.transport, travelMinutes);

  const estCostCents = venueCents + travelCents;
  const why =
    scored.reasons.length > 0
      ? `Fits because it ${scored.reasons.slice(0, 3).join(", ")}.`
      : `A solid ${tier.toLowerCase()} option near ${profile.homeBase.neighborhood ?? profile.homeBase.city}.`;

  return {
    title: titleFor(v, tier),
    pitch: why,
    tier,
    timeline: [
      { time: "19:00", label: `Arrive at ${v.name}`, venueId: v.id, estCostCents: 0 },
      { time: "19:30", label: `Main plan at ${v.name}`, venueId: v.id, estCostCents: venueCents },
    ],
    venues: [v],
    estCostCents,
    costBreakdown: [
      { label: `${v.name} (~${heads}x)`, cents: venueCents, basis: v.priceLevel != null ? "estimate" : "estimate" },
      { label: `Travel (${profile.transport.toLowerCase()})`, cents: travelCents, basis: "estimate" },
    ],
    travelMinutes,
    bookingActions: [bookingFor(v)],
    isStretch: false,
  };
}

function estimatePerPersonCents(priceLevel: number | undefined, tier: IdeaTier): number {
  // Google price level 0-4 → rough per-person spend. Clearly an estimate.
  const byLevel = [0, 1500, 3000, 6000, 12000];
  if (priceLevel != null && priceLevel >= 0 && priceLevel < byLevel.length) {
    return byLevel[priceLevel]!;
  }
  const byTier: Record<IdeaTier, number> = { SAFE: 2500, NOVEL: 3500, SPLURGE: 7000 };
  return byTier[tier];
}

function travelCostCents(mode: UserProfile["transport"], minutes: number | undefined): number {
  if (mode === "WALK" || mode === "TRANSIT") return mode === "TRANSIT" ? 600 : 0;
  if (minutes == null) return 0;
  // RIDESHARE/CAR rough estimate.
  return mode === "RIDESHARE" ? Math.round(minutes * 200) : Math.round(minutes * 50);
}

function titleFor(v: Venue, tier: IdeaTier): string {
  const prefix: Record<IdeaTier, string> = {
    SAFE: "Easy evening at",
    NOVEL: "Something different:",
    SPLURGE: "Treat yourselves at",
  };
  return `${prefix[tier]} ${v.name}`;
}

function bookingFor(v: Venue): DateIdea["bookingActions"][number] {
  // Reservation handoff depends on provider partnership status — see integrations.
  if (/restaurant|dining|bistro|izakaya/i.test(v.category)) {
    return {
      kind: "reservation",
      provider: "resy",
      url: null,
      handoff: `Search "${v.name}" on Resy/OpenTable to confirm a table. Direct booking requires partner API access.`,
      requiresPartnerApi: true,
    };
  }
  if (/concert|show|theater|event/i.test(v.category)) {
    return { kind: "ticket", provider: "ticketmaster", url: null, requiresPartnerApi: false };
  }
  return { kind: "none", provider: "none", url: v.mapUrl, requiresPartnerApi: false };
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
