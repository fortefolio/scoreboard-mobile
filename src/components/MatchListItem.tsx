import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "@/lib/i18n";
import { SportFavoriteButton } from "@/components/FollowButton";
import { SportIcon } from "@/components/SportIcon";
import { countSetsWon, extractSetsData } from "@/lib/scoring/sets";
import { formatTeamOrPlayerName } from "@/lib/utils/formatName";
import { ScoreBoardTheme } from "@/constants/theme";

export interface MatchListItemProps {
  match: any;
  onAuthRequired?: () => void;
  inGroup?: boolean;
  rightActions?: React.ReactNode;
  showFavorite?: boolean;
}

export function MatchListItem({
  match,
  onAuthRequired,
  inGroup = false,
  rightActions,
  showFavorite = true,
}: MatchListItemProps) {
  const { t, locale } = useTranslation();
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

  const isLive = match.status === "live" || match.status === "ongoing";
  const isScheduled = match.status === "scheduled" || match.status === "upcoming";
  const isFinished = match.status === "completed" || match.status === "finished";

  const score0 = isScheduled ? "-" : getMainScore(0);
  const score1 = isScheduled ? "-" : getMainScore(1);

  const statusText = isLive
    ? t("status.live") || (locale === "pt" ? "Direto" : "Live")
    : isFinished
    ? t("status.finished") || (locale === "pt" ? "Terminado" : "Final")
    : t("status.scheduled") || (locale === "pt" ? "Agendado" : "Scheduled");

  return (
    <TouchableOpacity
      style={[styles.container, inGroup && styles.containerGrouped]}
      onPress={() => router.push(`/match/${match.id}` as any)}
      activeOpacity={0.75}
    >
      {/* Sport Icon (with optional Favorite Badge) */}
      {showFavorite ? (
        <SportFavoriteButton
          entityId={match.id}
          entityType="match"
          sport={match.sport_type}
          size="sm"
          onAuthRequired={onAuthRequired}
        />
      ) : (
        <View style={styles.plainSportBox}>
          <SportIcon
            sport={match.sport_type}
            size={22}
            color={ScoreBoardTheme.onSurface}
          />
        </View>
      )}

      {/* Teams, Status & Vertically Aligned Scores */}
      <View style={styles.contentCol}>
        <View style={styles.teamRow}>
          <Text style={styles.teamName} numberOfLines={1}>
            {name0}
          </Text>
        </View>
        <View style={styles.teamRow}>
          <Text style={styles.teamName} numberOfLines={1}>
            {name1}
          </Text>
        </View>
      </View>

      <View style={styles.statusCol}>
        {isLive && <View style={styles.liveDot} />}
        <Text style={[styles.statusText, isLive && styles.statusTextLive]} numberOfLines={1}>
          {statusText}
        </Text>
      </View>

      <View style={styles.scoresCol}>
        <Text style={[styles.scoreText, isScheduled && styles.scoreTextMuted]}>{score0}</Text>
        <Text style={[styles.scoreText, isScheduled && styles.scoreTextMuted]}>{score1}</Text>
      </View>

      {rightActions && <View style={styles.rightActionsWrap}>{rightActions}</View>}
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
  containerGrouped: {
    backgroundColor: "transparent",
    borderRadius: 0,
    borderWidth: 0,
    marginBottom: 0,
    paddingHorizontal: 14,
  },
  plainSportBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#161a24",
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  contentCol: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  teamRow: {
    height: 18,
    flexDirection: "row",
    alignItems: "center",
  },
  teamName: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
    color: ScoreBoardTheme.onSurface,
  },
  statusCol: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#f43f5e",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "500",
    color: ScoreBoardTheme.textMuted,
  },
  statusTextLive: {
    color: ScoreBoardTheme.onSurface,
    fontWeight: "600",
  },
  scoresCol: {
    alignItems: "flex-end",
    gap: 4,
    minWidth: 22,
  },
  scoreText: {
    fontFamily: "Digital7Mono",
    fontSize: 18,
    height: 18,
    lineHeight: 18,
    color: ScoreBoardTheme.onSurface,
    textAlign: "right",
    fontVariant: ["tabular-nums"],
  },
  scoreTextMuted: {
    color: ScoreBoardTheme.textMuted,
  },
  rightActionsWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginLeft: 4,
  },
});
