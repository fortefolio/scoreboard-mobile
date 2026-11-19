import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Standing } from "@/lib/standings/groups";
import { ScoreBoardTheme } from "@/constants/theme";
import { useLanguage } from "@/lib/i18n";

interface GroupStandingsProps {
  groups: Record<string, Standing[]>;
}

export function GroupStandingsView({ groups }: GroupStandingsProps) {
  const { locale } = useLanguage();
  const isPt = locale === "pt";
  const groupLabels = Object.keys(groups).sort();

  if (groupLabels.length === 0) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyText}>
          {isPt
            ? "Nenhuma fase de grupos configurada neste torneio."
            : "No group standings available for this tournament."}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {groupLabels.map((label) => {
        const standings = groups[label] || [];
        const groupTitle = label.startsWith("Group ") || label.startsWith("Grupo ")
          ? label
          : isPt
          ? `Grupo ${label}`
          : `Group ${label}`;

        return (
          <View key={label} style={styles.groupCard}>
            <View style={styles.groupHeader}>
              <Text style={styles.groupTitle}>{groupTitle}</Text>
            </View>

            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.th, styles.colPos]}>#</Text>
              <Text style={[styles.th, styles.colTeam]}>
                {isPt ? "Equipa" : "Team"}
              </Text>
              <Text style={[styles.th, styles.colStat]}>{isPt ? "J" : "P"}</Text>
              <Text style={[styles.th, styles.colStat]}>{isPt ? "V" : "W"}</Text>
              <Text style={[styles.th, styles.colStat]}>{isPt ? "D" : "L"}</Text>
              <Text style={[styles.th, styles.colSets]}>Sets</Text>
              <Text style={[styles.th, styles.colDiff]}>+/-</Text>
            </View>

            {/* Table Rows */}
            {standings.map((team, idx) => {
              const isAdvancing = idx < 2;
              const isLast = idx === standings.length - 1;
              return (
                <View
                  key={team.team_name || idx}
                  style={[
                    styles.tableRow,
                    isAdvancing && styles.tableRowAdvancing,
                    !isLast && styles.tableRowDivider,
                  ]}
                >
                  <Text
                    style={[
                      styles.tdPos,
                      styles.colPos,
                      isAdvancing && styles.tdPosAdvancing,
                    ]}
                  >
                    {idx + 1}
                  </Text>
                  <Text
                    style={[
                      styles.tdTeam,
                      styles.colTeam,
                      isAdvancing && styles.tdTeamAdvancing,
                    ]}
                    numberOfLines={1}
                  >
                    {team.team_name}
                  </Text>
                  <Text
                    style={[
                      styles.tdStat,
                      styles.colStat,
                      team.played > 0 && styles.tdStatActive,
                    ]}
                  >
                    {team.played}
                  </Text>
                  <Text
                    style={[
                      styles.tdStat,
                      styles.colStat,
                      team.wins > 0 && styles.tdStatWins,
                    ]}
                  >
                    {team.wins}
                  </Text>
                  <Text
                    style={[
                      styles.tdStat,
                      styles.colStat,
                      team.losses > 0 && styles.tdStatActive,
                    ]}
                  >
                    {team.losses}
                  </Text>
                  <Text style={[styles.tdStat, styles.colSets]}>
                    {team.total_sets_won}-{team.total_sets_lost}
                  </Text>
                  <Text
                    style={[
                      styles.tdDiff,
                      styles.colDiff,
                      team.point_diff !== 0 && styles.tdStatActive,
                    ]}
                  >
                    {team.point_diff > 0
                      ? `+${team.point_diff}`
                      : team.point_diff}
                  </Text>
                </View>
              );
            })}
          </View>
        );
      })}

      {/* Legend */}
      <View style={styles.legendRow}>
        <View style={styles.legendBar} />
        <Text style={styles.legendText}>
          {isPt
            ? "Linhas destacadas avançam para a Fase Eliminatória"
            : "Highlighted rows advance to Knockout Stage"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
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
    backgroundColor: "rgba(22, 26, 36, 0.6)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: ScoreBoardTheme.borderSubtle,
  },
  groupTitle: {
    color: ScoreBoardTheme.onSurface,
    fontSize: 14,
    fontWeight: "500",
  },
  tableHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 12,
    paddingRight: 14,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: ScoreBoardTheme.borderSubtle,
  },
  th: {
    fontSize: 11.5,
    fontWeight: "500",
    color: ScoreBoardTheme.textMuted,
    textAlign: "center",
  },
  colPos: {
    width: 24,
    textAlign: "center",
  },
  colTeam: {
    flex: 1,
    textAlign: "left",
    paddingLeft: 6,
    paddingRight: 4,
  },
  colStat: {
    width: 28,
    textAlign: "center",
  },
  colSets: {
    width: 42,
    textAlign: "center",
  },
  colDiff: {
    width: 34,
    textAlign: "right",
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 10,
    paddingRight: 14,
    paddingVertical: 10,
    borderLeftWidth: 2,
    borderLeftColor: "transparent",
  },
  tableRowAdvancing: {
    borderLeftColor: ScoreBoardTheme.onSurface,
    backgroundColor: "rgba(22, 26, 36, 0.25)",
  },
  tableRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: ScoreBoardTheme.borderSubtle,
  },
  tdPos: {
    fontSize: 12,
    fontWeight: "400",
    color: ScoreBoardTheme.textMuted,
    fontVariant: ["tabular-nums"],
  },
  tdPosAdvancing: {
    fontWeight: "700",
    color: ScoreBoardTheme.onSurface,
  },
  tdTeam: {
    fontSize: 12.5,
    fontWeight: "400",
    color: ScoreBoardTheme.onSurfaceVariant,
  },
  tdTeamAdvancing: {
    fontWeight: "600",
    color: ScoreBoardTheme.onSurface,
  },
  tdStat: {
    fontSize: 12,
    fontWeight: "400",
    color: ScoreBoardTheme.textMuted,
    fontVariant: ["tabular-nums"],
  },
  tdStatActive: {
    color: ScoreBoardTheme.onSurfaceVariant,
  },
  tdStatWins: {
    fontWeight: "600",
    color: ScoreBoardTheme.onSurface,
  },
  tdDiff: {
    fontSize: 12,
    fontWeight: "400",
    color: ScoreBoardTheme.textMuted,
    fontVariant: ["tabular-nums"],
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingTop: 2,
  },
  legendBar: {
    width: 2,
    height: 14,
    borderRadius: 1,
    backgroundColor: ScoreBoardTheme.onSurface,
  },
  legendText: {
    fontSize: 12,
    color: ScoreBoardTheme.textMuted,
  },
});
