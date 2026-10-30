import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase/client";

interface VolleyballScoreboardProps {
  matchData: any;
  rules?: any;
  canEdit: boolean;
}

export function VolleyballScoreboard({ matchData, rules, canEdit }: VolleyballScoreboardProps) {
  const [currentPoints, setCurrentPoints] = useState(
    matchData.scores?.volleyball?.current_points ||
      [matchData.scores?.current?.home || 0, matchData.scores?.current?.away || 0]
  );
  const [sets, setSets] = useState<any[]>(
    matchData.scores?.volleyball?.sets || matchData.scores?.set_scores || []
  );
  const [serverIdx, setServerIdx] = useState<number | null>(
    matchData.scores?.serving_index ?? null
  );
  const [tossing, setTossing] = useState(false);

  useEffect(() => {
    if (matchData.scores) {
      if (matchData.scores.volleyball?.current_points) {
        setCurrentPoints(matchData.scores.volleyball.current_points);
      } else if (matchData.scores.current) {
        setCurrentPoints([matchData.scores.current.home || 0, matchData.scores.current.away || 0]);
      }
      setSets(matchData.scores.volleyball?.sets || matchData.scores.set_scores || []);
      setServerIdx(matchData.scores.serving_index ?? null);
    }
  }, [matchData.scores]);

  const teamA = matchData.participants?.[0]?.name || "Equipa A";
  const teamB = matchData.participants?.[1]?.name || "Equipa B";

  const setsWonA = sets.filter((s: any) => (Array.isArray(s) ? s[0] > s[1] : (s.team1 ?? s.home ?? 0) > (s.team2 ?? s.away ?? 0))).length;
  const setsWonB = sets.filter((s: any) => (Array.isArray(s) ? s[1] > s[0] : (s.team2 ?? s.away ?? 0) > (s.team1 ?? s.home ?? 0))).length;

  const handleToss = async (selectedIdx: number) => {
    if (!canEdit) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setServerIdx(selectedIdx);
    setTossing(true);

    try {
      await supabase.from("match_events").insert([
        {
          match_id: matchData.id,
          event_data: { type: "start_scoreboard", initial_server_index: selectedIdx },
        },
      ]);
    } catch (e: any) {
      Alert.alert("Erro", e.message);
    } finally {
      setTossing(false);
    }
  };

  const handlePoint = async (teamIdx: 0 | 1) => {
    if (!canEdit) return;
    if (serverIdx === null) {
      Alert.alert("Serviço", "Selecione primeiro a equipa que serve!");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    // Optimistic UI update
    const newPoints = [...currentPoints];
    newPoints[teamIdx]++;
    setCurrentPoints(newPoints);

    try {
      const { error } = await supabase.from("match_events").insert([
        {
          match_id: matchData.id,
          event_data: {
            type: "point",
            team: teamIdx === 0 ? "team1" : "team2",
            scoring_side: teamIdx,
            description: `Ponto ganho por ${teamIdx === 0 ? teamA : teamB}`,
          },
        },
      ]);
      if (error) throw error;
    } catch (e: any) {
      Alert.alert("Erro", "Falha ao registar ponto: " + e.message);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Server Selection */}
      {serverIdx === null ? (
        <View style={styles.tossBox}>
          <Text style={styles.tossTitle}>QUEM EFETUA O PRIMEIRO SERVIÇO?</Text>
          <View style={styles.tossButtonsRow}>
            <TouchableOpacity
              style={styles.tossBtn}
              onPress={() => handleToss(0)}
              disabled={tossing}
            >
              <Text style={styles.tossBtnText}>{teamA}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.tossBtn}
              onPress={() => handleToss(1)}
              disabled={tossing}
            >
              <Text style={styles.tossBtnText}>{teamB}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.serverInfo}>
          <Ionicons name="radio-button-on" size={16} color="#4edea3" />
          <Text style={styles.serverText}>
            Serviço: <Text style={styles.serverHighlight}>{serverIdx === 0 ? teamA : teamB}</Text>
          </Text>
        </View>
      )}

      {/* Main Scoreboard Display */}
      <View style={styles.displayCard}>
        {/* Sets Won */}
        <View style={styles.setsRow}>
          <View style={styles.setsTeamCol}>
            <Text style={styles.teamName} numberOfLines={1}>
              {teamA}
            </Text>
            <Text style={styles.setsDigit}>{setsWonA}</Text>
          </View>

          <View style={styles.setsMidCol}>
            <Text style={styles.setsLabel}>SETS</Text>
            <Text style={styles.activeSetLabel}>SET {sets.length + 1}</Text>
          </View>

          <View style={styles.setsTeamCol}>
            <Text style={styles.teamName} numberOfLines={1}>
              {teamB}
            </Text>
            <Text style={styles.setsDigit}>{setsWonB}</Text>
          </View>
        </View>

        {/* Live Rally Points LED */}
        <View style={styles.pointsCard}>
          <Text style={styles.pointsLabel}>PONTOS NO SET ATUAL</Text>
          <View style={styles.pointsRow}>
            <Text style={styles.pointDigit}>{currentPoints[0]}</Text>
            <Text style={styles.pointColon}>-</Text>
            <Text style={styles.pointDigit}>{currentPoints[1]}</Text>
          </View>
        </View>
      </View>

      {/* Action Buttons for Referee */}
      {canEdit && (
        <View style={styles.actionsSection}>
          <View style={styles.pointButtonsRow}>
            <TouchableOpacity
              style={[styles.bigPointBtn, styles.pointBtnA]}
              onPress={() => handlePoint(0)}
              activeOpacity={0.8}
            >
              <Text style={styles.pointBtnLabel}>+1 PONTO</Text>
              <Text style={styles.pointBtnTeam} numberOfLines={1}>
                {teamA}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.bigPointBtn, styles.pointBtnB]}
              onPress={() => handlePoint(1)}
              activeOpacity={0.8}
            >
              <Text style={styles.pointBtnLabel}>+1 PONTO</Text>
              <Text style={styles.pointBtnTeam} numberOfLines={1}>
                {teamB}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  tossBox: {
    backgroundColor: "rgba(78, 222, 163, 0.12)",
    borderWidth: 1,
    borderColor: "#4edea3",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    alignItems: "center",
  },
  tossTitle: {
    color: "#4edea3",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 12,
  },
  tossButtonsRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  tossBtn: {
    flex: 1,
    backgroundColor: "#151b2d",
    borderWidth: 1,
    borderColor: "#232d4b",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  tossBtnText: {
    color: "#f8fafc",
    fontSize: 13,
    fontWeight: "700",
  },
  serverInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#151b2d",
    borderWidth: 1,
    borderColor: "#232d4b",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  serverText: {
    fontSize: 13,
    color: "#94a3b8",
    flex: 1,
  },
  serverHighlight: {
    color: "#4edea3",
    fontWeight: "700",
  },
  displayCard: {
    backgroundColor: "#101626",
    borderWidth: 1,
    borderColor: "#232d4b",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  setsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  setsTeamCol: {
    flex: 1,
    alignItems: "center",
  },
  teamName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#f8fafc",
    marginBottom: 4,
    textAlign: "center",
  },
  setsDigit: {
    fontFamily: "Digital7",
    fontSize: 48,
    color: "#4edea3",
  },
  setsMidCol: {
    paddingHorizontal: 10,
    alignItems: "center",
  },
  setsLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#64748b",
    letterSpacing: 2,
  },
  activeSetLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#fbbf24",
    marginTop: 4,
  },
  pointsCard: {
    backgroundColor: "#080c14",
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  pointsLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748b",
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  pointsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  pointDigit: {
    fontFamily: "Digital7",
    fontSize: 52,
    color: "#fbbf24",
  },
  pointColon: {
    fontFamily: "Digital7",
    fontSize: 36,
    color: "#64748b",
  },
  actionsSection: {
    gap: 12,
  },
  pointButtonsRow: {
    flexDirection: "row",
    gap: 14,
  },
  bigPointBtn: {
    flex: 1,
    paddingVertical: 24,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  pointBtnA: {
    backgroundColor: "#4f46e5",
  },
  pointBtnB: {
    backgroundColor: "#0284c7",
  },
  pointBtnLabel: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 4,
  },
  pointBtnTeam: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 12,
    fontWeight: "600",
    paddingHorizontal: 12,
  },
});
