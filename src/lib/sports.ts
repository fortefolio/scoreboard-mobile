import type { Translations } from "@/lib/i18n/types";

export interface SportDefinition {
  /** Canonical sport_type value stored in Supabase (matches & tournaments). */
  value: "Basketball" | "Beach Volleyball" | "Football" | "Padel" | "Tennis" | "Volleyball";
  /** Lowercase snake_case slug used for background assets and user preferences. */
  slug: "basketball" | "beach_volleyball" | "football" | "padel" | "tennis" | "volleyball";
  /** Key under `t("sports.<key>")`. */
  i18nKey: Exclude<keyof Translations["sports"], "all">;
}

/**
 * Single source of truth for all supported sports, ordered alphabetically.
 */
export const SUPPORTED_SPORTS: readonly SportDefinition[] = [
  { value: "Basketball", slug: "basketball", i18nKey: "basketball" },
  { value: "Beach Volleyball", slug: "beach_volleyball", i18nKey: "beachVolleyball" },
  { value: "Football", slug: "football", i18nKey: "football" },
  { value: "Padel", slug: "padel", i18nKey: "padel" },
  { value: "Tennis", slug: "tennis", i18nKey: "tennis" },
  { value: "Volleyball", slug: "volleyball", i18nKey: "volleyball" },
] as const;

export type SportValue = (typeof SUPPORTED_SPORTS)[number]["value"];
export type SportSlug = (typeof SUPPORTED_SPORTS)[number]["slug"];

export const SUPPORTED_SPORT_VALUES: SportValue[] = SUPPORTED_SPORTS.map((s) => s.value);
export const SUPPORTED_SPORT_SLUGS: SportSlug[] = SUPPORTED_SPORTS.map((s) => s.slug);

export function findSport(input?: string | null): SportDefinition | undefined {
  if (!input) return undefined;
  const normalized = input.trim().toLowerCase().replace(/\s+/g, "_");
  return SUPPORTED_SPORTS.find(
    (s) => s.slug === normalized || s.value.toLowerCase() === input.trim().toLowerCase()
  );
}
