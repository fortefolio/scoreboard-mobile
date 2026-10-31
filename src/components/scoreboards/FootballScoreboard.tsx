import React, { useState, useEffect, useRef } from "react";
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

interface FootballScoreboardProps {
  matchData: any;
  rules?: any;
  canEdit: boolean;
}

export function FootballScoreboard({ matchData, rules, canEdit }: FootballScoreboardProps) {
  const [goals, setGoals] = useState({
    home: matchData.scores?.football?.goals?.[0] ?? matchData.scores?.current?.home ?? 0,
    away: matchData.scores?.football?.goals?.[1] ?? matchData.scores?.current?.away ?? 0,
  });
  const [period, setPeriod] = useState(matchData.scores?.football?.period || "1ª Parte");
  const [elapsedSeconds, setElapsedSeconds] = useState(
    matchData.scores?.football?.elapsed_seconds || 0
  );
  const [isClockRunning, setIsClockRunning] = useState(
    matchData.scores?.football?.is_clock_running || false
  );
  const [stoppageMinutes, setStoppageMinutes] = useState(
    matchData.scores?.football?.stoppage_minutes || 0
  );

  // Stats
  const [yellowCards, setYellowCards] = useState({
    home: matchData.scores?.football?.yellow_cards?.home || 0,
    away: matchData.scores?.football?.yellow_cards?.away || 0,
  });
  const [redCards, setRedCards] = useState({
    home: matchData.scores?.football?.red_cards?.home || 0,
    away: matchData.scores?.football?.red_cards?.away || 0,
  });
  const [corners, setCorners] = useState({
    home: matchData.scores?.football?.corners?.home || 0,
    away: matchData.scores?.football?.corners?.away || 0,
  });
  const [fouls, setFouls] = useState({
    home: matchData.scores?.football?.fouls?.home || 0,
    away: matchData.scores?.football?.fouls?.away || 0,
  });

  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (matchData.scores) {
      setGoals({
        home: matchData.scores.football?.goals?.[0] ?? matchData.scores.current?.home ?? 0,
        away: matchData.scores.football?.goals?.[1] ?? matchData.scores.current?.away ?? 0,
      });
      const fb = matchData.scores.football || {};
      if (fb.period) setPeriod(fb.period);
      if (typeof fb.elapsed_seconds === "number") setElapsedSeconds(fb.elapsed_seconds);
      if (typeof fb.is_clock_running === "boolean") setIsClockRunning(fb.is_clock_running);
      if (typeof fb.stoppage_minutes === "number") setStoppageMinutes(fb.stoppage_minutes);
      if (fb.yellow_cards) setYellowCards(fb.yellow_cards);
      if (fb.red_cards) setRedCards(fb.red_cards);
      if (fb.corners) setCorners(fb.corners);
      if (fb.fouls) setFouls(fb.fouls);
    }
  }, [matchData.scores]);

  // Local Clock Interval
  useEffect(() => {
    if (isClockRunning) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev: number) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isClockRunning]);

  const teamA = matchData.participants?.[0]?.name || "Equipa A";
  const teamB = matchData.participants?.[1]?.name || "Equipa B";

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const persistFootballState = async (updates: any) => {
    const currentScores = matchData?.scores || {};
    const fb = currentScores.football || {};
    const updated = {
      ...currentScores,
      football: {
        ...fb,
        ...updates,
      },
    };
    await supabase
      .from("matches")
      .update({ scores: updated, updated_at: new Date().toISOString() })
      .eq("id", matchData.id);
  };

  const handleGoal = async (side: "home" | "away") => {
    if (!canEdit) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const updatedGoals = { ...goals, [side]: goals[side] + 1 };
    setGoals(updatedGoals);

    try {
      await supabase.from("match_events").insert([
        {
          match_id: matchData.id,
          event_data: {
            type: "goal",
            side,
            description: `Golo de ${side === "home" ? teamA : teamB}!`,
          },
        },
      ]);
    } catch (e: any) {
      Alert.alert("Erro", "Falha ao registar golo: " + e.message);
    }
  };

  const handleCorrectGoal = async (side: "home" | "away") => {
    if (!canEdit || goals[side] <= 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const updatedGoal = Math.max(0, goals[side] - 1);
    const updatedGoals = { ...goals, [side]: updatedGoal };
    setGoals(updatedGoals);

    const currentScores = matchData?.scores || {};
    const updated = {
      ...currentScores,
      current: {
        ...(currentScores.current || {}),
        [side]: updatedGoal,
      },
      football: {
        ...(currentScores.football || {}),
        goals: [updatedGoals.home, updatedGoals.away],
      },
    };
    await supabase
      .from("matches")
      .update({ scores: updated, updated_at: new Date().toISOString() })
      .eq("id", matchData.id);
  };

  const handleCard = async (side: "home" | "away", cardType: "yellow" | "red") => {
    if (!canEdit) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    if (cardType === "yellow") {
      const updated = { ...yellowCards, [side]: yellowCards[side] + 1 };
      setYellowCards(updated);
      await persistFootballState({ yellow_cards: updated });
    } else {
      const updated = { ...redCards, [side]: redCards[side] + 1 };
      setRedCards(updated);
      await persistFootballState({ red_cards: updated });
    }
  };

  const handleStat = async (side: "home" | "away", statType: "corner" | "foul") => {
    if (!canEdit) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (statType === "corner") {
      const updated = { ...corners, [side]: corners[side] + 1 };
      setCorners(updated);
      await persistFootballState({ corners: updated });
    } else {
      const updated = { ...fouls, [side]: fouls[side] + 1 };
      setFouls(updated);
      await persistFootballState({ fouls: updated });
    }
  };

  const toggleClock = async () => {
    if (!canEdit) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const nextRunning = !isClockRunning;
    setIsClockRunning(nextRunning);
    await persistFootballState({ is_clock_running: nextRunning, elapsed_seconds: elapsedSeconds });

    try {
      await supabase.from("match_events").insert([
        {
          match_id: matchData.id,
          event_data: {
            type: nextRunning ? "start_clock" : "pause_clock",
            elapsed_seconds: elapsedSeconds,
          },
        },
      ]);
    } catch (e: any) {
      console.warn("Clock event error:", e);
    }
  };

  const addStoppage = async () => {
    if (!canEdit) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = stoppageMinutes + 1;
    setStoppageMinutes(next);
    await persistFootballState({ stoppage_minutes: next });
  };

  const handlePeriodCycle = async () => {
    if (!canEdit) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const periods = ["1ª Parte", "Intervalo", "2ª Parte", "Prolongamento", "Penáltis"];
    const currentIdx = periods.indexOf(period);
    const nextPeriod = periods[(currentIdx + 1) % periods.length];

    setPeriod(nextPeriod);
    if (nextPeriod === "Intervalo") {
      setIsClockRunning(false);
    } else if (nextPeriod === "2ª Parte") {
      setElapsedSeconds(45 * 60);
      setStoppageMinutes(0);
    }
    await persistFootballState({ period: nextPeriod });

    try {
      await supabase.from("match_events").insert([
        {
          match_id: matchData.id,
          event_data: {
            type: "period_change",
            period: nextPeriod,
          },
        },
      ]);
    } catch (e: any) {
      console.warn("Period change error:", e);
    }
  };

  const handleFinalizeMatch = () => {
    if (!canEdit) return;
    Alert.alert(
      "Terminar Jogo",
      "Tens a certeza que queres terminar este jogo de Futebol?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Terminar",
          style: "destructive",
          onPress: async () => {
            setIsClockRunning(false);
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
      {/* Column 1: Team Home */}
      <View style={styles.teamColumn}>
        <View style={styles.teamHeaderRow}>
          <View style={[styles.teamDot, { backgroundColor: "#818cf8" }]} />
          <Text style={styles.teamName} numberOfLines={1}>
            {teamA}
          </Text>
        </View>

        {/* Stats Badges */}
        <View style={styles.statsBadgesRow}>
          <View style={styles.badgePill}>
            <Text style={styles.badgeText}>
              C: <Text style={styles.digitalBadgeNum}>{corners.home}</Text>
            </Text>
          </View>
          <View style={styles.badgePill}>
            <Text style={styles.badgeText}>
              F: <Text style={styles.digitalBadgeNum}>{fouls.home}</Text>
            </Text>
          </View>
          {yellowCards.home > 0 && (
            <View style={[styles.badgePill, styles.yellowPill]}>
              <Text style={styles.yellowText}>🟨 {yellowCards.home}</Text>
            </View>
          )}
          {redCards.home > 0 && (
            <View style={[styles.badgePill, styles.redPill]}>
              <Text style={styles.redText}>🟥 {redCards.home}</Text>
            </View>
          )}
        </View>

        {/* Big Home Score in Digital Font */}
        <Text style={[styles.scoreDigital, { color: "#818cf8" }]}>{goals.home}</Text>

        {/* Home Controls */}
        {canEdit && (
          <View style={styles.controlsBlock}>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.btn, styles.btnGoal]}
                onPress={() => handleGoal("home")}
              >
                <Ionicons name="football" size={13} color="#ffffff" />
                <Text style={styles.btnGoalText}>+1 GOLO</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnUndo]}
                onPress={() => handleCorrectGoal("home")}
              >
                <Ionicons name="arrow-undo" size={13} color="#94a3b8" />
                <Text style={styles.btnUndoText}>-1</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.btn, styles.btnCardYellow]}
                onPress={() => handleCard("home", "yellow")}
              >
                <Text style={styles.btnCardText}>Amarelo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnCardRed]}
                onPress={() => handleCard("home", "red")}
              >
                <Text style={styles.btnCardText}>Vermelho</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnSubAction]}
                onPress={() => handleStat("home", "corner")}
              >
                <Text style={styles.btnSubText}>+Canto</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnSubAction]}
                onPress={() => handleStat("home", "foul")}
              >
                <Text style={styles.btnSubText}>+Falta</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Column 2: Center Clock & Period */}
      <View style={styles.centerColumn}>
        <TouchableOpacity
          style={styles.periodPill}
          onPress={handlePeriodCycle}
          disabled={!canEdit}
        >
          <Text style={styles.periodPillText}>{period}</Text>
          <Ionicons name="swap-vertical" size={12} color="#fbbf24" />
        </TouchableOpacity>

        {/* Digital Match Clock */}
        <TouchableOpacity
          style={[styles.clockBox, isClockRunning && styles.clockBoxRunning]}
          onPress={toggleClock}
          disabled={!canEdit}
        >
          <Text style={[styles.clockDigital, isClockRunning && styles.clockDigitalRunning]}>
            {formatTime(elapsedSeconds)}
          </Text>
        </TouchableOpacity>

        {/* Stoppage Time Pill */}
        <TouchableOpacity
          style={styles.stoppagePill}
          onPress={addStoppage}
          disabled={!canEdit}
        >
          <Ionicons name="add" size={11} color="#fbbf24" />
          <Text style={styles.stoppageText}>Comp: +{stoppageMinutes}m</Text>
        </TouchableOpacity>

        {/* Finalize Match */}
        {canEdit && (
          <TouchableOpacity
            style={styles.endMatchBtn}
            onPress={handleFinalizeMatch}
          >
            <Ionicons name="checkmark-circle-outline" size={13} color="#f87171" />
            <Text style={styles.endMatchText}>Terminar</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Column 3: Team Away */}
      <View style={styles.teamColumn}>
        <View style={styles.teamHeaderRow}>
          <Text style={styles.teamName} numberOfLines={1}>
            {teamB}
          </Text>
          <View style={[styles.teamDot, { backgroundColor: "#4edea3" }]} />
        </View>

        {/* Stats Badges */}
        <View style={styles.statsBadgesRow}>
          {redCards.away > 0 && (
            <View style={[styles.badgePill, styles.redPill]}>
              <Text style={styles.redText}>🟥 {redCards.away}</Text>
            </View>
          )}
          {yellowCards.away > 0 && (
            <View style={[styles.badgePill, styles.yellowPill]}>
              <Text style={styles.yellowText}>🟨 {yellowCards.away}</Text>
            </View>
          )}
          <View style={styles.badgePill}>
            <Text style={styles.badgeText}>
              F: <Text style={styles.digitalBadgeNum}>{fouls.away}</Text>
            </Text>
          </View>
          <View style={styles.badgePill}>
            <Text style={styles.badgeText}>
              C: <Text style={styles.digitalBadgeNum}>{corners.away}</Text>
            </Text>
          </View>
        </View>

        {/* Big Away Score in Digital Font */}
        <Text style={[styles.scoreDigital, { color: "#4edea3" }]}>{goals.away}</Text>

        {/* Away Controls */}
        {canEdit && (
          <View style={styles.controlsBlock}>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.btn, styles.btnUndo]}
                onPress={() => handleCorrectGoal("away")}
              >
                <Ionicons name="arrow-undo" size={13} color="#94a3b8" />
                <Text style={styles.btnUndoText}>-1</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnGoal, styles.btnGoalAway]}
                onPress={() => handleGoal("away")}
              >
                <Ionicons name="football" size={13} color="#ffffff" />
                <Text style={styles.btnGoalText}>+1 GOLO</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.btn, styles.btnSubAction]}
                onPress={() => handleStat("away", "foul")}
              >
                <Text style={styles.btnSubText}>+Falta</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnSubAction]}
                onPress={() => handleStat("away", "corner")}
              >
                <Text style={styles.btnSubText}>+Canto</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnCardYellow]}
                onPress={() => handleCard("away", "yellow")}
              >
                <Text style={styles.btnCardText}>Amarelo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnCardRed]}
                onPress={() => handleCard("away", "red")}
              >
                <Text style={styles.btnCardText}>Vermelho</Text>
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
    maxWidth: 120,
  },
  statsBadgesRow: {
    flexDirection: "row",
    gap: 5,
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
  yellowPill: {
    backgroundColor: "rgba(251, 191, 36, 0.2)",
    borderColor: "rgba(251, 191, 36, 0.4)",
  },
  yellowText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#fbbf24",
  },
  redPill: {
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    borderColor: "rgba(239, 68, 68, 0.4)",
  },
  redText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#ef4444",
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
  btnGoal: {
    flex: 2,
    flexDirection: "row",
    backgroundColor: "#4f46e5",
    gap: 4,
  },
  btnGoalAway: {
    backgroundColor: "#059669",
  },
  btnGoalText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.5,
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
  btnCardYellow: {
    backgroundColor: "rgba(251, 191, 36, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.3)",
    paddingVertical: 5,
  },
  btnCardRed: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    paddingVertical: 5,
  },
  btnCardText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#f8fafc",
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
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(251, 191, 36, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.3)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  periodPillText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#fbbf24",
  },
  clockBox: {
    backgroundColor: "#141c2e",
    borderWidth: 1,
    borderColor: "#222f50",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    alignItems: "center",
  },
  clockBoxRunning: {
    borderColor: "#4f46e5",
    backgroundColor: "rgba(79, 70, 229, 0.15)",
  },
  clockDigital: {
    fontFamily: "Digital7",
    fontSize: 32,
    color: "#ffffff",
  },
  clockDigitalRunning: {
    color: "#818cf8",
  },
  stoppagePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(251, 191, 36, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.2)",
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  stoppageText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#fbbf24",
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
