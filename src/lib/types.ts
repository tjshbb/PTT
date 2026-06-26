// Core domain types for DateSpark.
// Hard constraints are modeled separately from soft preferences and are never violated.

/** A latitude/longitude pair. */
export interface GeoPoint {
  lat: number;
  lng: number;
}

/** Human-readable place resolved from coordinates via reverse geocoding. */
export interface ResolvedPlace {
  city?: string;
  neighborhood?: string;
  /** Full formatted address string when available. */
  formatted?: string;
}

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

export interface HardConstraints {
  budgetCeilingCents: number;
  budgetBasis: BudgetBasis;
  maxMiles?: number;
  maxMinutes?: number;
  allergies: string[];
  dietary: string[];
  accessibilityNeeds: string[];
  alcoholOk: boolean;
  availableWindow?: { dayOfWeek: number; startHour: number; endHour: number };
}

export interface SoftPreferences {
  cuisinesLove: string[];
  cuisinesLike: string[];
  cuisinesAvoid: string[];
  activityTypes: string[];
  vibes: string[];
  recentVenueIds: string[];
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

export interface Venue {
  id: string;
  source: "google_places" | "yelp" | "ticketmaster" | "eventbrite" | "manual";
  name: string;
  category: string;
  lat: number;
  lng: number;
  priceLevel?: number;
  rating?: number;
  mapUrl: string;
  accommodates?: { dietary?: string[]; accessibility?: string[]; allergies?: string[] };
  openHours?: Array<{ dayOfWeek: number; open: number; close: number }>;
}

export interface TimelineStep {
  time: string;
  label: string;
  venueId?: string;
  estCostCents: number;
}

export interface BookingAction {
  kind: "reservation" | "ticket" | "none";
  provider: "resy" | "opentable" | "ticketmaster" | "eventbrite" | "none";
  url: string | null;
  handoff?: string;
  requiresPartnerApi: boolean;
}

export interface CostLineItem {
  label: string;
  cents: number;
  basis: "api" | "estimate";
}

export interface DateIdea {
  title: string;
  pitch: string;
  tier: IdeaTier;
  timeline: TimelineStep[];
  venues: Venue[];
  estCostCents: number;
  costBreakdown: CostLineItem[];
  travelMinutes?: number;
  bookingActions: BookingAction[];
  isStretch: boolean;
}
