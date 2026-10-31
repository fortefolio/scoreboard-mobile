import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
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
  const isBeachVolleyball = matchData.sport_type === "Beach Volleyball";
  const defaultMaxSets = rules?.max_sets || (isBeachVolleyball ? 3 : 5);
  const defaultPointsPerSet = rules?.points_per_set || (isBeachVolleyball ? 21 : 25);
  const defaultDecidingPoints = rules?.deciding_set_points || 15;
  const pointCap = rules?.point_cap || null;

  const [currentPoints, setCurrentPoints] = useState<[number, number]>(
    matchData.scores?.volleyball?.current_points || [
      matchData.scores?.current?.home || 0,
      matchData.scores?.current?.away || 0,
    ]
  );
  const [sets, setSets] = useState<any[]>(
    matchData.scores?.volleyball?.sets || matchData.scores?.set_scores || []
  );
  const [serverIdx, setServerIdx] = useState<number | null>(
    matchData.scores?.serving_index ?? null
  );
  const [timeouts, setTimeouts] = useState({
    home: matchData.scores?.volleyball?.timeouts?.home || 2,
    away: matchData.scores?.volleyball?.timeouts?.away || 2,
  });
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
      if (matchData.scores.volleyball?.timeouts) {
        setTimeouts(matchData.scores.volleyball.timeouts);
      }
    }
  }, [matchData.scores]);

  const teamA = matchData.participants?.[0]?.name || "Equipa A";
  const teamB = matchData.participants?.[1]?.name || "Equipa B";

  const setsWonA = sets.filter((s: any) =>
    Array.isArray(s) ? s[0] > s[1] : (s.team1 ?? s.home ?? 0) > (s.team2 ?? s.away ?? 0)
  ).length;
  const setsWonB = sets.filter((s: any) =>
    Array.isArray(s) ? s[1] > s[0] : (s.team2 ?? s.away ?? 0) > (s.team1 ?? s.home ?? 0)
  ).length;

  const currentSetNum = sets.length + 1;
  const isDecidingSet = currentSetNum === defaultMaxSets;
  const activeLimit = isDecidingSet ? defaultDecidingPoints : defaultPointsPerSet;

  // Alerts logic
  const isDeuce =
    currentPoints[0] >= activeLimit - 1 &&
    currentPoints[1] >= activeLimit - 1 &&
    currentPoints[0] === currentPoints[1] &&
    (!pointCap || currentPoints[0] < pointCap - 1);

  const isCourtSwitch = isBeachVolleyball
    ? (currentPoints[0] + currentPoints[1]) > 0 && (currentPoints[0] + currentPoints[1]) % 7 === 0
    : isDecidingSet && (currentPoints[0] === 8 || currentPoints[1] === 8);

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
        {
          match_id: matchData.id,
          event_data: { type: "toss_coin", winner_index: selectedIdx },
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

    const newPoints: [number, number] = [...currentPoints];
    newPoints[teamIdx]++;
    setCurrentPoints(newPoints);

    // Rotate server if receiving team scores
    const newServer = teamIdx === serverIdx ? serverIdx : teamIdx;
    setServerIdx(newServer);

    try {
      await supabase.from("match_events").insert([
        {
          match_id: matchData.id,
          event_data: {
            type: "point_won",
            side: teamIdx === 0 ? "home" : "away",
            scoring_side: teamIdx,
            description: `Ponto ganho por ${teamIdx === 0 ? teamA : teamB}`,
          },
        },
      ]);
    } catch (e: any) {
      Alert.alert("Erro", "Falha ao registar ponto: " + e.message);
    }
  };

  const handleCorrectPoint = async (teamIdx: 0 | 1) => {
    if (!canEdit || currentPoints[teamIdx] <= 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const newPoints: [number, number] = [...currentPoints];
    newPoints[teamIdx] = Math.max(0, newPoints[teamIdx] - 1);
    setCurrentPoints(newPoints);

    const currentScores = matchData?.scores || {};
    const updated = {
      ...currentScores,
      current: {
        ...(currentScores.current || {}),
        [teamIdx === 0 ? "home" : "away"]: newPoints[teamIdx],
      },
      volleyball: {
        ...(currentScores.volleyball || {}),
        current_points: newPoints,
      },
    };

    await supabase
      .from("matches")
      .update({ scores: updated, updated_at: new Date().toISOString() })
      .eq("id", matchData.id);
  };

  const handleTimeout = async (side: "home" | "away") => {
    if (!canEdit || timeouts[side] <= 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const nextTimeouts = { ...timeouts, [side]: timeouts[side] - 1 };
    setTimeouts(nextTimeouts);

    const currentScores = matchData?.scores || {};
    const updated = {
      ...currentScores,
      volleyball: {
        ...(currentScores.volleyball || {}),
        timeouts: nextTimeouts,
      },
    };

    await supabase
      .from("matches")
      .update({ scores: updated, updated_at: new Date().toISOString() })
      .eq("id", matchData.id);
  };

  const toggleServer = async () => {
    if (!canEdit) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const nextIdx = serverIdx === 0 ? 1 : 0;
    setServerIdx(nextIdx);

    const currentScores = matchData?.scores || {};
    await supabase
      .from("matches")
      .update({
        scores: { ...currentScores, serving_index: nextIdx },
        updated_at: new Date().toISOString(),
      })
      .eq("id", matchData.id);
  };

  const handleFinalizeMatch = () => {
    if (!canEdit) return;
    Alert.alert(
      "Terminar Jogo",
      `Tens a certeza que queres terminar este jogo de ${isBeachVolleyball ? "Vólei de Praia" : "Voleibol"}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Terminar",
          style: "destructive",
          onPress: async () => {
            await supabase
              .from("matches")
              .update({ status: "completed", updated_at: new Date().toISOString() })
              .eq("id", matchData.id);
          },
        },
      ]
    );
  };

  return (
    <View style={styles.landscapeContainer}>
      {/* Toss Server Banner overlay if serverIdx is null */}
      {serverIdx === null && (
        <View style={styles.tossOverlay}>
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
      )}

      {/* Column 1: Team Home */}
      <View style={styles.teamColumn}>
        <View style={styles.teamHeaderRow}>
          <View style={[styles.teamDot, { backgroundColor: "#818cf8" }]} />
          <Text style={styles.teamName} numberOfLines={1}>
            {teamA}
          </Text>
          {serverIdx === 0 && (
            <View style={styles.servingBadge}>
              <Text style={styles.servingText}>A SERVIR</Text>
            </View>
          )}
        </View>

        {/* Stats Badges */}
        <View style={styles.statsBadgesRow}>
          <View style={styles.badgePill}>
            <Text style={styles.badgeText}>
              Sets: <Text style={styles.digitalBadgeNum}>{setsWonA}</Text>
            </Text>
          </View>
          <View style={styles.badgePill}>
            <Text style={styles.badgeText}>
              Desc: <Text style={styles.digitalBadgeNum}>{timeouts.home}</Text>
            </Text>
          </View>
        </View>

        {/* Big Home Rally Score in Digital Font */}
        <Text style={[styles.scoreDigital, { color: "#818cf8" }]}>{currentPoints[0]}</Text>

        {/* Home Controls */}
        {canEdit && (
          <View style={styles.controlsBlock}>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.btn, styles.btnPoint]}
                onPress={() => handlePoint(0)}
              >
                <Ionicons name="add" size={16} color="#ffffff" />
                <Text style={styles.btnPointText}>PONTO</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnUndo]}
                onPress={() => handleCorrectPoint(0)}
              >
                <Ionicons name="arrow-undo" size={13} color="#94a3b8" />
                <Text style={styles.btnUndoText}>-1</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.btn, styles.btnSubAction]}
                onPress={() => handleTimeout("home")}
                disabled={timeouts.home <= 0}
              >
                <Text style={styles.btnSubText}>Desconto</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Column 2: Center Set Status & Target Score */}
      <View style={styles.centerColumn}>
        <View style={styles.periodPill}>
          <Text style={styles.periodPillText}>
            SET {currentSetNum} {isDecidingSet ? "(NEGRA)" : ""}
          </Text>
        </View>

        {/* Target limit */}
        <View style={styles.targetBox}>
          <Text style={styles.targetLabel}>LIMITE DO SET</Text>
          <Text style={styles.targetDigital}>{activeLimit}</Text>
        </View>

        {/* Technical Alerts */}
        {isDeuce && (
          <View style={styles.alertPillDeuce}>
            <Text style={styles.alertTextDeuce}>DEUCE (Vant. 2)</Text>
          </View>
        )}
        {isCourtSwitch && (
          <View style={styles.alertPillSwitch}>
            <Text style={styles.alertTextSwitch}>TROCA DE CAMPO</Text>
          </View>
        )}

        {/* Server Toggle Button */}
        {canEdit && (
          <TouchableOpacity style={styles.serverToggleBtn} onPress={toggleServer}>
            <Ionicons name="sync" size={11} color="#60a5fa" />
            <Text style={styles.serverToggleText}>Alternar Saque</Text>
          </TouchableOpacity>
        )}

        {/* Finalize Match */}
        {canEdit && (
          <TouchableOpacity style={styles.endMatchBtn} onPress={handleFinalizeMatch}>
            <Ionicons name="checkmark-circle-outline" size={13} color="#f87171" />
            <Text style={styles.endMatchText}>Terminar</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Column 3: Team Away */}
      <View style={styles.teamColumn}>
        <View style={styles.teamHeaderRow}>
          {serverIdx === 1 && (
            <View style={styles.servingBadgeAway}>
              <Text style={styles.servingTextAway}>A SERVIR</Text>
            </View>
          )}
          <Text style={styles.teamName} numberOfLines={1}>
            {teamB}
          </Text>
          <View style={[styles.teamDot, { backgroundColor: "#4edea3" }]} />
        </View>

        {/* Stats Badges */}
        <View style={styles.statsBadgesRow}>
          <View style={styles.badgePill}>
            <Text style={styles.badgeText}>
              Desc: <Text style={styles.digitalBadgeNum}>{timeouts.away}</Text>
            </Text>
          </View>
          <View style={styles.badgePill}>
            <Text style={styles.badgeText}>
              Sets: <Text style={styles.digitalBadgeNum}>{setsWonB}</Text>
            </Text>
          </View>
        </View>

        {/* Big Away Rally Score in Digital Font */}
        <Text style={[styles.scoreDigital, { color: "#4edea3" }]}>{currentPoints[1]}</Text>

        {/* Away Controls */}
        {canEdit && (
          <View style={styles.controlsBlock}>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.btn, styles.btnUndo]}
                onPress={() => handleCorrectPoint(1)}
              >
                <Ionicons name="arrow-undo" size={13} color="#94a3b8" />
                <Text style={styles.btnUndoText}>-1</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnPoint, styles.btnPointAway]}
                onPress={() => handlePoint(1)}
              >
                <Ionicons name="add" size={16} color="#ffffff" />
                <Text style={styles.btnPointText}>PONTO</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.btn, styles.btnSubAction]}
                onPress={() => handleTimeout("away")}
                disabled={timeouts.away <= 0}
              >
                <Text style={styles.btnSubText}>Desconto</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  landscapeContainer: {
    flex: 1,
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#080c14",
    alignItems: "stretch",
    gap: 8,
    position: "relative",
  },
  tossOverlay: {
    position: "absolute",
    top: 6,
    left: 12,
    right: 12,
    zIndex: 20,
    backgroundColor: "#101626",
    borderWidth: 1,
    borderColor: "#4f46e5",
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  tossTitle: {
    fontSize: 10,
    fontWeight: "900",
    color: "#818cf8",
    letterSpacing: 1,
    marginBottom: 6,
  },
  tossButtonsRow: {
    flexDirection: "row",
    gap: 8,
    width: "100%",
    maxWidth: 320,
  },
  tossBtn: {
    flex: 1,
    backgroundColor: "#4f46e5",
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: "center",
  },
  tossBtnText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "800",
  },
  teamColumn: {
    flex: 1,
    backgroundColor: "#0d1322",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1e293b",
    padding: 10,
    alignItems: "center",
    justifyContent: "space-between",
  },
  teamHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  teamDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  teamName: {
    fontSize: 13,
    fontWeight: "800",
    color: "#f8fafc",
    maxWidth: 110,
  },
  servingBadge: {
    backgroundColor: "rgba(129, 140, 248, 0.2)",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  servingText: {
    fontSize: 8,
    fontWeight: "900",
    color: "#818cf8",
  },
  servingBadgeAway: {
    backgroundColor: "rgba(78, 222, 163, 0.2)",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  servingTextAway: {
    fontSize: 8,
    fontWeight: "900",
    color: "#4edea3",
  },
  statsBadgesRow: {
    flexDirection: "row",
    gap: 6,
    marginVertical: 2,
  },
  badgePill: {
    backgroundColor: "#151e33",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  badgeText: {
    fontSize: 9,
    color: "#94a3b8",
    fontWeight: "700",
  },
  digitalBadgeNum: {
    fontFamily: "Digital7",
    fontSize: 12,
    color: "#f8fafc",
  },
  scoreDigital: {
    fontFamily: "Digital7",
    fontSize: 52,
    lineHeight: 56,
  },
  controlsBlock: {
    width: "100%",
    gap: 5,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 5,
    width: "100%",
  },
  btn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPoint: {
    flex: 2,
    flexDirection: "row",
    backgroundColor: "#4f46e5",
    gap: 4,
  },
  btnPointAway: {
    backgroundColor: "#059669",
  },
  btnPointText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "900",
  },
  btnUndo: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
    gap: 2,
  },
  btnUndoText: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: "800",
  },
  btnSubAction: {
    backgroundColor: "#161f36",
    borderWidth: 1,
    borderColor: "#222f50",
    paddingVertical: 5,
  },
  btnSubText: {
    color: "#cbd5e1",
    fontSize: 9,
    fontWeight: "700",
  },
  centerColumn: {
    width: 140,
    backgroundColor: "#0b101c",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1e293b",
    padding: 8,
    alignItems: "center",
    justifyContent: "space-between",
  },
  periodPill: {
    backgroundColor: "rgba(251, 191, 36, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.3)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  periodPillText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#fbbf24",
  },
  targetBox: {
    alignItems: "center",
    backgroundColor: "#141c2e",
    borderWidth: 1,
    borderColor: "#222f50",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  targetLabel: {
    fontSize: 8,
    color: "#94a3b8",
    fontWeight: "700",
  },
  targetDigital: {
    fontFamily: "Digital7",
    fontSize: 22,
    color: "#ffffff",
  },
  alertPillDeuce: {
    backgroundColor: "rgba(251, 191, 36, 0.2)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  alertTextDeuce: {
    fontSize: 9,
    fontWeight: "900",
    color: "#fbbf24",
  },
  alertPillSwitch: {
    backgroundColor: "rgba(96, 165, 250, 0.2)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  alertTextSwitch: {
    fontSize: 9,
    fontWeight: "900",
    color: "#60a5fa",
  },
  serverToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#141c2e",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  serverToggleText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#94a3b8",
  },
  endMatchBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(244, 63, 94, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(244, 63, 94, 0.25)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  endMatchText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#f87171",
  },
});
