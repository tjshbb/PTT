/**
 * Lightweight, dependency-free assertions for the generation pipeline.
 * Run with:  npx tsx src/lib/generation/__tests__/generateIdeas.test.ts
 * (or wire into Vitest/Jest later). Exits non-zero on failure.
 */
import { generateIdeas } from "../generateIdeas";
import type { UserProfile, Venue } from "@/lib/types";

let failures = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) {
    failures++;
    console.error("✗", msg);
  } else {
    console.log("✓", msg);
  }
}

const baseProfile = (over: Partial<UserProfile["hard"]> = {}): UserProfile => ({
  userId: "u1",
  homeBase: { city: "Brooklyn", neighborhood: "Williamsburg", lat: 40.71, lng: -73.96 },
  transport: "WALK",
  hard: {
    budgetCeilingCents: 8000,
    budgetBasis: "PER_COUPLE",
    maxMinutes: 30,
    allergies: [],
    dietary: [],
    accessibilityNeeds: [],
    alcoholOk: true,
    ...over,
  },
  soft: {
    cuisinesLove: ["italian"],
    cuisinesLike: [],
    cuisinesAvoid: [],
    activityTypes: ["foodie"],
    vibes: ["romantic"],
    recentVenueIds: [],
  },
  occasion: "CASUAL",
});

const venues: Venue[] = [
  { id: "a", source: "google_places", name: "Trattoria Romantica (italian)", category: "restaurant,italian", lat: 40.71, lng: -73.96, priceLevel: 2, rating: 4.6, mapUrl: "#" },
  { id: "b", source: "google_places", name: "Dive Bar", category: "bar", lat: 40.71, lng: -73.96, priceLevel: 1, rating: 4.0, mapUrl: "#" },
  { id: "c", source: "google_places", name: "Sushi Counter", category: "restaurant,japanese", lat: 40.8, lng: -73.96, priceLevel: 3, rating: 4.8, mapUrl: "#" },
];
const travel = { a: 10, b: 12, c: 45 };

// 1. Budget ceiling is respected.
const r1 = generateIdeas({ profile: baseProfile(), candidates: venues, travelMinutesById: travel });
assert(r1.ideas.every((i) => i.estCostCents <= 8000 || i.isStretch), "no idea exceeds ceiling unless labeled stretch");
assert(r1.ideas.length >= 1, "produces at least one idea");

// 2. Distance ceiling excludes far venue "c" (45min > 30min).
assert(r1.excluded.some((e) => e.venueId === "c"), "venue beyond max travel time is excluded");

// 3. Alcohol-off excludes the bar.
const r2 = generateIdeas({ profile: baseProfile({ alcoholOk: false }), candidates: venues, travelMinutesById: travel });
assert(r2.excluded.some((e) => e.venueId === "b"), "bar excluded when alcoholOk=false");

// 4. Allergy with no confirmed accommodation excludes everything (fail closed).
const r3 = generateIdeas({ profile: baseProfile({ allergies: ["peanuts"] }), candidates: venues, travelMinutesById: travel });
assert(r3.ideas.length === 0, "fail-closed: unconfirmed allergy accommodation excludes all");

// 5. Loved cuisine ranks first.
assert(r1.ideas[0]?.venues[0]?.id === "a", "loved-cuisine venue ranks first");

console.log(failures === 0 ? "\nAll passed." : `\n${failures} failed.`);
process.exit(failures === 0 ? 0 : 1);
