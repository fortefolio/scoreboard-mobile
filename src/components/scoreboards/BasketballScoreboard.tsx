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
import { useLanguage, getSportTranslation } from "@/lib/i18n";
import { recordMatchEventAtomic } from "@/lib/scoring/atomicScoring";
import { ScoreBoardTheme } from "@/constants/theme";
import {
  ScoreboardMainCard,
  ScoreboardTeamColumn,
  ScoreboardActionButton,
} from "@/components/scoreboards/ScoreboardLayout";

interface BasketballScoreboardProps {
  matchData: any;
  rules?: any;
  canEdit: boolean;
}

export function BasketballScoreboard({ matchData, rules, canEdit }: BasketballScoreboardProps) {
  const { t, locale } = useLanguage();
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
      const currentScores = matchData?.scores || {};
      const newScores = {
        ...currentScores,
        current: {
          ...(currentScores.current || {}),
          [side]: (currentScores.current?.[side] ?? scores[side]) + pointsToAdd,
        },
      };

      const { error } = await recordMatchEventAtomic(supabase, {
        matchId: matchData.id,
        newScores,
        eventData: {
          type: "score",
          side,
          points: pointsToAdd,
          description: `+${pointsToAdd} PTS (${side === "home" ? teamA : teamB})`,
        },
      });
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

    await recordMatchEventAtomic(supabase, {
      matchId: matchData.id,
      newScores: updated,
      eventData: {
        type: "correct_score",
        side,
        current: updatedScore,
      },
    });
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

    await recordMatchEventAtomic(supabase, {
      matchId: matchData.id,
      newScores: updated,
      eventData: {
        type: "foul",
        side,
        fouls: nextFouls,
      },
    });

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

    await recordMatchEventAtomic(supabase, {
      matchId: matchData.id,
      newScores: updated,
      eventData: {
        type: "timeout",
        side,
        timeouts: nextTimeouts,
      },
    });
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
    const updated = {
      ...currentScores,
      basketball: { ...(currentScores.basketball || {}), possession: next },
    };

    await recordMatchEventAtomic(supabase, {
      matchId: matchData.id,
      newScores: updated,
      eventData: {
        type: "possession_toggle",
        possession: next,
      },
    });
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
            await recordMatchEventAtomic(supabase, {
              matchId: matchData.id,
              newStatus: "completed",
              eventData: {
                type: "match_finished",
              },
            });
          },
        },
      ]
    );
  };

  const eventName =
    matchData.tournaments?.name ||
    t("match.singleMatch") ||
    "Single Match";

  const renderSideActions = (side: "home" | "away") =>
    canEdit ? (
      <>
        <ScoreboardActionButton
          testID={`btn-plus1-${side}`}
          variant="primary"
          label="+1"
          onPress={() => handleScore(side, 1)}
          style={styles.railBtnCompact}
        />
        <ScoreboardActionButton
          testID={`btn-plus2-${side}`}
          variant="primary"
          label="+2"
          onPress={() => handleScore(side, 2)}
          style={styles.railBtnCompact}
        />
        <ScoreboardActionButton
          testID={`btn-plus3-${side}`}
          variant="primary"
          label="+3"
          onPress={() => handleScore(side, 3)}
          style={styles.railBtnCompact}
        />
        <ScoreboardActionButton
          testID={`btn-undo-${side}`}
          variant="secondary"
          icon="arrow-undo"
          label={t("scoreboard.undo") || "-1"}
          onPress={() => handleCorrectScore(side)}
          style={styles.railBtnCompact}
        />
        <ScoreboardActionButton
          testID={`btn-foul-${side}`}
          variant="secondary"
          label={"+F"}
          onPress={() => handleFoul(side)}
          style={styles.railBtnCompact}
        />
        <ScoreboardActionButton
          testID={`btn-timeout-${side}`}
          variant="secondary"
          label={(locale === "pt" ? "Desc" : "TO")}
          onPress={() => handleTimeout(side)}
          disabled={timeouts[side] <= 0}
          style={[
            styles.railBtnCompact,
            timeouts[side] <= 0 ? styles.btnDisabled : undefined,
          ]}
        />
      </>
    ) : undefined;

  const renderPossessionSubLabel = (hasPossession: boolean) =>
    hasPossession ? (
      <View style={styles.possessionPill}>
        <View style={styles.possessionDot} />
        <Text style={styles.possessionPillText}>
          {t("scoreboard.basketball.possession") || "POSS"}
        </Text>
      </View>
    ) : null;

  const renderTeamPills = (side: "home" | "away") => (
    <>
      <View
        style={[
          styles.badgePill,
          teamFouls[side] >= 5 && styles.bonusPill,
        ]}
      >
        <Text
          style={[
            styles.badgeText,
            teamFouls[side] >= 5 && styles.bonusText,
          ]}
        >
          {t("scoreboard.foulsShort") || "Fouls:"}{" "}
          <Text style={styles.digitalBadgeNum}>{teamFouls[side]}</Text>
          {teamFouls[side] >= 5
            ? ` ${t("scoreboard.basketball.bonus") || "(BÓNUS)"}`
            : ""}
        </Text>
      </View>
      <View style={styles.badgePill}>
        <Text style={styles.badgeText}>
          {(locale === "pt" ? "Desc" : "TO")}:{" "}
          <Text style={styles.digitalBadgeNum}>{timeouts[side]}</Text>
        </Text>
      </View>
    </>
  );

  return (
    <ScoreboardMainCard
      compactHeader={{
        sportType: matchData.sport_type,
        sportLabel: getSportTranslation(matchData.sport_type, t),
        eventName,
        statusBadge: currentPeriod,
        onFinish: canEdit ? handleFinalizeMatch : undefined,
        finishLabel: t("scoreboard.endMatch") || "Terminar",
      }}
      leftActions={renderSideActions("home")}
      left={
        <ScoreboardTeamColumn
          teamName={teamA}
          subLabel={renderPossessionSubLabel(possession === "home")}
          score={scores.home}
          pills={renderTeamPills("home")}
        />
      }
      center={
        <View style={styles.centerColumn}>
          <TouchableOpacity
            testID="period-cycle-btn"
            style={styles.periodPill}
            onPress={handlePeriodCycle}
            disabled={!canEdit}
            activeOpacity={0.75}
          >
            <Text style={styles.periodPillText}>{currentPeriod}</Text>
            <Ionicons
              name="swap-vertical"
              size={12}
              color={ScoreBoardTheme.onSurfaceVariant}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.clockBox, isClockRunning && styles.clockBoxRunning]}
            onPress={toggleClock}
            disabled={!canEdit}
            activeOpacity={0.75}
          >
            <Text
              style={[
                styles.clockDigital,
                isClockRunning && styles.clockDigitalRunning,
              ]}
            >
              {formatTime(quarterSeconds)}
            </Text>
          </TouchableOpacity>

          <View style={styles.shotClockRow}>
            <TouchableOpacity
              style={styles.shotClockPill}
              onPress={togglePossession}
              disabled={!canEdit}
              activeOpacity={0.75}
            >
              <Text style={styles.shotClockLabel}>POSS:</Text>
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
              onPress={() => resetShotClock(24)}
              disabled={!canEdit}
              activeOpacity={0.75}
            >
              <Text style={styles.shotClockMiniText}>24s</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.shotClockMiniBtn}
              onPress={() => resetShotClock(14)}
              disabled={!canEdit}
              activeOpacity={0.75}
            >
              <Text style={styles.shotClockMiniText}>14s</Text>
            </TouchableOpacity>
          </View>

          {canEdit && (
            <TouchableOpacity
              style={styles.clockToggleBtn}
              onPress={toggleClock}
              activeOpacity={0.75}
            >
              <Ionicons
                name={isClockRunning ? "pause" : "play"}
                size={12}
                color={ScoreBoardTheme.onSurface}
              />
              <Text style={styles.clockToggleText}>
                {isClockRunning
                  ? (locale === "pt" ? "Pausa" : "Pause")
                  : (locale === "pt" ? "Iniciar" : "Start")}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      }
      right={
        <ScoreboardTeamColumn
          teamName={teamB}
          subLabel={renderPossessionSubLabel(possession === "away")}
          score={scores.away}
          pills={renderTeamPills("away")}
        />
      }
      rightActions={renderSideActions("away")}
    />
  );
}

