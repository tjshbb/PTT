import { z } from "zod";

// Request validation for the ideas endpoint. Hard constraints are required;
// the budget ceiling and at least the city must always be present.
export const generateRequestSchema = z.object({
  occasion: z
    .enum(["ANNIVERSARY", "FIRST_DATE", "CELEBRATION", "CASUAL", "SURPRISE", "SOLO"])
    .default("CASUAL"),
  homeBase: z.object({
    city: z.string().min(1),
    neighborhood: z.string().optional(),
    lat: z.number().optional(),
    lng: z.number().optional(),
  }),
  transport: z.enum(["WALK", "TRANSIT", "CAR", "RIDESHARE"]).default("WALK"),
  hard: z.object({
    budgetCeilingCents: z.number().int().positive(),
    budgetBasis: z.enum(["PER_PERSON", "PER_COUPLE"]).default("PER_COUPLE"),
    maxMiles: z.number().positive().optional(),
    maxMinutes: z.number().int().positive().optional(),
    allergies: z.array(z.string()).default([]),
    dietary: z.array(z.string()).default([]),
    accessibilityNeeds: z.array(z.string()).default([]),
    alcoholOk: z.boolean().default(true),
  }),
  soft: z
    .object({
      cuisinesLove: z.array(z.string()).default([]),
      cuisinesLike: z.array(z.string()).default([]),
      cuisinesAvoid: z.array(z.string()).default([]),
      activityTypes: z.array(z.string()).default([]),
      vibes: z.array(z.string()).default([]),
      recentVenueIds: z.array(z.string()).default([]),
    })
    .default({
      cuisinesLove: [],
      cuisinesLike: [],
      cuisinesAvoid: [],
      activityTypes: [],
      vibes: [],
      recentVenueIds: [],
    }),
  count: z.number().int().min(3).max(5).optional(),
});

export type GenerateRequestBody = z.infer<typeof generateRequestSchema>;
