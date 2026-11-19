export * from "./types";
export * from "./LanguageContext";
export { en } from "./locales/en";
export { pt } from "./locales/pt";

import { useLanguage } from "./LanguageContext";
import { findSport } from "@/lib/sports";
export const useTranslation = useLanguage;

export const getSportTranslation = (
  sport?: string | null,
  t?: (key: string, p?: any) => string
): string => {
  if (!sport) return "";
  if (!t) return sport;
  const matched = findSport(sport);
  if (matched) {
    return t(`sports.${matched.i18nKey}`);
  }
  return sport;
};
