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
import { useLanguage } from "@/lib/i18n";

interface BasketballScoreboardProps {
  matchData: any;
  rules?: any;
  canEdit: boolean;
}

export function BasketballScoreboard({ matchData, rules, canEdit }: BasketballScoreboardProps) {
  const { t } = useLanguage();
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
  const [possession, setPossession] = useState<"home" | "away" | null>(
    matchData.scores?.basketball?.possession ?? null
  );
  const [teamFouls, setTeamFouls] = useState({
    home: matchData.scores?.basketball?.fouls?.home || 0,
    away: matchData.scores?.basketball?.fouls?.away || 0,
  });
  const [timeouts, setTimeouts] = useState({
    home: matchData.scores?.basketball?.timeouts?.home || 3,
    away: matchData.scores?.basketball?.timeouts?.away || 3,
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
      if (bb.timeouts) setTimeouts(bb.timeouts);
      if (bb.possession) setPossession(bb.possession);
    }
  }, [matchData.scores]);

  // Local Clock Interval
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
        setShotClock((prev: number) => {
          if (prev <= 1) return 0;
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
    setShotClock(defaultShotClock);

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

  const handleCorrectScore = async (side: "home" | "away") => {
    if (!canEdit || scores[side] <= 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const updatedScore = Math.max(0, scores[side] - 1);
    setScores((prev) => ({ ...prev, [side]: updatedScore }));

    const currentScores = matchData?.scores || {};
    const updated = {
      ...currentScores,
      current: {
        ...(currentScores.current || {}),
        [side]: updatedScore,
      },
    };

    await supabase
      .from("matches")
      .update({ scores: updated, updated_at: new Date().toISOString() })
      .eq("id", matchData.id);
  };

  const handleFoul = async (side: "home" | "away") => {
    if (!canEdit) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    const nextFouls = { ...teamFouls, [side]: teamFouls[side] + 1 };
    setTeamFouls(nextFouls);

    const currentScores = matchData?.scores || {};
    const updated = {
      ...currentScores,
      basketball: {
        ...(currentScores.basketball || {}),
        fouls: nextFouls,
      },
    };

    await supabase
      .from("matches")
      .update({ scores: updated, updated_at: new Date().toISOString() })
      .eq("id", matchData.id);

    if (nextFouls[side] >= 5) {
      Alert.alert("BÓNUS DE FALTAS", `${side === "home" ? teamA : teamB} atingiu o limite de faltas (5).`);
    }
  };

  const handleTimeout = async (side: "home" | "away") => {
    if (!canEdit || timeouts[side] <= 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    setIsClockRunning(false);
    const nextTimeouts = { ...timeouts, [side]: timeouts[side] - 1 };
    setTimeouts(nextTimeouts);

    const currentScores = matchData?.scores || {};
    const updated = {
      ...currentScores,
      basketball: {
        ...(currentScores.basketball || {}),
        timeouts: nextTimeouts,
        is_clock_running: false,
      },
    };

    await supabase
      .from("matches")
      .update({ scores: updated, updated_at: new Date().toISOString() })
      .eq("id", matchData.id);
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

  const resetShotClock = (seconds: number) => {
    if (!canEdit) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShotClock(seconds);
  };

  const togglePossession = async () => {
    if (!canEdit) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = possession === "home" ? "away" : "home";
    setPossession(next);

    const currentScores = matchData?.scores || {};
    await supabase
      .from("matches")
      .update({
        scores: {
          ...currentScores,
          basketball: { ...(currentScores.basketball || {}), possession: next },
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", matchData.id);
  };

  const handlePeriodCycle = async () => {
    if (!canEdit) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const periods = ["Q1", "Q2", "Q3", "Q4", "OT"];
    const currentIdx = periods.indexOf(currentPeriod);
    const nextPeriod = periods[(currentIdx + 1) % periods.length];

    setCurrentPeriod(nextPeriod);
    setQuarterSeconds(defaultQuarterMinutes * 60);
    setShotClock(defaultShotClock);
    setIsClockRunning(false);
    setTeamFouls({ home: 0, away: 0 });

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
      t("scoreboard.endMatchTitle") || "Terminar Jogo",
      t("scoreboard.endMatchConfirm", { sport: "Basquetebol" }) || "Tens a certeza que queres terminar este jogo de Basquetebol?",
      [
        { text: t("common.cancel") || "Cancelar", style: "cancel" },
        {
          text: t("scoreboard.endMatch") || "Terminar",
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
          {possession === "home" && (
            <View style={styles.possessionBadge}>
              <Text style={styles.possessionText}>{t("scoreboard.basketball.possession") || "POSSE"}</Text>
            </View>
          )}
        </View>

        <View style={styles.statsBadgesRow}>
          <View style={[styles.badgePill, teamFouls.home >= 5 && styles.bonusPill]}>
            <Text style={[styles.badgeText, teamFouls.home >= 5 && styles.bonusText]}>
              {t("scoreboard.foulsShort") || "Faltas:"} <Text style={styles.digitalBadgeNum}>{teamFouls.home}</Text>
              {teamFouls.home >= 5 ? ` ${t("scoreboard.basketball.bonus") || "(BÓNUS)"}` : ""}
            </Text>
          </View>
          <View style={styles.badgePill}>
            <Text style={styles.badgeText}>
              {t("scoreboard.timeoutShort") || "Desc:"} <Text style={styles.digitalBadgeNum}>{timeouts.home}</Text>
            </Text>
          </View>
        </View>

        {/* Big Home Score */}
        <Text style={[styles.scoreDigital, { color: "#818cf8" }]}>{scores.home}</Text>

        {/* Home Controls */}
        {canEdit && (
          <View style={styles.controlsBlock}>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.btn, styles.btnPoint]}
                onPress={() => handleScore("home", 1)}
              >
                <Text style={styles.btnPointText}>+1</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnPoint, styles.btnPoint2]}
                onPress={() => handleScore("home", 2)}
              >
                <Text style={styles.btnPointText}>+2</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnPoint, styles.btnPoint3]}
                onPress={() => handleScore("home", 3)}
              >
                <Text style={styles.btnPointText}>+3</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnUndo]}
                onPress={() => handleCorrectScore("home")}
              >
                <Ionicons name="arrow-undo" size={14} color="#94a3b8" />
                <Text style={styles.btnUndoText}>{t("scoreboard.undo") || "-1"}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.btn, styles.btnSubAction]}
                onPress={() => handleFoul("home")}
              >
                <Text style={styles.btnSubText}>{t("scoreboard.basketball.plusFoul") || "+ Falta"}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnSubAction]}
                onPress={() => handleTimeout("home")}
                disabled={timeouts.home <= 0}
              >
                <Text style={styles.btnSubText}>{t("scoreboard.timeout") || "Desconto"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Column 2: Center Info, Clocks & Periods */}
      <View style={styles.centerColumn}>
        {/* Period cycle button */}
        <TouchableOpacity
          style={styles.periodPill}
          onPress={handlePeriodCycle}
          disabled={!canEdit}
        >
          <Text style={styles.periodPillText}>{currentPeriod}</Text>
          <Ionicons name="swap-vertical" size={12} color="#fbbf24" />
        </TouchableOpacity>

        {/* Game Clock */}
        <TouchableOpacity
          style={[styles.clockBox, isClockRunning && styles.clockBoxRunning]}
          onPress={toggleClock}
          disabled={!canEdit}
        >
          <Text style={[styles.clockDigital, isClockRunning && styles.clockDigitalRunning]}>
            {formatTime(quarterSeconds)}
          </Text>
        </TouchableOpacity>

        {/* Shot Clock & Possession Row */}
        <View style={styles.shotClockRow}>
          <TouchableOpacity
            style={styles.shotClockPill}
            onPress={() => resetShotClock(24)}
            disabled={!canEdit}
          >
            <Text style={styles.shotClockLabel}>24s</Text>
            <Text
              style={[
                styles.shotClockNum,
                shotClock <= 5 && styles.shotClockWarning,
              ]}
            >
              {shotClock}s
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shotClockMiniBtn}
            onPress={() => resetShotClock(14)}
            disabled={!canEdit}
          >
            <Text style={styles.shotClockMiniText}>14s</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.possessionToggleBtn}
            onPress={togglePossession}
            disabled={!canEdit}
          >
            <Ionicons name="swap-horizontal" size={14} color="#60a5fa" />
          </TouchableOpacity>
        </View>

        {/* Finalize Match */}
        {canEdit && (
          <TouchableOpacity
            style={styles.endMatchBtn}
            onPress={handleFinalizeMatch}
          >
            <Ionicons name="checkmark-circle-outline" size={13} color="#f87171" />
            <Text style={styles.endMatchText}>{t("scoreboard.endMatch") || "Terminar"}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Column 3: Team Away */}
      <View style={styles.teamColumn}>
        <View style={styles.teamHeaderRow}>
          {possession === "away" && (
            <View style={styles.possessionBadge}>
              <Text style={styles.possessionText}>{t("scoreboard.basketball.possession") || "POSSE"}</Text>
            </View>
          )}
          <Text style={styles.teamName} numberOfLines={1}>
            {teamB}
          </Text>
          <View style={[styles.teamDot, { backgroundColor: "#4edea3" }]} />
        </View>

        <View style={styles.statsBadgesRow}>
          <View style={styles.badgePill}>
            <Text style={styles.badgeText}>
              {t("scoreboard.timeoutShort") || "Desc:"} <Text style={styles.digitalBadgeNum}>{timeouts.away}</Text>
            </Text>
          </View>
          <View style={[styles.badgePill, teamFouls.away >= 5 && styles.bonusPill]}>
            <Text style={[styles.badgeText, teamFouls.away >= 5 && styles.bonusText]}>
              {t("scoreboard.foulsShort") || "Faltas:"} <Text style={styles.digitalBadgeNum}>{teamFouls.away}</Text>
              {teamFouls.away >= 5 ? ` ${t("scoreboard.basketball.bonus") || "(BÓNUS)"}` : ""}
            </Text>
          </View>
        </View>

        {/* Big Away Score */}
        <Text style={[styles.scoreDigital, { color: "#4edea3" }]}>{scores.away}</Text>

        {/* Away Controls */}
        {canEdit && (
          <View style={styles.controlsBlock}>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.btn, styles.btnUndo]}
                onPress={() => handleCorrectScore("away")}
              >
                <Ionicons name="arrow-undo" size={14} color="#94a3b8" />
                <Text style={styles.btnUndoText}>{t("scoreboard.undo") || "-1"}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnPoint]}
                onPress={() => handleScore("away", 1)}
              >
                <Text style={styles.btnPointText}>+1</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnPoint, styles.btnPoint2]}
                onPress={() => handleScore("away", 2)}
              >
                <Text style={styles.btnPointText}>+2</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnPoint, styles.btnPoint3]}
                onPress={() => handleScore("away", 3)}
              >
                <Text style={styles.btnPointText}>+3</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.btn, styles.btnSubAction]}
                onPress={() => handleTimeout("away")}
                disabled={timeouts.away <= 0}
              >
                <Text style={styles.btnSubText}>{t("scoreboard.timeout") || "Desconto"}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnSubAction]}
                onPress={() => handleFoul("away")}
              >
                <Text style={styles.btnSubText}>{t("scoreboard.basketball.plusFoul") || "+ Falta"}</Text>
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
  possessionBadge: {
    backgroundColor: "rgba(96, 165, 250, 0.2)",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  possessionText: {
    fontSize: 8,
    fontWeight: "900",
    color: "#60a5fa",
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
  bonusPill: {
    backgroundColor: "rgba(244, 63, 94, 0.15)",
    borderColor: "rgba(244, 63, 94, 0.3)",
  },
  badgeText: {
    fontSize: 9,
    color: "#94a3b8",
    fontWeight: "700",
  },
  bonusText: {
    color: "#f43f5e",
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
    backgroundColor: "#334155",
  },
  btnPoint2: {
    backgroundColor: "#4f46e5",
  },
  btnPoint3: {
    backgroundColor: "#0284c7",
  },
  btnPointText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "900",
  },
  btnUndo: {
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
    fontSize: 10,
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
  shotClockRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  shotClockPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#141c2e",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#222f50",
  },
  shotClockLabel: {
    fontSize: 8,
    color: "#94a3b8",
    fontWeight: "700",
  },
  shotClockNum: {
    fontFamily: "Digital7",
    fontSize: 16,
    color: "#fbbf24",
  },
  shotClockWarning: {
    color: "#f43f5e",
  },
  shotClockMiniBtn: {
    backgroundColor: "#1e293b",
    paddingHorizontal: 5,
    paddingVertical: 3,
    borderRadius: 5,
  },
  shotClockMiniText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#cbd5e1",
  },
  possessionToggleBtn: {
    backgroundColor: "#1e293b",
    padding: 4,
    borderRadius: 5,
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
