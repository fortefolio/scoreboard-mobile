import { extractSetsData, countSetsWon } from "@/lib/scoring/sets";

export function formatMatchScore(m: any): { score0: number; score1: number } {
  const rawSetData = extractSetsData(m?.scores);
  if (m?.sport_type === "Football") {
    return {
      score0:
        m.scores?.football?.goals?.[0] ??
        m.scores?.goals?.[0] ??
        m.scores?.current?.home ??
        0,
      score1:
        m.scores?.football?.goals?.[1] ??
        m.scores?.goals?.[1] ??
        m.scores?.current?.away ??
        0,
    };
  }
  if (m?.sport_type === "Basketball") {
    return {
      score0:
        m.scores?.basketball?.total_points?.[0] ??
        m.scores?.total_points?.[0] ??
        m.scores?.current?.home ??
        0,
      score1:
        m.scores?.basketball?.total_points?.[1] ??
        m.scores?.total_points?.[1] ??
        m.scores?.current?.away ??
        0,
    };
  }
  return {
    score0: countSetsWon(rawSetData, 0),
    score1: countSetsWon(rawSetData, 1),
  };
}

export function formatShortDate(dateValue?: string | null): string {
  if (!dateValue) return "-";
  return new Date(dateValue).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTournamentDate(dateValue?: string | null): string {
  if (!dateValue) return "-";
  return new Date(dateValue).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function getTournamentFormatLabel(
  tItem: any,
  t: (key: string) => string
): string {
  const stageType = tItem?.settings?.stage_1?.type;
  if (stageType === "groups") return t("tournament.groupStage");
  if (stageType === "double_elimination")
    return t("tournament.doubleElimination");
  return t("tournament.singleElimination");
}
