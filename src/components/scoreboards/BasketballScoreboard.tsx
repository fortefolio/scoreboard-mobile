import React, { useState, useEffect, useRef } from "react";
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

interface BasketballScoreboardProps {
  matchData: any;
  rules?: any;
  canEdit: boolean;
}

export function BasketballScoreboard({ matchData, rules, canEdit }: BasketballScoreboardProps) {
  const defaultQuarterMinutes = rules?.quarter_minutes || 10;
  const defaultShotClock = rules?.shot_clock_seconds || 24;

  const [scores, setScores] = useState({
    home: matchData.scores?.basketball?.total_points?.[0] ?? matchData.scores?.current?.home ?? 0,
    away: matchData.scores?.basketball?.total_points?.[1] ?? matchData.scores?.current?.away ?? 0,
  });
  const [currentPeriod, setCurrentPeriod] = useState(
    matchData.scores?.basketball?.period || "Q1"
  );
  const [quarterSeconds, setQuarterSeconds] = useState(
    matchData.scores?.basketball?.quarter_seconds ?? defaultQuarterMinutes * 60
  );
  const [isClockRunning, setIsClockRunning] = useState(
    matchData.scores?.basketball?.is_clock_running || false
  );
  const [shotClock, setShotClock] = useState(defaultShotClock);
  const [teamFouls, setTeamFouls] = useState({
    home: matchData.scores?.basketball?.fouls?.home || 0,
    away: matchData.scores?.basketball?.fouls?.away || 0,
  });

  const clockTimerRef = useRef<any>(null);

  useEffect(() => {
    if (matchData.scores) {
      setScores({
        home: matchData.scores.basketball?.total_points?.[0] ?? matchData.scores.current?.home ?? 0,
        away: matchData.scores.basketball?.total_points?.[1] ?? matchData.scores.current?.away ?? 0,
      });
      const bb = matchData.scores.basketball || {};
      if (bb.period) setCurrentPeriod(bb.period);
      if (typeof bb.quarter_seconds === "number") setQuarterSeconds(bb.quarter_seconds);
      if (typeof bb.is_clock_running === "boolean") setIsClockRunning(bb.is_clock_running);
      if (bb.fouls) setTeamFouls(bb.fouls);
    }
  }, [matchData.scores]);

  // Local Clock Logic
  useEffect(() => {
    if (isClockRunning) {
      clockTimerRef.current = setInterval(() => {
        setQuarterSeconds((prev: number) => {
          if (prev <= 1) {
            setIsClockRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (clockTimerRef.current) clearInterval(clockTimerRef.current);
    }
    return () => {
      if (clockTimerRef.current) clearInterval(clockTimerRef.current);
    };
  }, [isClockRunning]);

  const teamA = matchData.participants?.[0]?.name || "Equipa A";
  const teamB = matchData.participants?.[1]?.name || "Equipa B";

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleScore = async (side: "home" | "away", pointsToAdd: 1 | 2 | 3) => {
    if (!canEdit) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Optimistic UI update
    setScores((prev) => ({ ...prev, [side]: prev[side] + pointsToAdd }));

    try {
      const { error } = await supabase.from("match_events").insert([
        {
          match_id: matchData.id,
          event_data: {
            type: "score",
            side,
            points: pointsToAdd,
            description: `+${pointsToAdd} PTS (${side === "home" ? teamA : teamB})`,
          },
        },
      ]);
      if (error) throw error;
    } catch (e: any) {
      Alert.alert("Erro", "Falha ao registar pontos: " + e.message);
    }
  };

  const toggleClock = async () => {
    if (!canEdit) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const nextRunning = !isClockRunning;
    setIsClockRunning(nextRunning);

    try {
      await supabase.from("match_events").insert([
        {
          match_id: matchData.id,
          event_data: {
            type: nextRunning ? "start_clock" : "pause_clock",
            quarter_seconds: quarterSeconds,
          },
        },
      ]);
    } catch (e: any) {
      console.warn("Clock error:", e);
    }
  };

  const handlePeriodChange = async (nextPeriod: string) => {
    if (!canEdit) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCurrentPeriod(nextPeriod);
    setQuarterSeconds(defaultQuarterMinutes * 60);
    setIsClockRunning(false);

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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Clock & Period Display */}
      <View style={styles.clockCard}>
        <View style={styles.clockHeader}>
          <Text style={styles.periodLabel}>{currentPeriod}</Text>
          <Text style={styles.digitalClock}>{formatTime(quarterSeconds)}</Text>
        </View>

        {canEdit && (
          <View style={styles.clockControlsRow}>
            <TouchableOpacity
              style={[styles.clockBtn, isClockRunning && styles.clockBtnPause]}
              onPress={toggleClock}
            >
              <Ionicons
                name={isClockRunning ? "pause" : "play"}
                size={18}
                color="#ffffff"
              />
              <Text style={styles.clockBtnText}>
                {isClockRunning ? "PARAR" : "ARRANCAR"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.periodCycleBtn}
              onPress={() => {
                const next =
                  currentPeriod === "Q1"
                    ? "Q2"
                    : currentPeriod === "Q2"
                    ? "Q3"
                    : currentPeriod === "Q3"
                    ? "Q4"
                    : "OT";
                handlePeriodChange(next);
              }}
            >
              <Text style={styles.periodCycleText}>Próximo Período</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Main Scoreboard Display */}
      <View style={styles.displayCard}>
        <View style={styles.scoreRow}>
          <View style={styles.teamCol}>
            <Text style={styles.teamName} numberOfLines={1}>
              {teamA}
            </Text>
            <Text style={styles.scoreDigital}>{scores.home}</Text>
          </View>

          <View style={styles.dividerCol}>
            <Text style={styles.colonDigital}>:</Text>
          </View>

          <View style={styles.teamCol}>
            <Text style={styles.teamName} numberOfLines={1}>
              {teamB}
            </Text>
            <Text style={styles.scoreDigital}>{scores.away}</Text>
          </View>
        </View>
      </View>

      {/* Action Buttons for Referee (+1, +2, +3 PTS) */}
      {canEdit && (
        <View style={styles.actionsSection}>
          {/* Team A Buttons */}
          <View style={styles.teamActionBlock}>
            <Text style={styles.teamActionTitle}>{teamA}</Text>
            <View style={styles.pointsButtonRow}>
              <TouchableOpacity
                style={[styles.pointBtn, styles.pointBtnFT]}
                onPress={() => handleScore("home", 1)}
              >
                <Text style={styles.pointBtnNum}>+1</Text>
                <Text style={styles.pointBtnType}>FT</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.pointBtn, styles.pointBtn2P]}
                onPress={() => handleScore("home", 2)}
              >
                <Text style={styles.pointBtnNum}>+2</Text>
                <Text style={styles.pointBtnType}>FG</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.pointBtn, styles.pointBtn3P]}
                onPress={() => handleScore("home", 3)}
              >
                <Text style={styles.pointBtnNum}>+3</Text>
                <Text style={styles.pointBtnType}>3PT</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Team B Buttons */}
          <View style={styles.teamActionBlock}>
            <Text style={styles.teamActionTitle}>{teamB}</Text>
            <View style={styles.pointsButtonRow}>
              <TouchableOpacity
                style={[styles.pointBtn, styles.pointBtnFT]}
                onPress={() => handleScore("away", 1)}
              >
                <Text style={styles.pointBtnNum}>+1</Text>
                <Text style={styles.pointBtnType}>FT</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.pointBtn, styles.pointBtn2P]}
                onPress={() => handleScore("away", 2)}
              >
                <Text style={styles.pointBtnNum}>+2</Text>
                <Text style={styles.pointBtnType}>FG</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.pointBtn, styles.pointBtn3P]}
                onPress={() => handleScore("away", 3)}
              >
                <Text style={styles.pointBtnNum}>+3</Text>
                <Text style={styles.pointBtnType}>3PT</Text>
              </TouchableOpacity>
            </View>
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
  clockCard: {
    backgroundColor: "#101626",
    borderWidth: 1,
    borderColor: "#232d4b",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  clockHeader: {
    alignItems: "center",
  },
  periodLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#fbbf24",
    letterSpacing: 2,
    marginBottom: 4,
  },
  digitalClock: {
    fontFamily: "Digital7",
    fontSize: 48,
    color: "#fbbf24",
    lineHeight: 52,
  },
  clockControlsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
    width: "100%",
  },
  clockBtn: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#10b981",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  clockBtnPause: {
    backgroundColor: "#ef4444",
  },
  clockBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800",
  },
  periodCycleBtn: {
    backgroundColor: "#1e293b",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  periodCycleText: {
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: "600",
  },
  displayCard: {
    backgroundColor: "#151b2d",
    borderWidth: 1,
    borderColor: "#232d4b",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  teamCol: {
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
  scoreDigital: {
    fontFamily: "Digital7",
    fontSize: 56,
    color: "#4edea3",
    lineHeight: 60,
  },
  dividerCol: {
    paddingHorizontal: 10,
  },
  colonDigital: {
    fontFamily: "Digital7",
    fontSize: 44,
    color: "#64748b",
  },
  actionsSection: {
    gap: 16,
  },
  teamActionBlock: {
    backgroundColor: "#101626",
    borderWidth: 1,
    borderColor: "#232d4b",
    borderRadius: 16,
    padding: 14,
  },
  teamActionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#94a3b8",
    marginBottom: 10,
    textAlign: "center",
  },
  pointsButtonRow: {
    flexDirection: "row",
    gap: 10,
  },
  pointBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  pointBtnFT: {
    backgroundColor: "#334155",
  },
  pointBtn2P: {
    backgroundColor: "#4f46e5",
  },
  pointBtn3P: {
    backgroundColor: "#0284c7",
  },
  pointBtnNum: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "900",
  },
  pointBtnType: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 10,
    fontWeight: "700",
    marginTop: 2,
  },
});
