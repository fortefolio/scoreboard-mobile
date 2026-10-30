import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useLanguage } from "@/lib/i18n";
import { useFollow } from "@/lib/hooks/useFollow";
import { Colors } from "@/constants/theme";

export interface TournamentCardProps {
  tournament: {
    id: string;
    name: string;
    sport_type: string;
    status: string;
    start_date?: string | null;
    end_date?: string | null;
    created_at?: string;
  };
}

export function TournamentCard({ tournament }: TournamentCardProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const { isFollowing, toggleFollow } = useFollow();

  const following = isFollowing(tournament.id, "tournament");
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
  const dateDisplay = startDate && endDate ? `${startDate} - ${endDate}` : startDate || "Em breve";

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/tournament/${tournament.id}` as any)}
      activeOpacity={0.85}
    >
      {/* Top Meta Header */}
      <View style={styles.topMeta}>
        <View style={styles.sportBadge}>
          <Text style={styles.sportText}>{tournament.sport_type}</Text>
        </View>

        <View style={styles.rightMeta}>
          {isLive ? (
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>{t("status.live") || "A DECORRER"}</Text>
            </View>
          ) : (
            <Text style={styles.statusLabel}>
              {tournament.status === "completed"
                ? t("status.completed") || "TERMINADO"
                : t("status.scheduled") || "AGENDADO"}
            </Text>
          )}

          {/* Follow Toggle */}
          <TouchableOpacity
            style={styles.followBtn}
            onPress={() => toggleFollow(tournament.id, "tournament")}
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

      {/* Title */}
      <Text style={styles.title} numberOfLines={2}>
        {tournament.name}
      </Text>

      {/* Footer Info */}
      <View style={styles.footerRow}>
        <View style={styles.infoItem}>
          <Ionicons name="calendar-outline" size={14} color="#64748b" />
          <Text style={styles.infoText}>{dateDisplay}</Text>
        </View>

        <View style={styles.infoItem}>
          <Ionicons name="trophy-outline" size={14} color="#64748b" />
          <Text style={styles.infoText}>Torneio Oficial</Text>
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
    marginBottom: 10,
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
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#f8fafc",
    lineHeight: 22,
    marginBottom: 12,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: "#1e293b",
    paddingTop: 10,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  infoText: {
    fontSize: 12,
    color: "#94a3b8",
  },
});
