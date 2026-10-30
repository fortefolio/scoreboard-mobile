import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useLanguage } from "@/lib/i18n";
import { useFollow } from "@/lib/hooks/useFollow";
import { Colors } from "@/constants/theme";

export interface MatchCardProps {
  match: {
    id: string;
    sport_type: string;
    status: string;
    tournament_id?: string | null;
    tournaments?: { name: string } | null;
    participants?: Array<{ name: string; score?: any }> | null;
    scores?: any;
    created_at?: string;
  };
}

export function MatchCard({ match }: MatchCardProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const { isFollowing, toggleFollow } = useFollow();

  const following = isFollowing(match.id, "match");
  const isLive = match.status === "ongoing";
  const isCompleted = match.status === "completed";

  const teamAName = match.participants?.[0]?.name || t("common.teamDefault") + " A";
  const teamBName = match.participants?.[1]?.name || t("common.teamDefault") + " B";

  // Score extraction helper
  const renderScore = () => {
    const scores = match.scores;
    if (!scores) return null;

    if (match.sport_type === "Football") {
      const goalsA = scores.football?.goals?.[0] ?? scores.goals?.[0] ?? 0;
      const goalsB = scores.football?.goals?.[1] ?? scores.goals?.[1] ?? 0;
      return (
        <View style={styles.scoreRow}>
          <Text style={styles.digitalScore}>{goalsA}</Text>
          <Text style={styles.scoreSeparator}>-</Text>
          <Text style={styles.digitalScore}>{goalsB}</Text>
        </View>
      );
    }

    if (match.sport_type === "Tennis" || match.sport_type === "Padel") {
      const sets = scores.tennis?.sets || [];
      const games = scores.tennis?.games || [0, 0];
      const points = scores.tennis?.points || [0, 0];

      // Format points to 0, 15, 30, 40, AD
      const formatPoint = (pts: number) => {
        if (pts === 0) return "0";
        if (pts === 1) return "15";
        if (pts === 2) return "30";
        if (pts === 3) return "40";
        if (pts >= 4) return "AD";
        return String(pts);
      };

      return (
        <View style={styles.tennisScoreContainer}>
          {sets.length > 0 && (
            <Text style={styles.setsText}>
              {sets.map((s: any) => `${s[0]}-${s[1]}`).join("  ")}
            </Text>
          )}
          <View style={styles.scoreRow}>
            <Text style={styles.digitalScoreSmall}>{games[0]}</Text>
            <Text style={styles.scoreSeparator}>-</Text>
            <Text style={styles.digitalScoreSmall}>{games[1]}</Text>
            {isLive && (
              <Text style={styles.gamePointsText}>
                ({formatPoint(points[0])} : {formatPoint(points[1])})
              </Text>
            )}
          </View>
        </View>
      );
    }

    if (match.sport_type === "Volleyball" || match.sport_type === "Beach Volleyball") {
      const sets = scores.volleyball?.sets || [];
      const currentPoints = scores.volleyball?.current_points || [0, 0];
      const setsWonA = sets.filter((s: any) => s[0] > s[1]).length;
      const setsWonB = sets.filter((s: any) => s[1] > s[0]).length;

      return (
        <View style={styles.tennisScoreContainer}>
          <View style={styles.scoreRow}>
            <Text style={styles.digitalScore}>{setsWonA}</Text>
            <Text style={styles.scoreSeparator}>-</Text>
            <Text style={styles.digitalScore}>{setsWonB}</Text>
          </View>
          {isLive && (
            <Text style={styles.gamePointsText}>
              Set {sets.length + 1}: {currentPoints[0]} - {currentPoints[1]}
            </Text>
          )}
        </View>
      );
    }

    if (match.sport_type === "Basketball") {
      const totalA = scores.basketball?.total_points?.[0] ?? scores.total_points?.[0] ?? 0;
      const totalB = scores.basketball?.total_points?.[1] ?? scores.total_points?.[1] ?? 0;
      return (
        <View style={styles.scoreRow}>
          <Text style={styles.digitalScore}>{totalA}</Text>
          <Text style={styles.scoreSeparator}>-</Text>
          <Text style={styles.digitalScore}>{totalB}</Text>
        </View>
      );
    }

    return null;
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/match/${match.id}` as any)}
      activeOpacity={0.85}
    >
      {/* Top Meta Header */}
      <View style={styles.topMeta}>
        <View style={styles.sportBadge}>
          <Text style={styles.sportText}>{match.sport_type}</Text>
        </View>

        {match.tournaments?.name && (
          <Text style={styles.tournamentName} numberOfLines={1}>
            {match.tournaments.name}
          </Text>
        )}

        <View style={styles.rightMeta}>
          {isLive ? (
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>{t("status.live") || "EM DIRETO"}</Text>
            </View>
          ) : (
            <Text style={styles.statusLabel}>
              {isCompleted ? t("status.final") || "TERMINADO" : t("status.scheduled") || "AGENDADO"}
            </Text>
          )}

          {/* Follow Toggle */}
          <TouchableOpacity
            style={styles.followBtn}
            onPress={() => toggleFollow(match.id, "match")}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={following ? "heart" : "heart-outline"}
              size={18}
              color={following ? "#ef4444" : "#64748b"}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Teams & Score Section */}
      <View style={styles.mainContent}>
        <View style={styles.teamsCol}>
          <Text style={styles.teamName} numberOfLines={1}>
            {teamAName}
          </Text>
          <Text style={styles.vsText}>vs</Text>
          <Text style={styles.teamName} numberOfLines={1}>
            {teamBName}
          </Text>
        </View>

        <View style={styles.scoreCol}>
          {renderScore() || (
            <Text style={styles.timePlaceholder}>
              {isCompleted ? "Final" : "00:00"}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#151b2d",
    borderWidth: 1,
    borderColor: "#232d4b",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  topMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    gap: 8,
  },
  sportBadge: {
    backgroundColor: "rgba(79, 70, 229, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(79, 70, 229, 0.3)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  sportText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#a5b4fc",
    textTransform: "uppercase",
  },
  tournamentName: {
    flex: 1,
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: "500",
  },
  rightMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(78, 222, 163, 0.15)",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#4edea3",
  },
  liveText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#4edea3",
  },
  statusLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748b",
    textTransform: "uppercase",
  },
  followBtn: {
    padding: 2,
  },
  mainContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  teamsCol: {
    flex: 1,
    paddingRight: 12,
  },
  teamName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#f8fafc",
    lineHeight: 22,
  },
  vsText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#64748b",
    textTransform: "uppercase",
    marginVertical: 1,
  },
  scoreCol: {
    alignItems: "flex-end",
    justifyContent: "center",
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  digitalScore: {
    fontFamily: "Digital7",
    fontSize: 32,
    color: "#4edea3",
    lineHeight: 34,
  },
  digitalScoreSmall: {
    fontFamily: "Digital7",
    fontSize: 26,
    color: "#4edea3",
    lineHeight: 28,
  },
  scoreSeparator: {
    fontFamily: "Digital7",
    fontSize: 22,
    color: "#64748b",
  },
  tennisScoreContainer: {
    alignItems: "flex-end",
    gap: 2,
  },
  setsText: {
    fontSize: 11,
    color: "#94a3b8",
    fontFamily: "monospace",
  },
  gamePointsText: {
    fontSize: 11,
    color: "#fbbf24",
    fontWeight: "700",
    marginLeft: 4,
  },
  timePlaceholder: {
    fontSize: 14,
    color: "#64748b",
    fontFamily: "monospace",
  },
});
