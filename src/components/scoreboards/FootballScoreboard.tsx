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
  const [period, setPeriod] = useState(matchData.scores?.football?.period || "1st Half");
  const [elapsedSeconds, setElapsedSeconds] = useState(
    matchData.scores?.football?.elapsed_seconds || 0
  );
  const [isClockRunning, setIsClockRunning] = useState(
    matchData.scores?.football?.is_clock_running || false
  );

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

  const teamA = matchData.participants?.[0]?.name || "Equipa da Casa";
  const teamB = matchData.participants?.[1]?.name || "Equipa Visitante";

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleGoal = async (side: "home" | "away") => {
    if (!canEdit) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Optimistic UI update
    setGoals((prev) => ({ ...prev, [side]: prev[side] + 1 }));

    try {
      const { error } = await supabase.from("match_events").insert([
        {
          match_id: matchData.id,
          event_data: {
            type: "goal",
            side,
            description: `Golo de ${side === "home" ? teamA : teamB}!`,
          },
        },
      ]);
      if (error) throw error;
    } catch (e: any) {
      Alert.alert("Erro", "Falha ao registar golo: " + e.message);
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
            elapsed_seconds: elapsedSeconds,
          },
        },
      ]);
    } catch (e: any) {
      console.warn("Clock event error:", e);
    }
  };

  const handlePeriodChange = async (nextPeriod: string) => {
    if (!canEdit) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPeriod(nextPeriod);

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
        <Text style={styles.periodLabel}>{period.toUpperCase()}</Text>
        <Text style={styles.digitalClock}>{formatTime(elapsedSeconds)}</Text>

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
                {isClockRunning ? "PAUSAR TEMPO" : "INICIAR TEMPO"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.periodCycleBtn}
              onPress={() => {
                const next =
                  period === "1st Half" ? "2nd Half" : period === "2nd Half" ? "Overtime" : "1st Half";
                handlePeriodChange(next);
              }}
            >
              <Text style={styles.periodCycleText}>Mudar Parte</Text>
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
            <Text style={styles.goalDigital}>{goals.home}</Text>
          </View>

          <View style={styles.dividerCol}>
            <Text style={styles.colonDigital}>:</Text>
          </View>

          <View style={styles.teamCol}>
            <Text style={styles.teamName} numberOfLines={1}>
              {teamB}
            </Text>
            <Text style={styles.goalDigital}>{goals.away}</Text>
          </View>
        </View>
      </View>

      {/* Goal Action Buttons for Referee */}
      {canEdit && (
        <View style={styles.actionsSection}>
          <View style={styles.goalButtonsRow}>
            <TouchableOpacity
              style={[styles.goalBtn, styles.goalBtnHome]}
              onPress={() => handleGoal("home")}
              activeOpacity={0.8}
            >
              <Ionicons name="football" size={24} color="#ffffff" style={{ marginBottom: 4 }} />
              <Text style={styles.goalBtnLabel}>GOLO!</Text>
              <Text style={styles.goalBtnTeam} numberOfLines={1}>
                {teamA}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.goalBtn, styles.goalBtnAway]}
              onPress={() => handleGoal("away")}
              activeOpacity={0.8}
            >
              <Ionicons name="football" size={24} color="#ffffff" style={{ marginBottom: 4 }} />
              <Text style={styles.goalBtnLabel}>GOLO!</Text>
              <Text style={styles.goalBtnTeam} numberOfLines={1}>
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
  clockCard: {
    backgroundColor: "#101626",
    borderWidth: 1,
    borderColor: "#232d4b",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  periodLabel: {
    fontSize: 11,
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
    letterSpacing: 0.5,
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
    padding: 24,
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
    fontSize: 15,
    fontWeight: "700",
    color: "#f8fafc",
    marginBottom: 6,
    textAlign: "center",
  },
  goalDigital: {
    fontFamily: "Digital7",
    fontSize: 64,
    color: "#4edea3",
    lineHeight: 68,
  },
  dividerCol: {
    paddingHorizontal: 12,
  },
  colonDigital: {
    fontFamily: "Digital7",
    fontSize: 48,
    color: "#64748b",
  },
  actionsSection: {
    gap: 12,
  },
  goalButtonsRow: {
    flexDirection: "row",
    gap: 14,
  },
  goalBtn: {
    flex: 1,
    paddingVertical: 24,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  goalBtnHome: {
    backgroundColor: "#4f46e5",
  },
  goalBtnAway: {
    backgroundColor: "#0284c7",
  },
  goalBtnLabel: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 1,
  },
  goalBtnTeam: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
    paddingHorizontal: 8,
  },
});
