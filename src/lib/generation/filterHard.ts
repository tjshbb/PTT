import type { HardConstraints, Venue } from "@/lib/types";

export interface FilterResult {
  kept: Venue[];
  excluded: Array<{ venue: Venue; reason: string }>;
}

/**
 * Step 1 of generation: exclude any venue that fails a HARD constraint.
 * Hard constraints are never violated. When a venue's source does not
 * confirm it can satisfy a safety constraint (allergy/dietary/accessibility),
 * we exclude it rather than assume — fail closed.
 */
export function filterByHardConstraints(
  venues: Venue[],
  hard: HardConstraints,
  travelMinutesById: Record<string, number>,
): FilterResult {
  const kept: Venue[] = [];
  const excluded: FilterResult["excluded"] = [];

  for (const v of venues) {
    const reason = firstFailure(v, hard, travelMinutesById[v.id]);
    if (reason) excluded.push({ venue: v, reason });
    else kept.push(v);
  }
  return { kept, excluded };
}

function firstFailure(
  v: Venue,
  hard: HardConstraints,
  travelMinutes: number | undefined,
): string | null {
  // Distance / travel-time ceiling.
  if (hard.maxMinutes != null && travelMinutes != null && travelMinutes > hard.maxMinutes) {
    return `travel ${travelMinutes}min exceeds max ${hard.maxMinutes}min`;
  }

  // Alcohol.
  if (!hard.alcoholOk && /\b(bar|brewery|winery|pub|nightclub)\b/i.test(v.category)) {
    return "alcohol-centric venue but user does not drink";
  }

  // Allergies — fail closed: require explicit accommodation when the user has any.
  for (const a of hard.allergies) {
    const ok = v.accommodates?.allergies?.some((x) => x.toLowerCase() === a.toLowerCase());
    if (!ok) return `cannot confirm allergy accommodation: ${a}`;
  }

  // Hard dietary requirements — fail closed.
  for (const d of hard.dietary) {
    const ok = v.accommodates?.dietary?.some((x) => x.toLowerCase() === d.toLowerCase());
    if (!ok) return `cannot confirm dietary requirement: ${d}`;
  }

  // Accessibility — fail closed.
  for (const need of hard.accessibilityNeeds) {
    const ok = v.accommodates?.accessibility?.some((x) => x.toLowerCase() === need.toLowerCase());
    if (!ok) return `cannot confirm accessibility need: ${need}`;
  }

  // Availability window — venue must be open.
  if (hard.availableWindow && v.openHours && v.openHours.length > 0) {
    const w = hard.availableWindow;
    const open = v.openHours.some(
      (h) => h.dayOfWeek === w.dayOfWeek && h.open <= w.startHour && h.close >= w.endHour,
    );
    if (!open) return "closed during the user's availability window";
  }

  return null;
}
