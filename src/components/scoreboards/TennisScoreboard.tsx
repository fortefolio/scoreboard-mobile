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

interface TennisScoreboardProps {
  matchData: any;
  rules?: any;
  canEdit: boolean;
}

export function TennisScoreboard({ matchData, rules, canEdit }: TennisScoreboardProps) {
  const isPadel = matchData.sport_type === "Padel";
  const noAd = rules?.no_ad ?? (isPadel ? true : false);

  const [points, setPoints] = useState(matchData.scores?.tennis?.points || [0, 0]);
  const [games, setGames] = useState(matchData.scores?.tennis?.games || [0, 0]);
  const [sets, setSets] = useState<any[]>(matchData.scores?.tennis?.sets || []);
  const [serverIdx, setServerIdx] = useState<number | null>(
    matchData.scores?.serving_index ?? null
  );
  const [tossing, setTossing] = useState(false);

  useEffect(() => {
    if (matchData.scores?.tennis) {
      setPoints(matchData.scores.tennis.points || [0, 0]);
      setGames(matchData.scores.tennis.games || [0, 0]);
      setSets(matchData.scores.tennis.sets || []);
      setServerIdx(matchData.scores.serving_index ?? null);
    }
  }, [matchData.scores]);

  const teamA = matchData.participants?.[0]?.name || "Jogador / Dupla A";
  const teamB = matchData.participants?.[1]?.name || "Jogador / Dupla B";

  const formatPoints = (pts: number, oppPts: number) => {
    const TENNIS_PTS = ["0", "15", "30", "40"];
    if (pts >= 3 && oppPts >= 3) {
      if (noAd) return pts === 3 && oppPts === 3 ? "40 (Ponto de Ouro)" : "40";
      if (pts === oppPts) return "40 (Deuce)";
      if (pts > oppPts) return "AD";
      return "40";
    }
    return TENNIS_PTS[pts] || String(pts);
  };

  const handleToss = async (selectedIdx: number) => {
    if (!canEdit) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setServerIdx(selectedIdx);
    setTossing(true);

    try {
      await supabase.from("match_events").insert([
        { match_id: matchData.id, event_data: { type: "start_scoreboard" } },
        { match_id: matchData.id, event_data: { type: "toss_coin", winner_index: selectedIdx } },
      ]);
    } catch (e: any) {
      Alert.alert("Erro", e.message);
    } finally {
      setTossing(false);
    }
  };

  const handlePoint = async (winnerIdx: number) => {
    if (!canEdit) return;
    if (serverIdx === null) {
      Alert.alert("Serviço", "Selecione primeiro quem está a servir!");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    // Optimistic UI update
    const newPoints = [...points];
    newPoints[winnerIdx]++;
    setPoints(newPoints);

    try {
      const { error } = await supabase.from("match_events").insert([
        {
          match_id: matchData.id,
          event_data: {
            type: "point",
            winner_index: winnerIdx,
            scoring_side: winnerIdx,
            description: `Ponto ganho por ${winnerIdx === 0 ? teamA : teamB}`,
          },
        },
      ]);
      if (error) throw error;
    } catch (e: any) {
      Alert.alert("Erro", "Falha ao registar ponto: " + e.message);
    }
  };

  const handleFault = async () => {
    if (!canEdit) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    try {
      await supabase.from("match_events").insert([
        {
          match_id: matchData.id,
          event_data: {
            type: "fault",
            server_index: serverIdx,
            description: `Falta de serviço de ${serverIdx === 0 ? teamA : teamB}`,
          },
        },
      ]);
    } catch (e: any) {
      console.warn("Fault event error:", e);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Coin Toss / Server Selection */}
      {serverIdx === null ? (
        <View style={styles.tossBox}>
          <Text style={styles.tossTitle}>SELECIONE QUEM SERVE PRIMEIRO</Text>
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
          <Ionicons name="tennisball" size={16} color="#fbbf24" />
          <Text style={styles.serverText}>
            A Servir: <Text style={styles.serverHighlight}>{serverIdx === 0 ? teamA : teamB}</Text>
          </Text>
          {noAd && <Text style={styles.noAdBadge}>GOLDEN POINT ATIVO</Text>}
        </View>
      )}

      {/* Main Scoreboard Display */}
      <View style={styles.displayCard}>
        {/* Sets History Header */}
        {sets.length > 0 && (
          <View style={styles.setsHistoryRow}>
            <Text style={styles.setsHistoryLabel}>SETS ANTERIORES:</Text>
            <Text style={styles.setsHistoryText}>
              {sets.map((s: any) => `${s[0]}-${s[1]}`).join("   ")}
            </Text>
          </View>
        )}

        {/* Current Set Games */}
        <View style={styles.gamesRow}>
          <View style={styles.playerCol}>
            <Text style={styles.playerName} numberOfLines={1}>
              {teamA}
            </Text>
            <Text style={styles.gamesDigital}>{games[0]}</Text>
          </View>

          <View style={styles.gamesDividerCol}>
            <Text style={styles.gamesDivider}>JOGOS</Text>
          </View>

          <View style={styles.playerCol}>
            <Text style={styles.playerName} numberOfLines={1}>
              {teamB}
            </Text>
            <Text style={styles.gamesDigital}>{games[1]}</Text>
          </View>
        </View>

        {/* Current Game Points LED */}
        <View style={styles.pointsCard}>
          <Text style={styles.pointsLabel}>PONTOS NO JOGO</Text>
          <View style={styles.pointsRow}>
            <Text style={styles.pointDigit}>{formatPoints(points[0], points[1])}</Text>
            <Text style={styles.pointColon}>-</Text>
            <Text style={styles.pointDigit}>{formatPoints(points[1], points[0])}</Text>
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

          {/* Fault / Secondary Controls */}
          <View style={styles.faultRow}>
            <TouchableOpacity style={styles.faultBtn} onPress={handleFault} activeOpacity={0.8}>
              <Ionicons name="warning-outline" size={16} color="#fbbf24" />
              <Text style={styles.faultBtnText}>Registar Falta de Serviço</Text>
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
    backgroundColor: "rgba(251, 191, 36, 0.12)",
    borderWidth: 1,
    borderColor: "#fbbf24",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    alignItems: "center",
  },
  tossTitle: {
    color: "#fbbf24",
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
    color: "#f8fafc",
    fontWeight: "700",
  },
  noAdBadge: {
    fontSize: 10,
    fontWeight: "800",
    color: "#fbbf24",
    backgroundColor: "rgba(251, 191, 36, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  displayCard: {
    backgroundColor: "#101626",
    borderWidth: 1,
    borderColor: "#232d4b",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  setsHistoryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
    paddingBottom: 10,
    marginBottom: 14,
  },
  setsHistoryLabel: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "700",
  },
  setsHistoryText: {
    fontSize: 13,
    color: "#4edea3",
    fontFamily: "monospace",
    fontWeight: "700",
  },
  gamesRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  playerCol: {
    flex: 1,
    alignItems: "center",
  },
  playerName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#f8fafc",
    marginBottom: 4,
    textAlign: "center",
  },
  gamesDigital: {
    fontFamily: "Digital7",
    fontSize: 52,
    color: "#4edea3",
  },
  gamesDividerCol: {
    paddingHorizontal: 10,
    alignItems: "center",
  },
  gamesDivider: {
    fontSize: 11,
    fontWeight: "800",
    color: "#64748b",
    letterSpacing: 2,
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
    fontSize: 44,
    color: "#fbbf24",
  },
  pointColon: {
    fontFamily: "Digital7",
    fontSize: 32,
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
    elevation: 3,
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
  faultRow: {
    marginTop: 6,
  },
  faultBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#151b2d",
    borderWidth: 1,
    borderColor: "#232d4b",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  faultBtnText: {
    color: "#fbbf24",
    fontSize: 13,
    fontWeight: "700",
  },
});
