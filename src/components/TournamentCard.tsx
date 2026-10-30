import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation, getSportTranslation } from "@/lib/i18n";
import { SportIcon } from "@/components/SportIcon";
import { FollowButton } from "@/components/FollowButton";
import { ScoreBoardTheme } from "@/constants/theme";

export interface TournamentCardProps {
  tournament: {
    id: string;
    name: string;
    sport_type: string;
    status: string;
    format?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    created_at?: string;
  };
  onAuthRequired?: () => void;
}

export function TournamentCard({ tournament, onAuthRequired }: TournamentCardProps) {
  const { t } = useTranslation();
  const router = useRouter();

  const isLive = tournament.status === "ongoing";

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return null;
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
    } catch {
      return null;
    }
  };

  const startDate = formatDate(tournament.start_date);
  const endDate = formatDate(tournament.end_date);
  const dateDisplay = startDate && endDate ? `${startDate} - ${endDate}` : startDate || t("tournaments.upcoming");

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/tournament/${tournament.id}` as any)}
      activeOpacity={0.85}
    >
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.sportHeaderLeft}>
          <SportIcon sport={tournament.sport_type} size={15} color="#c3c0ff" />
          <Text style={styles.sportTag} numberOfLines={1}>
            {getSportTranslation(tournament.sport_type, t)}
          </Text>
        </View>

        <View style={styles.headerRight}>
          {isLive ? (
            <View style={styles.livePill}>
              <View style={styles.liveDot} />
              <Text style={styles.livePillText}>{t("status.live")}</Text>
            </View>
          ) : (
            <Text style={styles.statusMutedText}>
              {tournament.status === "completed"
                ? t("status.final")
                : tournament.status === "scheduled" || tournament.status === "pending"
                ? t("status.scheduled")
                : tournament.status}
            </Text>
          )}

          <FollowButton
            entityId={tournament.id}
            entityType="tournament"
            size={16}
            onAuthRequired={onAuthRequired}
          />
        </View>
      </View>

      {/* Main Tournament Name */}
      <View style={styles.body}>
        <Text style={styles.tournamentName} numberOfLines={2}>
          {tournament.name}
        </Text>

        {/* Format / Type Pill */}
        {tournament.format && (
          <View style={styles.formatPill}>
            <Text style={styles.formatText}>{tournament.format}</Text>
          </View>
        )}
      </View>

      {/* Footer Info */}
      <View style={styles.footer}>
        <View style={styles.footerMeta}>
          <Ionicons name="calendar-outline" size={13} color="rgba(220, 225, 251, 0.45)" />
          <Text style={styles.dateText}>{dateDisplay}</Text>
        </View>

        <View style={styles.arrowCircle}>
          <Ionicons name="chevron-forward" size={14} color="#c3c0ff" />
        </View>
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
    marginBottom: 12,
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
  body: {
    marginVertical: 4,
    gap: 8,
  },
  tournamentName: {
    fontSize: 16,
    fontWeight: "900",
    color: ScoreBoardTheme.onSurface,
    lineHeight: 22,
    letterSpacing: -0.3,
  },
  formatPill: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  formatText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: "rgba(220, 225, 251, 0.65)",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.04)",
  },
  footerMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dateText: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(220, 225, 251, 0.6)",
  },
  arrowCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(79, 70, 229, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
});