const styles = StyleSheet.create({
  railBtnCompact: {
    width: 40,
    height: 36,
  },
  btnDisabled: {
    opacity: 0.35,
  },
  possessionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: ScoreBoardTheme.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
  },
  possessionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: ScoreBoardTheme.onSurface,
  },
  possessionPillText: {
    fontSize: 10,
    fontWeight: "700",
    color: ScoreBoardTheme.onSurface,
    letterSpacing: 0.5,
  },
  badgePill: {
    backgroundColor: ScoreBoardTheme.surfaceContainerHigh,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
  },
  badgeText: {
    fontSize: 10,
    color: ScoreBoardTheme.textMuted,
    fontWeight: "600",
  },
  digitalBadgeNum: {
    fontFamily: "Digital7Mono",
    fontSize: 12,
    color: ScoreBoardTheme.onSurface,
    fontVariant: ["tabular-nums"],
  },
  bonusPill: {
    borderColor: "rgba(244, 63, 94, 0.35)",
  },
  bonusText: {
    color: "#fda4af",
  },
  centerColumn: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 4,
  },
  periodPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: ScoreBoardTheme.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  periodPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: ScoreBoardTheme.onSurface,
  },
  clockBox: {
    backgroundColor: ScoreBoardTheme.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  clockBoxRunning: {
    borderColor: ScoreBoardTheme.onSurfaceVariant,
  },
  clockDigital: {
    fontFamily: "Digital7Mono",
    fontSize: 30,
    lineHeight: 34,
    color: ScoreBoardTheme.onSurface,
    fontVariant: ["tabular-nums"],
  },
  clockDigitalRunning: {
    color: ScoreBoardTheme.onSurface,
  },
  shotClockRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  shotClockPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: ScoreBoardTheme.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  shotClockLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: ScoreBoardTheme.textMuted,
  },
  shotClockNum: {
    fontFamily: "Digital7Mono",
    fontSize: 13,
    color: ScoreBoardTheme.onSurface,
    fontVariant: ["tabular-nums"],
  },
  shotClockWarning: {
    color: "#f43f5e",
  },
  shotClockMiniBtn: {
    backgroundColor: ScoreBoardTheme.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 8,
  },
  shotClockMiniText: {
    fontSize: 10,
    fontWeight: "700",
    color: ScoreBoardTheme.onSurfaceVariant,
  },
  clockToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: ScoreBoardTheme.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  clockToggleText: {
    fontSize: 11,
    fontWeight: "600",
    color: ScoreBoardTheme.onSurface,
  },
});
