import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScoreBoardTheme } from "@/constants/theme";
import { useLanguage } from "@/lib/i18n";
import { countSetsWon, extractSetsData } from "@/lib/scoring/sets";
import { formatTeamOrPlayerName } from "@/lib/utils/formatName";

interface BracketMatchNode {
  id: string;
  round_number: number;
  match_id?: string | null;
  match?: any;
}

interface TournamentBracketProps {
  bracketMatches: BracketMatchNode[];
  tournament?: any;
}

const SLOT_HEIGHT = 132;
const CONNECTOR_COLOR = "rgba(100, 116, 139, 0.75)";
const TENNIS_POINTS = ["0", "15", "30", "40", "AD"];

export function TournamentBracketView({
  bracketMatches,
  tournament,
}: TournamentBracketProps) {
  const router = useRouter();
  const { locale } = useLanguage();
  const isPt = locale === "pt";

  // Group by round_number
  const rounds = bracketMatches.reduce((acc: Record<number, BracketMatchNode[]>, bm) => {
    if (!acc[bm.round_number]) acc[bm.round_number] = [];
    acc[bm.round_number].push(bm);
    return acc;
  }, {});

  const roundNumbers = Object.keys(rounds)
    .map(Number)
    .sort((a, b) => a - b);

  if (roundNumbers.length === 0) {
    return (
      <View style={styles.emptyCard}>
        <Ionicons name="git-network-outline" size={36} color={ScoreBoardTheme.textMuted} />
        <Text style={styles.emptyText}>
          {isPt
            ? "Chave eliminatória ainda não gerada."
            : "Knockout bracket not generated yet."}
        </Text>
      </View>
    );
  }

  const maxRound = Math.max(...roundNumbers);

  const getRoundTitle = (r: number) => {
    const roundsToFinal = maxRound - r;
    if (roundsToFinal === 0) return isPt ? "Final" : "Final";
    if (roundsToFinal === 1) return isPt ? "Meias-Finais" : "Semi-Finals";
    if (roundsToFinal === 2) return isPt ? "Quartos de Final" : "Quarter-Finals";
    if (roundsToFinal === 3) return isPt ? "Oitavos de Final" : "Round of 16";
    if (roundsToFinal === 4) return isPt ? "16avos de Final" : "Round of 32";
    return isPt ? `Ronda ${r}` : `Round ${r}`;
  };

  const getRulesSubtitle = (r: number) => {
    const rules =
      tournament?.settings?.overrides?.[r] ||
      tournament?.settings?.default || {
        max_sets: 3,
        points_per_set: 21,
      };
    if (tournament?.sport_type === "Tennis" || tournament?.sport_type === "Padel") {
      return isPt
        ? `Melhor de ${rules.max_sets} Sets`
        : `Best of ${rules.max_sets} Sets`;
    }
    const capPart = rules.point_cap ? ` • Cap ${rules.point_cap}` : "";
    return `${rules.max_sets} Sets • ${rules.points_per_set} Pts${capPart}`;
  };

  const renderLivePoint = (m: any, sideIdx: 0 | 1) => {
    if (m?.sport_type === "Tennis" && m?.scores?.tennis) {
      const p = m.scores.tennis.points?.[sideIdx] ?? 0;
      const opp = m.scores.tennis.points?.[sideIdx === 0 ? 1 : 0] ?? 0;
      if (p >= 3 && opp >= 3) {
        return p > opp ? "AD" : "40";
      }
      return TENNIS_POINTS[p] || "0";
    }
    return m?.scores?.current?.[sideIdx === 0 ? "home" : "away"] ?? 0;
  };

  let runningMatchNumber = 1;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
      <View style={styles.bracketContainer}>
        {roundNumbers.map((r, rIdx) => {
          const nodes = rounds[r] || [];
          const hasPrevRound = rIdx > 0;
          const hasNextRound = rIdx < roundNumbers.length - 1;
          const slotHeight = SLOT_HEIGHT * Math.pow(2, rIdx);
          const roundDate = tournament?.settings?.round_dates?.[`bracket_${r}`];

          return (
            <View key={r} style={styles.roundCol}>
              {/* Round Header */}
              <View style={styles.roundHeaderContainer}>
                <View style={styles.roundPill}>
                  <Text style={styles.roundPillText}>{getRoundTitle(r)}</Text>
                </View>

                {roundDate ? (
                  <View style={styles.roundDatePill}>
                    <Ionicons
                      name="calendar-outline"
                      size={11}
                      color={ScoreBoardTheme.textMuted}
                    />
                    <Text style={styles.roundDateText}>{roundDate}</Text>
                  </View>
                ) : null}

                <Text style={styles.rulesText}>{getRulesSubtitle(r)}</Text>
              </View>

              {/* Match Nodes Column */}
              <View style={styles.matchesCol}>
                {nodes.map((node, idx) => {
                  const m = node.match;
                  const matchOrderLabel =
                    m?.global_match_order ?? runningMatchNumber++;
                  if (m?.global_match_order) {
                    runningMatchNumber = Math.max(
                      runningMatchNumber,
                      Number(m.global_match_order) + 1
                    );
                  }

                  const isOngoing = m?.status === "ongoing";
                  const isCompleted = m?.status === "completed";
                  const setsData = extractSetsData(m?.scores);
                  const isEven = (idx + 1) % 2 === 0;

                  return (
                    <View
                      key={node.id}
                      style={[styles.matchSlot, { height: slotHeight }]}
                    >
                      {/* Incoming Left Connector */}
                      {hasPrevRound && <View style={styles.leftConnector} />}

                      {/* Outgoing Right Connector */}
                      {hasNextRound && (
                        <View
                          style={[
                            styles.rightConnectorBase,
                            !isEven
                              ? styles.rightConnectorTop
                              : styles.rightConnectorBottom,
                          ]}
                        />
                      )}

                      <TouchableOpacity
                        style={[
                          styles.matchNodeCard,
                          isOngoing && styles.matchNodeCardLive,
                        ]}
                        onPress={() => {
                          if (m?.id) {
                            router.push(`/match/${m.id}` as any);
                          }
                        }}
                        disabled={!m?.id}
                        activeOpacity={0.8}
                      >
                        <View style={styles.participantsBlock}>
                          {([0, 1] as const).map((sideIdx) => {
                            const rawName = m?.participants?.[sideIdx]?.name;
                            const isPlaceholder =
                              !rawName ||
                              rawName.startsWith("Winner") ||
                              rawName === "TBD" ||
                              rawName.startsWith("1st ") ||
                              rawName.startsWith("2nd ");
                            const displayName = rawName
                              ? isPlaceholder
                                ? rawName
                                : formatTeamOrPlayerName(rawName, 18)
                              : "TBD";
                            const isServing =
                              isOngoing && m?.scores?.serving_index === sideIdx;

                            return (
                              <View key={sideIdx} style={styles.participantRow}>
                                <View style={styles.participantNameWrap}>
                                  <Text
                                    style={[
                                      styles.participantName,
                                      isPlaceholder && styles.participantPlaceholder,
                                    ]}
                                    numberOfLines={1}
                                  >
                                    {displayName}
                                  </Text>
                                  {isServing && <View style={styles.servingDot} />}
                                </View>

                                <View style={styles.scoresRow}>
                                  {setsData.map((s: any, sIdx: number) => {
                                    const pScore =
                                      sideIdx === 0
                                        ? (s.home ?? s.team1 ?? 0)
                                        : (s.away ?? s.team2 ?? 0);
                                    const oScore =
                                      sideIdx === 0
                                        ? (s.away ?? s.team2 ?? 0)
                                        : (s.home ?? s.team1 ?? 0);
                                    return (
                                      <Text
                                        key={sIdx}
                                        style={[
                                          styles.setScoreText,
                                          pScore > oScore && styles.setScoreWon,
                                        ]}
                                      >
                                        {pScore}
                                      </Text>
                                    );
                                  })}

                                  <View style={styles.totalSetsBox}>
                                    <Text style={styles.totalSetsText}>
                                      {countSetsWon(setsData, sideIdx)}
                                    </Text>
                                  </View>

                                  {isOngoing && m?.scores && (
                                    <View style={styles.livePointsRow}>
                                      {m.sport_type === "Tennis" && m.scores.tennis && (
                                        <Text style={styles.liveGamesText}>
                                          {m.scores.tennis.games?.[sideIdx] ?? 0}
                                        </Text>
                                      )}
                                      <Text style={styles.livePointsText}>
                                        {renderLivePoint(m, sideIdx)}
                                      </Text>
                                    </View>
                                  )}
                                </View>
                              </View>
                            );
                          })}
                        </View>

                        <View style={styles.cardFooter}>
                          <View style={styles.footerLeft}>
                            <Text style={styles.matchOrderText}>
                              {isPt ? `Jogo ${matchOrderLabel}` : `Match ${matchOrderLabel}`}
                            </Text>
                            {m?.court ? (
                              <Text style={styles.courtText}> • {m.court}</Text>
                            ) : null}
                          </View>

                          {isOngoing ? (
                            <View style={styles.liveStatusBadge}>
                              <View style={styles.liveDot} />
                              <Text style={styles.liveStatusText}>
                                {isPt ? "Em Direto" : "Live"}
                              </Text>
                            </View>
                          ) : (
                            <Text style={styles.statusText}>
                              {isCompleted
                                ? isPt
                                  ? "Final"
                                  : "Final"
                                : isPt
                                ? "Agendado"
                                : "Scheduled"}
                            </Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    marginHorizontal: -16,
  },
  bracketContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 48,
    paddingBottom: 24,
  },
  emptyCard: {
    backgroundColor: ScoreBoardTheme.surfaceContainer,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    padding: 32,
    alignItems: "center",
    gap: 8,
  },
  emptyText: {
    color: ScoreBoardTheme.textMuted,
    fontSize: 13,
  },
  roundCol: {
    width: 248,
  },
  roundHeaderContainer: {
    alignItems: "center",
    justifyContent: "flex-start",
    marginBottom: 16,
    minHeight: 62,
    gap: 6,
  },
  roundPill: {
    backgroundColor: ScoreBoardTheme.surfaceContainer,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
  },
  roundPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: ScoreBoardTheme.onSurface,
  },
  roundDatePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: ScoreBoardTheme.surfaceContainerHigh,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
  },
  roundDateText: {
    fontSize: 11,
    color: ScoreBoardTheme.onSurface,
    fontVariant: ["tabular-nums"],
  },
  rulesText: {
    fontSize: 11,
    color: ScoreBoardTheme.textMuted,
    fontVariant: ["tabular-nums"],
  },
  matchesCol: {
    flexDirection: "column",
  },
  matchSlot: {
    justifyContent: "center",
    position: "relative",
  },
  leftConnector: {
    position: "absolute",
    left: -24,
    top: "50%",
    width: 24,
    borderTopWidth: 2,
    borderColor: CONNECTOR_COLOR,
  },
  rightConnectorBase: {
    position: "absolute",
    right: -24,
    width: 24,
    height: "50%",
    borderRightWidth: 2,
    borderColor: CONNECTOR_COLOR,
  },
  rightConnectorTop: {
    top: "50%",
    borderTopWidth: 2,
    borderTopRightRadius: 8,
  },
  rightConnectorBottom: {
    bottom: "50%",
    borderBottomWidth: 2,
    borderBottomRightRadius: 8,
  },
  matchNodeCard: {
    backgroundColor: ScoreBoardTheme.surfaceContainer,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    borderRadius: 12,
    padding: 12,
  },
  matchNodeCardLive: {
    borderColor: "rgba(244, 63, 94, 0.35)",
  },
  participantsBlock: {
    gap: 8,
  },
  participantRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  participantNameWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  participantName: {
    fontSize: 12,
    fontWeight: "500",
    color: ScoreBoardTheme.onSurface,
    flexShrink: 1,
  },
  participantPlaceholder: {
    color: ScoreBoardTheme.textMuted,
    fontStyle: "italic",
  },
  servingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: ScoreBoardTheme.onSurfaceVariant,
  },
  scoresRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  setScoreText: {
    fontFamily: "Digital7Mono",
    fontSize: 13,
    color: ScoreBoardTheme.textMuted,
    minWidth: 12,
    textAlign: "right",
    fontVariant: ["tabular-nums"],
  },
  setScoreWon: {
    color: ScoreBoardTheme.onSurface,
    fontWeight: "600",
  },
  totalSetsBox: {
    paddingLeft: 6,
    borderLeftWidth: 1,
    borderLeftColor: ScoreBoardTheme.borderSubtle,
    minWidth: 16,
    alignItems: "flex-end",
  },
  totalSetsText: {
    fontFamily: "Digital7Mono",
    fontSize: 14,
    fontWeight: "700",
    color: ScoreBoardTheme.onSurface,
    fontVariant: ["tabular-nums"],
  },
  livePointsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  liveGamesText: {
    fontFamily: "Digital7Mono",
    fontSize: 13,
    color: ScoreBoardTheme.onSurfaceVariant,
    minWidth: 12,
    textAlign: "right",
    fontVariant: ["tabular-nums"],
  },
  livePointsText: {
    fontFamily: "Digital7Mono",
    fontSize: 14,
    fontWeight: "700",
    color: ScoreBoardTheme.onSurface,
    minWidth: 16,
    textAlign: "right",
    fontVariant: ["tabular-nums"],
  },
  cardFooter: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: ScoreBoardTheme.borderSubtle,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  footerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  matchOrderText: {
    fontSize: 11,
    fontWeight: "500",
    color: ScoreBoardTheme.textMuted,
  },
  courtText: {
    fontSize: 11,
    fontWeight: "500",
    color: ScoreBoardTheme.onSurfaceVariant,
  },
  liveStatusBadge: {
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
  liveStatusText: {
    fontSize: 11,
    fontWeight: "600",
    color: ScoreBoardTheme.onSurface,
  },
  statusText: {
    fontSize: 11,
    color: ScoreBoardTheme.textMuted,
  },
});
