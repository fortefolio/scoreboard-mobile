import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation, getSportTranslation } from "@/lib/i18n";
import { SportIcon } from "@/components/SportIcon";
import { FollowButton } from "@/components/FollowButton";
import { countSetsWon, extractSetsData } from "@/lib/scoring/sets";
import { formatTeamOrPlayerName } from "@/lib/utils/formatName";
import { ScoreBoardTheme } from "@/constants/theme";

export interface MatchListItemProps {
  match: any;
  onAuthRequired?: () => void;
}

export function MatchListItem({ match, onAuthRequired }: MatchListItemProps) {
  const { t } = useTranslation();
  const router = useRouter();

  const isOngoing = match.status === "ongoing";
  const rawSetData = extractSetsData(match.scores);
  const setScores = Array.isArray(rawSetData)
    ? rawSetData.map((s: any) => {
        if (Array.isArray(s)) return { t1: s[0] ?? 0, t2: s[1] ?? 0 };
        return { t1: s.team1 ?? s.home ?? 0, t2: s.team2 ?? s.away ?? 0 };
      })
    : [];

  const setsWon = [countSetsWon(rawSetData, 0), countSetsWon(rawSetData, 1)];
  const isBeachVolleyball =
    match.sport_type === "Beach Volleyball" || match.sport_type === "beach_volleyball";
  const setsToWin = isBeachVolleyball ? 2 : 3;
  const isMatchFinished =
    match.status === "completed" ||
    (match.sport_type !== "Football" &&
      match.sport_type !== "Basketball" &&
      (setsWon[0] >= setsToWin || setsWon[1] >= setsToWin));
  const isOngoingDisplay = isOngoing && !isMatchFinished;

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

      {/* Score and Sets breakdown */}
      <View style={styles.scoreCol}>
        <Text style={styles.scoreText}>
          {score0} - {score1}
        </Text>
        {setScores.length > 0 && match.sport_type !== "Football" && (
          <Text style={styles.setsText} numberOfLines={1}>
            {setScores.map((s: any) => `${s.t1}-${s.t2}`).join(", ")}
          </Text>
        )}
      </View>

      {/* Status Pill */}
      <View style={styles.statusCol}>
        {isOngoingDisplay ? (
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>{t("status.live")}</Text>
          </View>
        ) : (
          <Text style={styles.statusMutedText}>
            {match.status === "completed" || isMatchFinished
              ? t("status.final")
              : match.status === "scheduled"
              ? t("status.scheduled")
              : match.status}
          </Text>
        )}
      </View>

      {/* Follow Star */}
      <FollowButton
        entityId={match.id}
        entityType="match"
        size={15}
        onAuthRequired={onAuthRequired}
      />
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
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 6,
    gap: 10,
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
    gap: 3,
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
    fontSize: 11,
    fontWeight: "800",
    color: ScoreBoardTheme.onSurface,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  scoreCol: {
    alignItems: "center",
    minWidth: 54,
  },
  scoreText: {
    fontFamily: "Digital7",
    fontSize: 18,
    fontWeight: "900",
    color: ScoreBoardTheme.secondary,
    letterSpacing: 0.5,
  },
  setsText: {
    fontSize: 9,
    color: "rgba(220, 225, 251, 0.4)",
    fontFamily: "Courier",
  },
  statusCol: {
    minWidth: 62,
    alignItems: "center",
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(78, 222, 163, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(78, 222, 163, 0.35)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  liveDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: ScoreBoardTheme.secondary,
  },
  liveText: {
    fontSize: 8,
    fontWeight: "900",
    color: ScoreBoardTheme.secondary,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  statusMutedText: {
    fontSize: 9,
    fontWeight: "700",
    color: "rgba(220, 225, 251, 0.4)",
    textTransform: "uppercase",
  },
});
