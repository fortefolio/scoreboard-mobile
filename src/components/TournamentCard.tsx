import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation, getSportTranslation } from "@/lib/i18n";
import { SportIcon } from "@/components/SportIcon";
import { FollowButton, SportFavoriteButton } from "@/components/FollowButton";
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
  compact?: boolean;
  onAuthRequired?: () => void;
}

export function TournamentCard({ tournament, compact = false, onAuthRequired }: TournamentCardProps) {
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

  if (compact) {
    return (
      <TouchableOpacity
        style={styles.compactContainer}
        onPress={() => router.push(`/tournament/${tournament.id}` as any)}
        activeOpacity={0.85}
      >
        <SportFavoriteButton
          entityId={tournament.id}
          entityType="tournament"
          sport={tournament.sport_type}
          size="sm"
          onAuthRequired={onAuthRequired}
        />

        <View style={styles.compactContent}>
          <Text style={styles.compactName} numberOfLines={1}>
            {tournament.name}
          </Text>
          <Text style={styles.compactMeta} numberOfLines={1}>
            {getSportTranslation(tournament.sport_type, t)} • {dateDisplay}
          </Text>
        </View>

        <View style={styles.compactRight}>
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
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/tournament/${tournament.id}` as any)}
      activeOpacity={0.85}
    >
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.sportHeaderLeft}>
          <SportIcon sport={tournament.sport_type} size={15} color={ScoreBoardTheme.onSurfaceVariant} />
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
          <Ionicons name="calendar-outline" size={13} color={ScoreBoardTheme.textMuted} />
          <Text style={styles.dateText}>{dateDisplay}</Text>
        </View>

        <View style={styles.arrowCircle}>
          <Ionicons name="chevron-forward" size={14} color={ScoreBoardTheme.onSurfaceVariant} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: ScoreBoardTheme.surfaceContainer,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    padding: 14,
    marginBottom: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    gap: 8,
  },
  sportHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
    minWidth: 0,
  },
  sportTag: {
    fontSize: 12,
    fontWeight: "500",
    color: ScoreBoardTheme.onSurfaceVariant,
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
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: ScoreBoardTheme.liveCrimson,
  },
  livePillText: {
    fontSize: 12,
    fontWeight: "500",
    color: ScoreBoardTheme.onSurface,
  },
  statusMutedText: {
    fontSize: 12,
    fontWeight: "400",
    color: ScoreBoardTheme.textMuted,
  },
  body: {
    marginVertical: 4,
    gap: 6,
  },
  tournamentName: {
    fontSize: 15,
    fontWeight: "600",
    color: ScoreBoardTheme.onSurface,
    lineHeight: 20,
  },
  formatPill: {
    alignSelf: "flex-start",
    backgroundColor: ScoreBoardTheme.surfaceContainerHigh,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
  },
  formatText: {
    fontSize: 11,
    fontWeight: "500",
    color: ScoreBoardTheme.onSurfaceVariant,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: ScoreBoardTheme.borderSubtle,
  },
  footerMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dateText: {
    fontSize: 11,
    fontWeight: "400",
    color: ScoreBoardTheme.textMuted,
  },
  arrowCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: ScoreBoardTheme.surfaceContainerHigh,
    justifyContent: "center",
    alignItems: "center",
  },
  compactContainer: {
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
  compactIconBox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: ScoreBoardTheme.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    justifyContent: "center",
    alignItems: "center",
  },
  compactContent: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  compactName: {
    fontSize: 13,
    fontWeight: "600",
    color: ScoreBoardTheme.onSurface,
  },
  compactMeta: {
    fontSize: 11,
    color: ScoreBoardTheme.textMuted,
  },
  compactRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
});
