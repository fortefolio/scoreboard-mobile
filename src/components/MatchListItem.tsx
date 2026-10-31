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
        <SportIcon sport={match.sport_type} size={15} color="#c3c0ff" />
      </View>

      {/* Teams Column */}
      <View style={styles.teamsCol}>
        <View style={styles.teamLine}>
          <View style={[styles.teamDot, { backgroundColor: ScoreBoardTheme.primary }]} />
          <Text style={styles.teamName} numberOfLines={1}>
            {name0}
          </Text>
        </View>

        <View style={styles.teamLine}>
          <View style={[styles.teamDot, { backgroundColor: ScoreBoardTheme.secondary }]} />
          <Text style={styles.teamName} numberOfLines={1}>
            {name1}
          </Text>
        </View>
      </View>

      {/* Score */}
      <View style={styles.scoreCol}>
        <Text style={styles.scoreText}>
          {score0} - {score1}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: ScoreBoardTheme.surfaceContainerLow,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderGhost,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 6,
    gap: 12,
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "rgba(79, 70, 229, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(79, 70, 229, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  teamsCol: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  teamLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  teamDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  teamName: {
    fontSize: 12,
    fontWeight: "800",
    color: ScoreBoardTheme.onSurface,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  scoreCol: {
    alignItems: "flex-end",
    justifyContent: "center",
    paddingLeft: 8,
  },
  scoreText: {
    fontFamily: "Digital7",
    fontSize: 20,
    fontWeight: "900",
    color: ScoreBoardTheme.secondary,
    letterSpacing: 1,
  },
});
