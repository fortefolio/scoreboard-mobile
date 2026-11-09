import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation, getSportTranslation } from "@/lib/i18n";
import { SportIcon } from "@/components/SportIcon";
import { FollowButton } from "@/components/FollowButton";
import { countSetsWon, extractSetsData } from "@/lib/scoring/sets";
import { formatTeamOrPlayerName, getInitials } from "@/lib/utils/formatName";
import { ScoreBoardTheme } from "@/constants/theme";

const TENNIS_POINTS = ["0", "15", "30", "40", "AD"];

export interface MatchCardProps {
  match: any;
  onAuthRequired?: () => void;
  onDelete?: (matchId: string) => void;
  canDelete?: boolean;
}

export function MatchCard({
  match,
  onAuthRequired,
  onDelete,
  canDelete = false,
}: MatchCardProps) {
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

  const currentSetNum = Math.min(
    isBeachVolleyball ? 3 : 5,
    setScores.length + (isOngoingDisplay ? 1 : 0)
  );

  const currentGames = match.scores?.tennis?.games || [0, 0];
  const isRacketSport = match.sport_type === "Tennis" || match.sport_type === "Padel";
  const isPointsBased = match.sport_type === "Football" || match.sport_type === "Basketball";

  const renderPoints = (idx: number) => {
    if (isRacketSport && match.scores?.tennis) {
      const p = match.scores.tennis.points?.[idx] ?? 0;
      const opp = match.scores.tennis.points?.[idx === 0 ? 1 : 0] ?? 0;
      if (p >= 3 && opp >= 3) return p > opp ? "AD" : "40";
      return TENNIS_POINTS[p] || "0";
    }
    return match.scores?.current?.[idx === 0 ? "home" : "away"] ?? 0;
  };

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

  const tournamentOrSport =
    match.tournaments?.name || getSportTranslation(match.sport_type, t);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/match/${match.id}` as any)}
      activeOpacity={0.85}
    >
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.sportHeaderLeft}>
          <SportIcon sport={match.sport_type} size={15} color="#c3c0ff" />
          <Text style={styles.sportTag} numberOfLines={1}>
            {tournamentOrSport}
          </Text>
        </View>

        <View style={styles.headerRight}>
          {isOngoingDisplay ? (
            <View style={styles.livePill}>
              <View style={styles.liveDot} />
              <Text style={styles.livePillText}>
                {match.sport_type === "Basketball"
                  ? match.scores?.basketball?.period || t("status.live")
                  : match.sport_type !== "Football"
                  ? `Set ${currentSetNum}`
                  : t("status.live")}
              </Text>
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

          <FollowButton
            entityId={match.id}
            entityType="match"
            size={16}
            onAuthRequired={onAuthRequired}
          />

          {canDelete && onDelete && (
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={(e) => {
                e.stopPropagation?.();
                onDelete(match.id);
              }}
              testID={`match-delete-btn-${match.id}`}
              accessibilityLabel="Delete Match"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="trash-outline" size={16} color="#ef4444" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Participants Rows */}
      <View style={styles.participantsContainer}>
        {[0, 1].map((i) => {
          const participantName = match.participants?.[i]?.name;
          const formattedName =
            formatTeamOrPlayerName(participantName) ||
            t("common.teamDefault", { num: i === 0 ? "A" : "B" });
          const initials = getInitials(participantName);
          const isServing =
            isOngoingDisplay && !isPointsBased && match.scores?.serving_index === i;
          const mainScore = getMainScore(i);

          return (
            <View key={i} style={styles.participantRow}>
              {/* Left: Avatar + Names + Sets */}
              <View style={styles.participantLeft}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initials}</Text>
                  {isServing && <View style={styles.serverIndicator} />}
                </View>

                <View style={styles.nameBlock}>
                  <Text style={styles.teamName} numberOfLines={1}>
                    {formattedName}
                  </Text>

                  {/* Sub-scores (sets / quarters) */}
                  {match.sport_type === "Basketball" ? (
                    match.scores?.basketball?.quarters?.length > 0 && (
                      <View style={styles.subScoresRow}>
                        {match.scores.basketball.quarters.map((q: any, qIdx: number) => {
                          const pScore = i === 0 ? q.home ?? 0 : q.away ?? 0;
                          const oScore = i === 0 ? q.away ?? 0 : q.home ?? 0;
                          return (
                            <Text
                              key={qIdx}
                              style={[
                                styles.subScoreDigit,
                                pScore > oScore && styles.subScoreWinning,
                              ]}
                            >
                              {pScore}
                            </Text>
                          );
                        })}
                      </View>
                    )
                  ) : match.sport_type !== "Football" ? (
                    <View style={styles.subScoresRow}>
                      {setScores.length > 0 &&
                        setScores.map((set: any, sIdx: number) => {
                          const pScore = i === 0 ? set.t1 : set.t2;
                          const oScore = i === 0 ? set.t2 : set.t1;
                          return (
                            <Text
                              key={sIdx}
                              style={[
                                styles.subScoreDigit,
                                pScore > oScore && styles.subScoreWinning,
                              ]}
                            >
                              {pScore}
                            </Text>
                          );
                        })}

                      {isOngoingDisplay && (
                        <Text style={styles.liveGamePoints}>
                          {setScores.length > 0 && " • "}
                          {isRacketSport
                            ? `${currentGames[i]} (${renderPoints(i)})`
                            : renderPoints(i)}
                        </Text>
                      )}
                    </View>
                  ) : null}
                </View>
              </View>

              {/* Right: Big Bold Score */}
              <View style={styles.scoreBox}>
                <Text style={styles.mainScoreNumber}>{mainScore}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: ScoreBoardTheme.surfaceContainerLow,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderGhost,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
    gap: 8,
  },
  sportHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    flex: 1,
    minWidth: 0,
  },
  sportTag: {
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    color: "rgba(195, 192, 255, 0.75)",
    flexShrink: 1,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  livePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(79, 70, 229, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(79, 70, 229, 0.35)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: ScoreBoardTheme.secondary,
  },
  livePillText: {
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: ScoreBoardTheme.primary,
  },
  statusMutedText: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: "rgba(220, 225, 251, 0.45)",
  },
  participantsContainer: {
    gap: 12,
  },
  participantRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  participantLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    minWidth: 0,
    paddingRight: 10,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(35, 41, 60, 0.7)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  avatarText: {
    fontSize: 11,
    fontWeight: "900",
    color: "rgba(220, 225, 251, 0.85)",
  },
  serverIndicator: {
    position: "absolute",
    bottom: -3,
    width: 12,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#fbbf24",
  },
  nameBlock: {
    flex: 1,
    justifyContent: "center",
  },
  teamName: {
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: ScoreBoardTheme.onSurface,
  },
  subScoresRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 2,
  },
  subScoreDigit: {
    fontFamily: "Courier",
    fontSize: 10,
    color: "rgba(220, 225, 251, 0.45)",
  },
  subScoreWinning: {
    color: ScoreBoardTheme.onSurface,
    fontWeight: "800",
  },
  liveGamePoints: {
    fontSize: 10,
    fontWeight: "800",
    color: ScoreBoardTheme.primary,
  },
  scoreBox: {
    minWidth: 28,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  mainScoreNumber: {
    fontSize: 22,
    fontWeight: "900",
    color: ScoreBoardTheme.onSurface,
    fontFamily: "Digital7",
    letterSpacing: 0.5,
  },
  deleteBtn: {
    padding: 4,
    borderRadius: 6,
    marginLeft: 6,
  },
});
