import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Standing } from "@/lib/standings/groups";

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
              <Text style={styles.groupTitle}>GRUPO {label}</Text>
            </View>

            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.th, styles.thPos]}>#</Text>
              <Text style={[styles.th, styles.thTeam]}>EQUIPA</Text>
              <Text style={[styles.th, styles.thStat]}>J</Text>
              <Text style={[styles.th, styles.thStat]}>V</Text>
              <Text style={[styles.th, styles.thStat]}>D</Text>
              <Text style={[styles.th, styles.thStat]}>DIFF</Text>
              <Text style={[styles.th, styles.thPts]}>SETS</Text>
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
                  <Text style={[styles.td, styles.thStat, { color: "#4edea3" }]}>{team.wins}</Text>
                  <Text style={[styles.td, styles.thStat, { color: "#ef4444" }]}>{team.losses}</Text>
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
    gap: 16,
  },
  emptyCard: {
    backgroundColor: "#151b2d",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#232d4b",
    padding: 24,
    alignItems: "center",
  },
  emptyText: {
    color: "#64748b",
    fontSize: 13,
  },
  groupCard: {
    backgroundColor: "#151b2d",
    borderWidth: 1,
    borderColor: "#232d4b",
    borderRadius: 16,
    overflow: "hidden",
  },
  groupHeader: {
    backgroundColor: "#101626",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
  },
  groupTitle: {
    color: "#4edea3",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  tableHeader: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
    backgroundColor: "#0d1322",
  },
  th: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748b",
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
    fontWeight: "900",
    color: "#f8fafc",
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  tableRowAlt: {
    backgroundColor: "rgba(255, 255, 255, 0.02)",
  },
  td: {
    fontSize: 12,
    color: "#cbd5e1",
    fontWeight: "600",
  },
  tdPos: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748b",
    textAlign: "center",
  },
  tdPosTop: {
    color: "#4edea3",
  },
});
