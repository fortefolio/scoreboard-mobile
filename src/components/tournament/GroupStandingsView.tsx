import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Standing } from "@/lib/standings/groups";
import { ScoreBoardTheme } from "@/constants/theme";

interface GroupStandingsProps {
  groups: Record<string, Standing[]>;
}

export function GroupStandingsView({ groups }: GroupStandingsProps) {
  const groupLabels = Object.keys(groups).sort();

  if (groupLabels.length === 0) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyText}>Nenhuma fase de grupos configurada neste torneio.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {groupLabels.map((label) => {
        const standings = groups[label] || [];
        return (
          <View key={label} style={styles.groupCard}>
            <View style={styles.groupHeader}>
              <Text style={styles.groupTitle}>Grupo {label}</Text>
            </View>

            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.th, styles.thPos]}>#</Text>
              <Text style={[styles.th, styles.thTeam]}>Equipa</Text>
              <Text style={[styles.th, styles.thStat]}>J</Text>
              <Text style={[styles.th, styles.thStat]}>V</Text>
              <Text style={[styles.th, styles.thStat]}>D</Text>
              <Text style={[styles.th, styles.thStat]}>+/-</Text>
              <Text style={[styles.th, styles.thPts]}>Sets</Text>
            </View>

            {/* Table Rows */}
            {standings.map((team, idx) => {
              const isTop2 = idx < 2;
              return (
                <View
                  key={team.team_name || idx}
                  style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]}
                >
                  <View style={styles.thPos}>
                    <Text style={[styles.tdPos, isTop2 && styles.tdPosTop]}>{idx + 1}</Text>
                  </View>
                  <Text style={[styles.td, styles.thTeam]} numberOfLines={1}>
                    {team.team_name}
                  </Text>
                  <Text style={[styles.td, styles.thStat]}>{team.played}</Text>
                  <Text style={[styles.td, styles.thStat, { color: ScoreBoardTheme.secondary }]}>{team.wins}</Text>
                  <Text style={[styles.td, styles.thStat, { color: ScoreBoardTheme.error }]}>{team.losses}</Text>
                  <Text style={[styles.td, styles.thStat]}>
                    {team.point_diff > 0 ? `+${team.point_diff}` : team.point_diff}
                  </Text>
                  <Text style={[styles.td, styles.thPts]}>{team.total_sets_won}</Text>
                </View>
              );
            })}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 14,
  },
  emptyCard: {
    backgroundColor: ScoreBoardTheme.surfaceContainer,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    padding: 24,
    alignItems: "center",
  },
  emptyText: {
    color: ScoreBoardTheme.textMuted,
    fontSize: 13,
  },
  groupCard: {
    backgroundColor: ScoreBoardTheme.surfaceContainer,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    borderRadius: 12,
    overflow: "hidden",
  },
  groupHeader: {
    backgroundColor: ScoreBoardTheme.surfaceContainerHigh,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: ScoreBoardTheme.borderSubtle,
  },
  groupTitle: {
    color: ScoreBoardTheme.onSurface,
    fontSize: 13,
    fontWeight: "600",
  },
  tableHeader: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: ScoreBoardTheme.borderSubtle,
    backgroundColor: ScoreBoardTheme.surfaceContainerHigh,
  },
  th: {
    fontSize: 11,
    fontWeight: "500",
    color: ScoreBoardTheme.textMuted,
    textAlign: "center",
  },
  thPos: {
    width: 24,
    alignItems: "center",
  },
  thTeam: {
    flex: 1,
    textAlign: "left",
    paddingLeft: 6,
  },
  thStat: {
    width: 32,
    textAlign: "center",
  },
  thPts: {
    width: 36,
    textAlign: "center",
    fontWeight: "600",
    color: ScoreBoardTheme.onSurface,
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  tableRowAlt: {
    backgroundColor: "rgba(255, 255, 255, 0.02)",
  },
  td: {
    fontSize: 12,
    color: ScoreBoardTheme.onSurface,
    fontWeight: "500",
    fontVariant: ["tabular-nums"],
  },
  tdPos: {
    fontSize: 12,
    fontWeight: "500",
    color: ScoreBoardTheme.textMuted,
    textAlign: "center",
    fontVariant: ["tabular-nums"],
  },
  tdPosTop: {
    color: ScoreBoardTheme.secondary,
    fontWeight: "600",
  },
});
