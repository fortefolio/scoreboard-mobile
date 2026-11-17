import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "@/lib/i18n";
import { SportIcon } from "@/components/SportIcon";
import { countSetsWon, extractSetsData } from "@/lib/scoring/sets";
import { formatTeamOrPlayerName } from "@/lib/utils/formatName";
import { ScoreBoardTheme } from "@/constants/theme";

export interface MatchListItemProps {
  match: any;
  onAuthRequired?: () => void;
}

export function MatchListItem({ match }: MatchListItemProps) {
  const { t } = useTranslation();
  const router = useRouter();

  const rawSetData = extractSetsData(match.scores);
  const setsWon = [countSetsWon(rawSetData, 0), countSetsWon(rawSetData, 1)];

  const getMainScore = (idx: number) => {
    if (match.sport_type === "Football") {
      return (
        match.scores?.football?.goals?.[idx] ??
        match.scores?.goals?.[idx] ??
        match.scores?.current?.[idx === 0 ? "home" : "away"] ??
        0
      );
    }
    if (match.sport_type === "Basketball") {
      return (
        match.scores?.basketball?.total_points?.[idx] ??
        match.scores?.total_points?.[idx] ??
        match.scores?.current?.[idx === 0 ? "home" : "away"] ??
        0
      );
    }
    return setsWon[idx];
  };

  const name0 =
    formatTeamOrPlayerName(match.participants?.[0]?.name) ||
    t("common.teamDefault", { num: "A" });
  const name1 =
    formatTeamOrPlayerName(match.participants?.[1]?.name) ||
    t("common.teamDefault", { num: "B" });

  const score0 = getMainScore(0);
  const score1 = getMainScore(1);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => router.push(`/match/${match.id}` as any)}
      activeOpacity={0.75}
    >
      {/* Sport Icon Pill */}
      <View style={styles.iconBox}>
        <SportIcon sport={match.sport_type} size={15} color={ScoreBoardTheme.onSurfaceVariant} />
      </View>

      {/* Teams & Vertically Aligned Scores */}
      <View style={styles.contentCol}>
        <View style={styles.teamRow}>
          <View style={styles.teamLine}>
            <Text style={styles.teamName} numberOfLines={1}>
              {name0}
            </Text>
          </View>
          <Text style={styles.scoreText}>{score0}</Text>
        </View>

        <View style={styles.teamRow}>
          <View style={styles.teamLine}>
            <Text style={styles.teamName} numberOfLines={1}>
              {name1}
            </Text>
          </View>
          <Text style={styles.scoreText}>{score1}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: ScoreBoardTheme.surfaceContainer,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 6,
    gap: 10,
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: ScoreBoardTheme.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    justifyContent: "center",
    alignItems: "center",
  },
  contentCol: {
    flex: 1,
    gap: 4,
  },
  teamRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  teamLine: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minWidth: 0,
  },
  teamDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  teamName: {
    fontSize: 13,
    fontWeight: "500",
    color: ScoreBoardTheme.onSurface,
  },
  scoreText: {
    fontFamily: "Digital7Mono",
    fontSize: 18,
    color: ScoreBoardTheme.onSurface,
    textAlign: "right",
    minWidth: 22,
    fontVariant: ["tabular-nums"],
  },
});
