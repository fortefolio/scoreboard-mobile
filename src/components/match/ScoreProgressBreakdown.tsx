import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ScoreBoardTheme } from "@/constants/theme";
import { useLanguage } from "@/lib/i18n";
import { PlayByPlayTable } from "./PlayByPlayTable";

interface ScoreProgressBreakdownProps {
  match: any;
  events: any[];
  teamAName: string;
  teamBName: string;
  emptyText: string;
  formatFallback: (teamName: string) => string;
}

export function ScoreProgressBreakdown({
  match,
  events,
  teamAName,
  teamBName,
  emptyText,
  formatFallback,
}: ScoreProgressBreakdownProps) {
  const { t, locale } = useLanguage();
  const [expandedSets, setExpandedSets] = useState<Record<number, boolean>>({ 0: true });

  const sport = match?.sport_type;
  const scores = match?.scores || {};
  const isRacket = sport === "Tennis" || sport === "Padel";
  const isVolley = sport === "Volleyball" || sport === "Beach Volleyball";

  if (isRacket && scores?.tennis) {
    const completedSets: any[] = Array.isArray(scores.tennis.sets) ? scores.tennis.sets : [];
    const currentSetGames: any[] = Array.isArray(scores.tennis.current_set_games)
      ? scores.tennis.current_set_games
      : [];
    const currentGames: [number, number] = scores.tennis.games || [0, 0];
    const hasOngoingSet =
      match.status !== "completed" &&
      (currentSetGames.length > 0 || currentGames[0] > 0 || currentGames[1] > 0);

    const allSets = [
      ...completedSets.map((s, idx) => ({
        index: idx,
        home: s.home ?? s.team1 ?? 0,
        away: s.away ?? s.team2 ?? 0,
        games: Array.isArray(s.games_history) ? s.games_history : [],
        tiebreak: s.tiebreak,
        isLive: false,
      })),
      ...(hasOngoingSet
        ? [
            {
              index: completedSets.length,
              home: currentGames[0] ?? 0,
              away: currentGames[1] ?? 0,
              games: currentSetGames,
              tiebreak: undefined,
              isLive: true,
            },
          ]
        : []),
    ];

    if (allSets.length > 0 && allSets.some((s) => s.games.length > 0)) {
      const allExpanded = allSets.every((s) => expandedSets[s.index] !== false);
      const toggleAll = () => {
        const next: Record<number, boolean> = {};
        allSets.forEach((s) => {
          next[s.index] = !allExpanded;
        });
        setExpandedSets(next);
      };

      return (
        <View style={styles.container} testID="tennis-score-breakdown">
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconBox}>
                <Ionicons name="stats-chart-outline" size={16} color={ScoreBoardTheme.onSurfaceVariant} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.headerTitle}>
                  {t("match.setGameBreakdown") || "Set, Game & Point-by-Point Breakdown"}
                </Text>
                <Text style={styles.headerSubtitle}>
                  {locale === "pt"
                    ? "Toca num set para expandir a evolução de cada jogo"
                    : "Tap a set to expand each game's progression"}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={toggleAll} style={styles.collapseBtn}>
              <Text style={styles.collapseBtnText}>
                {allExpanded ? t("match.collapseAll") || "Collapse All" : t("match.expandAll") || "Expand All"}
              </Text>
            </TouchableOpacity>
          </View>

          {allSets.map((setObj) => {
            const isOpen = expandedSets[setObj.index] !== false;
            return (
              <View key={setObj.index} style={styles.setCard}>
                <TouchableOpacity
                  style={styles.setHeader}
                  onPress={() =>
                    setExpandedSets((prev) => ({
                      ...prev,
                      [setObj.index]: !isOpen,
                    }))
                  }
                  activeOpacity={0.75}
                >
                  <View style={styles.setHeaderLeft}>
                    <View style={styles.setBadge}>
                      <Text style={styles.setBadgeText}>SET {setObj.index + 1}</Text>
                    </View>
                    <Text style={styles.setScoreText}>
                      {setObj.home} - {setObj.away}
                    </Text>
                    {setObj.isLive && (
                      <View style={styles.livePill}>
                        <View style={styles.liveDot} />
                        <Text style={styles.livePillText}>{t("status.live") || "Live"}</Text>
                      </View>
                    )}
                    <View style={styles.countPill}>
                      <Text style={styles.countPillText}>
                        {setObj.games.length} {locale === "pt" ? "Jogos" : "Games"}
                      </Text>
                    </View>
                  </View>
                  <Ionicons
                    name={isOpen ? "chevron-up" : "chevron-down"}
                    size={18}
                    color={ScoreBoardTheme.textMuted}
                  />
                </TouchableOpacity>

                {isOpen && (
                  <View style={styles.gamesList}>
                    {setObj.games.length === 0 ? (
                      <Text style={styles.noDetailsText}>
                        {locale === "pt"
                          ? "Sem detalhe ponto-a-ponto para este set."
                          : "No point-by-point details recorded for this set."}
                      </Text>
                    ) : (
                      setObj.games.map((g: any, gIdx: number) => {
                        const serverName = g.server === 1 ? teamBName : teamAName;
                        const winnerName = g.winner === 1 ? teamBName : teamAName;
                        const pts: string[] = Array.isArray(g.points_progression)
                          ? g.points_progression
                          : [];
                        return (
                          <View key={gIdx} style={styles.gameCard}>
                            <View style={styles.gameTopRow}>
                              <View style={styles.gameBadge}>
                                <Text style={styles.gameBadgeText}>
                                  {g.is_tiebreak
                                    ? "Tie-Break"
                                    : `${locale === "pt" ? "Jogo" : "Game"} ${g.game_number ?? gIdx + 1}`}
                                </Text>
                              </View>
                              <View style={styles.servingInfo}>
                                <Ionicons name="tennisball-outline" size={12} color={ScoreBoardTheme.textMuted} />
                                <Text style={styles.servingText} numberOfLines={1}>
                                  {serverName} {locale === "pt" ? "a servir" : "serving"}
                                </Text>
                              </View>
                              {g.is_break && (
                                <View style={styles.breakBadge}>
                                  <Text style={styles.breakBadgeText}>BREAK</Text>
                                </View>
                              )}
                            </View>

                            <View style={styles.winnerRow}>
                              <Text style={styles.winnerLabel}>
                                {locale === "pt" ? "Ganho por " : "Won by "}
                                <Text style={styles.winnerName}>{winnerName}</Text>
                              </Text>
                              {g.games_after && (
                                <View style={styles.gamesAfterPill}>
                                  <Text style={styles.gamesAfterText}>
                                    {g.games_after.home} - {g.games_after.away}
                                  </Text>
                                </View>
                              )}
                            </View>

                            {pts.length > 0 && (
                              <View style={styles.pointsWrap}>
                                <Text style={styles.pointsLabel}>POINTS:</Text>
                                {pts.map((pt, pIdx) => {
                                  const isGamePt = pt === "Game";
                                  const isDeuceOrAd = pt === "40-40" || pt.includes("AD");
                                  return (
                                    <View
                                      key={pIdx}
                                      style={[
                                        styles.ptChip,
                                        isGamePt && styles.ptChipGame,
                                        !isGamePt && isDeuceOrAd && styles.ptChipHighlight,
                                      ]}
                                    >
                                      <Text
                                        style={[
                                          styles.ptChipText,
                                          isGamePt && styles.ptChipGameText,
                                          !isGamePt && isDeuceOrAd && styles.ptChipHighlightText,
                                        ]}
                                      >
                                        {pt}
                                      </Text>
                                    </View>
                                  );
                                })}
                              </View>
                            )}
                          </View>
                        );
                      })
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      );
    }
  }

  if (isVolley && scores?.volleyball) {
    const completedSets: any[] = Array.isArray(scores.volleyball.sets) ? scores.volleyball.sets : [];
    const currentRallies: any[] = Array.isArray(scores.volleyball.current_set_rallies)
      ? scores.volleyball.current_set_rallies
      : [];
    const currentPts: [number, number] = scores.volleyball.current_points || [0, 0];
    const hasOngoingSet =
      match.status !== "completed" &&
      (currentRallies.length > 0 || currentPts[0] > 0 || currentPts[1] > 0);

    const allSets = [
      ...completedSets.map((s, idx) => ({
        index: idx,
        home: s.home ?? s.team1 ?? 0,
        away: s.away ?? s.team2 ?? 0,
        rallies: Array.isArray(s.rallies_history) ? s.rallies_history : [],
        isLive: false,
      })),
      ...(hasOngoingSet
        ? [
            {
              index: completedSets.length,
              home: currentPts[0] ?? 0,
              away: currentPts[1] ?? 0,
              rallies: currentRallies,
              isLive: true,
            },
          ]
        : []),
    ];

    if (allSets.length > 0) {
      return (
        <View style={styles.container} testID="volleyball-score-breakdown">
          {allSets.map((setObj) => {
            const isOpen = expandedSets[setObj.index] !== false;
            return (
              <View key={setObj.index} style={styles.setCard}>
                <TouchableOpacity
                  style={styles.setHeader}
                  onPress={() =>
                    setExpandedSets((prev) => ({
                      ...prev,
                      [setObj.index]: !isOpen,
                    }))
                  }
                >
                  <View style={styles.setHeaderLeft}>
                    <View style={styles.setBadge}>
                      <Text style={styles.setBadgeText}>SET {setObj.index + 1}</Text>
                    </View>
                    <Text style={styles.setScoreText}>
                      {setObj.home} - {setObj.away}
                    </Text>
                    {setObj.isLive && (
                      <View style={styles.livePill}>
                        <View style={styles.liveDot} />
                        <Text style={styles.livePillText}>{t("status.live") || "Live"}</Text>
                      </View>
                    )}
                  </View>
                  <Ionicons
                    name={isOpen ? "chevron-up" : "chevron-down"}
                    size={18}
                    color={ScoreBoardTheme.textMuted}
                  />
                </TouchableOpacity>
                {isOpen && setObj.rallies.length > 0 && (
                  <View style={styles.pointsWrap}>
                    {setObj.rallies.map((r: any, rIdx: number) => (
                      <View key={rIdx} style={styles.ptChip}>
                        <Text style={styles.ptChipText}>
                          {r.score_after?.home ?? 0}-{r.score_after?.away ?? 0}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      );
    }
  }

  return (
    <PlayByPlayTable
      events={events}
      teamAName={teamAName}
      teamBName={teamBName}
      emptyText={emptyText}
      formatFallback={formatFallback}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: ScoreBoardTheme.surfaceContainer,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    padding: 14,
    gap: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  headerIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: ScoreBoardTheme.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: ScoreBoardTheme.onSurface,
    fontSize: 13,
    fontWeight: "700",
  },
  headerSubtitle: {
    color: ScoreBoardTheme.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  collapseBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  collapseBtnText: {
    color: ScoreBoardTheme.textMuted,
    fontSize: 11,
    fontWeight: "600",
  },
  setCard: {
    backgroundColor: ScoreBoardTheme.surfaceContainerLow,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    overflow: "hidden",
  },
  setHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
  },
  setHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    flex: 1,
  },
  setBadge: {
    backgroundColor: ScoreBoardTheme.surfaceContainerHigh,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
  },
  setBadgeText: {
    color: ScoreBoardTheme.onSurface,
    fontSize: 11,
    fontWeight: "700",
  },
  setScoreText: {
    color: ScoreBoardTheme.onSurface,
    fontSize: 15,
    fontWeight: "700",
  },
  livePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(244, 63, 94, 0.12)",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#f43f5e",
  },
  livePillText: {
    color: "#fda4af",
    fontSize: 11,
    fontWeight: "600",
  },
  countPill: {
    backgroundColor: ScoreBoardTheme.surfaceContainerHigh,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  countPillText: {
    color: ScoreBoardTheme.textMuted,
    fontSize: 11,
    fontWeight: "500",
  },
  gamesList: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 8,
  },
  noDetailsText: {
    color: ScoreBoardTheme.textMuted,
    fontSize: 12,
    paddingVertical: 6,
  },
  gameCard: {
    backgroundColor: ScoreBoardTheme.surfaceContainer,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    padding: 10,
    gap: 8,
  },
  gameTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  gameBadge: {
    backgroundColor: ScoreBoardTheme.surfaceContainerHighest,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  gameBadgeText: {
    color: ScoreBoardTheme.onSurface,
    fontSize: 11,
    fontWeight: "700",
  },
  servingInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flex: 1,
  },
  servingText: {
    color: ScoreBoardTheme.textMuted,
    fontSize: 11,
  },
  breakBadge: {
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  breakBadgeText: {
    color: "#fbbf24",
    fontSize: 10,
    fontWeight: "700",
  },
  winnerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  winnerLabel: {
    color: ScoreBoardTheme.textMuted,
    fontSize: 12,
  },
  winnerName: {
    color: ScoreBoardTheme.onSurface,
    fontWeight: "700",
  },
  gamesAfterPill: {
    backgroundColor: ScoreBoardTheme.surfaceContainerHigh,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
  },
  gamesAfterText: {
    color: ScoreBoardTheme.onSurface,
    fontSize: 12,
    fontWeight: "700",
  },
  pointsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
    paddingTop: 2,
  },
  pointsLabel: {
    color: ScoreBoardTheme.textMuted,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  ptChip: {
    backgroundColor: ScoreBoardTheme.surfaceContainerHigh,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
  },
  ptChipText: {
    color: ScoreBoardTheme.textMuted,
    fontSize: 11,
    fontWeight: "600",
  },
  ptChipHighlight: {
    borderColor: ScoreBoardTheme.onSurfaceVariant,
  },
  ptChipHighlightText: {
    color: ScoreBoardTheme.onSurface,
  },
  ptChipGame: {
    backgroundColor: ScoreBoardTheme.onSurface,
    borderColor: ScoreBoardTheme.onSurface,
  },
  ptChipGameText: {
    color: ScoreBoardTheme.surfaceContainerLowest,
    fontWeight: "700",
  },
});
