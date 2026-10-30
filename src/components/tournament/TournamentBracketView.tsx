import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

interface BracketMatchNode {
  id: string;
  round_number: number;
  match_id?: string | null;
  match?: any;
}

interface TournamentBracketProps {
  bracketMatches: BracketMatchNode[];
}

export function TournamentBracketView({ bracketMatches }: TournamentBracketProps) {
  const router = useRouter();

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
        <Ionicons name="git-network-outline" size={36} color="#475569" />
        <Text style={styles.emptyText}>Chave eliminatória ainda não gerada.</Text>
      </View>
    );
  }

  const getRoundTitle = (r: number, totalRounds: number) => {
    if (r === totalRounds) return "FINAL";
    if (r === totalRounds - 1) return "MEIAS-FINAIS";
    if (r === totalRounds - 2) return "QUARTOS DE FINAL";
    return `RONDA ${r}`;
  };

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
      <View style={styles.bracketContainer}>
        {roundNumbers.map((r) => {
          const nodes = rounds[r] || [];
          return (
            <View key={r} style={styles.roundCol}>
              <View style={styles.roundHeader}>
                <Text style={styles.roundHeaderText}>
                  {getRoundTitle(r, roundNumbers.length)}
                </Text>
              </View>

              <View style={styles.matchesCol}>
                {nodes.map((node) => {
                  const m = node.match;
                  const p1 = m?.participants?.[0]?.name || "TBD";
                  const p2 = m?.participants?.[1]?.name || "TBD";
                  const s1 = m?.scores?.current?.home ?? m?.scores?.football?.goals?.[0] ?? "-";
                  const s2 = m?.scores?.current?.away ?? m?.scores?.football?.goals?.[1] ?? "-";
                  const isOngoing = m?.status === "ongoing";
                  const isCompleted = m?.status === "completed";

                  return (
                    <TouchableOpacity
                      key={node.id}
                      style={[styles.matchNodeCard, isOngoing && styles.matchNodeCardLive]}
                      onPress={() => {
                        if (m?.id) {
                          router.push(`/match/${m.id}` as any);
                        }
                      }}
                      disabled={!m?.id}
                      activeOpacity={0.8}
                    >
                      <View style={styles.nodeMeta}>
                        {isOngoing && <View style={styles.liveDot} />}
                        <Text style={styles.nodeStatus}>
                          {isOngoing ? "EM DIRETO" : isCompleted ? "FINAL" : "AGENDADO"}
                        </Text>
                      </View>

                      {/* Participant 1 */}
                      <View style={styles.participantRow}>
                        <Text style={styles.participantName} numberOfLines={1}>
                          {p1}
                        </Text>
                        <Text style={styles.scoreText}>{s1}</Text>
                      </View>

                      <View style={styles.nodeDivider} />

                      {/* Participant 2 */}
                      <View style={styles.participantRow}>
                        <Text style={styles.participantName} numberOfLines={1}>
                          {p2}
                        </Text>
                        <Text style={styles.scoreText}>{s2}</Text>
                      </View>
                    </TouchableOpacity>
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
    gap: 16,
    paddingBottom: 20,
  },
  emptyCard: {
    backgroundColor: "#151b2d",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#232d4b",
    padding: 32,
    alignItems: "center",
    gap: 8,
  },
  emptyText: {
    color: "#64748b",
    fontSize: 13,
  },
  roundCol: {
    width: 220,
  },
  roundHeader: {
    backgroundColor: "#101626",
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1e293b",
    alignItems: "center",
    marginBottom: 12,
  },
  roundHeaderText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#4edea3",
    letterSpacing: 1.5,
  },
  matchesCol: {
    gap: 12,
  },
  matchNodeCard: {
    backgroundColor: "#151b2d",
    borderWidth: 1,
    borderColor: "#232d4b",
    borderRadius: 12,
    padding: 10,
  },
  matchNodeCardLive: {
    borderColor: "#4edea3",
    backgroundColor: "#111827",
  },
  nodeMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#4edea3",
  },
  nodeStatus: {
    fontSize: 9,
    fontWeight: "800",
    color: "#64748b",
  },
  participantRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  participantName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#f8fafc",
    flex: 1,
    paddingRight: 6,
  },
  scoreText: {
    fontFamily: "Digital7",
    fontSize: 18,
    color: "#4edea3",
  },
  nodeDivider: {
    height: 1,
    backgroundColor: "#1e293b",
    marginVertical: 4,
  },
});
