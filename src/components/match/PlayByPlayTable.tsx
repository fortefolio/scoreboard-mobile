import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ScoreBoardTheme } from "@/constants/theme";

interface PlayByPlayTableProps {
  events: any[];
  teamAName: string;
  teamBName: string;
  emptyText: string;
  formatFallback: (teamName: string) => string;
}

export function PlayByPlayTable({
  events,
  teamAName,
  teamBName,
  emptyText,
  formatFallback,
}: PlayByPlayTableProps) {
  if (!events || events.length === 0) {
    return (
      <View style={styles.emptyCard}>
        <Ionicons
          name="analytics-outline"
          size={32}
          color={ScoreBoardTheme.textMuted}
        />
        <Text style={styles.emptyText}>{emptyText}</Text>
      </View>
    );
  }

  // Reconcile goal undo/correction events chronologically before displaying newest-first
  const reconciledEvents = (() => {
    const chrono = [...events].reverse();
    const active: any[] = [];
    for (const ev of chrono) {
      const tType = ev?.event_data?.type;
      if (tType === "correct_goal" || tType === "goal_reverted") {
        const revertSide = ev?.event_data?.side || "home";
        const lastIdx = active.findLastIndex(
          (g) => g?.event_data?.type === "goal" && (g?.event_data?.side || "home") === revertSide
        );
        if (lastIdx !== -1) {
          active.splice(lastIdx, 1);
          continue;
        }
      }
      active.push(ev);
    }
    return active.reverse();
  })();

  return (
    <View style={styles.tableCard}>
      {reconciledEvents.map((ev, idx) => {
        const data = ev.event_data || {};
        const side =
          data.scoring_side !== undefined
            ? data.scoring_side
            : data.side === "away"
            ? 1
            : 0;
        const teamName = side === 0 ? teamAName : teamBName;

        const scoreAfter =
          data.score_after ||
          (data.home_score !== undefined && data.away_score !== undefined
            ? `${data.home_score} - ${data.away_score}`
            : null);

        const deltaBadge =
          data.points !== undefined
            ? `${Number(data.points) > 0 ? "+" : ""}${data.points}`
            : data.minute !== undefined
            ? `${data.minute}'`
            : null;

        const timeLabel = new Date(ev.created_at).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });

        const description = data.description || formatFallback(teamName);

        return (
          <View
            key={ev.id || idx}
            style={[
              styles.row,
              idx < events.length - 1 && styles.rowBorder,
            ]}
          >
            {/* Score or Time Column */}
            <View style={styles.leftCol}>
              {scoreAfter ? (
                <Text style={styles.scoreDigital}>{scoreAfter}</Text>
              ) : (
                <Text style={styles.timeMono}>{timeLabel}</Text>
              )}
            </View>

            {/* Team + Action Description */}
            <View style={styles.centerCol}>
              <Text style={styles.teamLabel} numberOfLines={1}>
                {teamName}
              </Text>
              <Text style={styles.actionText} numberOfLines={2}>
                {description}
              </Text>
            </View>

            {/* Delta / Minute Badge */}
            <View style={styles.rightCol}>
              {deltaBadge ? (
                <View style={styles.deltaBadge}>
                  <Text style={styles.deltaText}>{deltaBadge}</Text>
                </View>
              ) : (
                <Text style={styles.timeSmall}>{timeLabel}</Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  emptyCard: {
    backgroundColor: ScoreBoardTheme.surfaceContainer,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    padding: 28,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    color: ScoreBoardTheme.textMuted,
    textAlign: "center",
  },
  tableCard: {
    backgroundColor: ScoreBoardTheme.surfaceContainer,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 10,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: ScoreBoardTheme.borderSubtle,
  },
  leftCol: {
    minWidth: 56,
    alignItems: "flex-start",
  },
  scoreDigital: {
    fontFamily: "Digital7Mono",
    fontSize: 18,
    color: ScoreBoardTheme.onSurface,
    fontVariant: ["tabular-nums"],
  },
  timeMono: {
    fontSize: 11,
    color: ScoreBoardTheme.textMuted,
    fontVariant: ["tabular-nums"],
  },
  centerCol: {
    flex: 1,
    minWidth: 0,
  },
  teamLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: ScoreBoardTheme.onSurface,
  },
  actionText: {
    fontSize: 12,
    color: ScoreBoardTheme.onSurfaceVariant,
    marginTop: 1,
  },
  rightCol: {
    alignItems: "flex-end",
  },
  deltaBadge: {
    backgroundColor: ScoreBoardTheme.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  deltaText: {
    fontFamily: "Digital7Mono",
    fontSize: 14,
    color: ScoreBoardTheme.onSurface,
    fontVariant: ["tabular-nums"],
  },
  timeSmall: {
    fontSize: 11,
    color: ScoreBoardTheme.textMuted,
    fontVariant: ["tabular-nums"],
  },
});
