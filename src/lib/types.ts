// Core domain types for DateSpark.
// Hard constraints are modeled separately from soft preferences and are never violated.

export type TransportMode = "WALK" | "TRANSIT" | "CAR" | "RIDESHARE";
export type BudgetBasis = "PER_PERSON" | "PER_COUPLE";
export type IdeaTier = "SAFE" | "NOVEL" | "SPLURGE";
export type Occasion =
  | "ANNIVERSARY"
  | "FIRST_DATE"
  | "CELEBRATION"
  | "CASUAL"
  | "SURPRISE"
  | "SOLO";

/** Constraints that must NEVER be violated by a generated idea. */
export interface HardConstraints {
  /** Budget ceiling in cents. Never exceeded. Never rounded up. */
  budgetCeilingCents: number;
  budgetBasis: BudgetBasis;
  /** Max travel distance from home base. At least one of these may be set. */
  maxMiles?: number;
  maxMinutes?: number;
  /** Food the user is allergic to. Excludes any venue that can't accommodate. */
  allergies: string[];
  /** Hard dietary requirements (e.g. halal, vegetarian-only). */
  dietary: string[];
  /** Accessibility requirements (e.g. step-free, wheelchair). */
  accessibilityNeeds: string[];
  /** If false, exclude alcohol-centric venues. */
  alcoholOk: boolean;
  /** When the date can happen — venues must be open in this window. */
  availableWindow?: { dayOfWeek: number; startHour: number; endHour: number };
}

/** Preferences used to RANK candidates. Soft — never used to exclude. */
export interface SoftPreferences {
  cuisinesLove: string[];
  cuisinesLike: string[];
  cuisinesAvoid: string[]; // down-rank, do not exclude
  activityTypes: string[];
  vibes: string[];
  /** Titles/venue ids from recent history to avoid repeating. */
  recentVenueIds: string[];
  /** Optional preference embedding for vector matching. */
  embedding?: number[];
}

export interface UserProfile {
  userId: string;
  homeBase: { city: string; neighborhood?: string; lat?: number; lng?: number };
  transport: TransportMode;
  hard: HardConstraints;
  soft: SoftPreferences;
  occasion: Occasion;
}

/** A bookable place pulled from a provider (never fabricated). */
export interface Venue {
  id: string;
  source: "google_places" | "yelp" | "ticketmaster" | "eventbrite" | "manual";
  name: string;
  category: string;
  lat: number;
  lng: number;
  /** Google price level 0-4 when available. */
  priceLevel?: number;
  rating?: number;
  mapUrl: string;
  /** Whether the source confirms accommodation of given dietary/accessibility needs. */
  accommodates?: { dietary?: string[]; accessibility?: string[]; allergies?: string[] };
  openHours?: Array<{ dayOfWeek: number; open: number; close: number }>;
}

export interface TimelineStep {
  /** e.g. "19:00" */
  time: string;
  label: string; // "Drinks at the rooftop bar"
  venueId?: string;
  estCostCents: number;
}

export interface BookingAction {
  kind: "reservation" | "ticket" | "none";
  provider: "resy" | "opentable" | "ticketmaster" | "eventbrite" | "none";
  /** Deep link that pre-fills the booking, or null when a handoff is required. */
  url: string | null;
  /** Human-readable handoff instructions when no direct link exists. */
  handoff?: string;
  /** True when a real partner API/key is required to complete in-app. */
  requiresPartnerApi: boolean;
}

export interface CostLineItem {
  label: string;
  cents: number;
  /** "api" = sourced from a provider; "estimate" = our estimate (must be labeled). */
  basis: "api" | "estimate";
}

export interface DateIdea {
  title: string;
  pitch: string; // why it fits THIS user
  tier: IdeaTier;
  timeline: TimelineStep[];
  venues: Venue[];
  estCostCents: number;
  costBreakdown: CostLineItem[];
  travelMinutes?: number;
  bookingActions: BookingAction[];
  /** True when slightly over ceiling — must be clearly labeled and optional. */
  isStretch: boolean;
}
