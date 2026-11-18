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
import { recordMatchEventAtomic } from "@/lib/scoring/atomicScoring";
import { ScoreBoardTheme } from "@/constants/theme";
import {
  ScoreboardMainCard,
  ScoreboardTeamColumn,
  ScoreboardActionButton,
} from "@/components/scoreboards/ScoreboardLayout";

interface FootballScoreboardProps {
  matchData: any;
  rules?: any;
  canEdit: boolean;
}

export function FootballScoreboard({ matchData, rules, canEdit }: FootballScoreboardProps) {
  const { t, locale } = useLanguage();
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

  const persistFootballState = async (updates: any, eventData?: Record<string, any>) => {
    const currentScores = matchData?.scores || {};
    const fb = currentScores.football || {};
    const updated = {
      ...currentScores,
      football: {
        ...fb,
        ...updates,
      },
    };
    if (eventData) {
      await recordMatchEventAtomic(supabase, {
        matchId: matchData.id,
        newScores: updated,
        eventData,
      });
    } else {
      await supabase
        .from("matches")
        .update({ scores: updated, updated_at: new Date().toISOString() })
        .eq("id", matchData.id);
    }
  };

  const handleGoal = async (side: "home" | "away") => {
    if (!canEdit) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const updatedGoals = { ...goals, [side]: goals[side] + 1 };
    setGoals(updatedGoals);

    try {
      await persistFootballState(
        { goals: [updatedGoals.home, updatedGoals.away] },
        {
          type: "goal",
          side,
          description: `Golo de ${side === "home" ? teamA : teamB}!`,
        }
      );
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
    await recordMatchEventAtomic(supabase, {
      matchId: matchData.id,
      newScores: updated,
      eventData: {
        type: "correct_goal",
        side,
        goals: [updatedGoals.home, updatedGoals.away],
      },
    });
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
      t("scoreboard.endMatchTitle") || "Terminar Jogo",
      t("scoreboard.endMatchConfirm", { sport: "Futebol" }) || "Tens a certeza que queres terminar este jogo de Futebol?",
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
          testID={`btn-goal-${side}`}
          variant="primary"
          icon="add"
          label={(locale === "pt" ? "Golo" : "Goal")}
          onPress={() => handleGoal(side)}
          style={styles.railBtnCompact}
        />
        <ScoreboardActionButton
          testID={`btn-undo-${side}`}
          variant="secondary"
          icon="arrow-undo"
          label={t("scoreboard.undo") || "-1"}
          onPress={() => handleCorrectGoal(side)}
          style={styles.railBtnCompact}
        />
        <ScoreboardActionButton
          testID={`btn-yc-${side}`}
          variant="warning"
          label={(locale === "pt" ? "CA" : "YC")}
          onPress={() => handleCard(side, "yellow")}
          style={styles.railBtnCompact}
        />
        <ScoreboardActionButton
          testID={`btn-rc-${side}`}
          variant="danger"
          label={(locale === "pt" ? "CV" : "RC")}
          onPress={() => handleCard(side, "red")}
          style={styles.railBtnCompact}
        />
        <ScoreboardActionButton
          testID={`btn-corner-${side}`}
          variant="secondary"
          label={"+C"}
          onPress={() => handleStat(side, "corner")}
          style={styles.railBtnCompact}
        />
        <ScoreboardActionButton
          testID={`btn-foul-${side}`}
          variant="secondary"
          label={"+F"}
          onPress={() => handleStat(side, "foul")}
          style={styles.railBtnCompact}
        />
      </>
    ) : undefined;

  const renderTeamPills = (side: "home" | "away") => (
    <>
      {yellowCards[side] > 0 && (
        <View style={[styles.badgePill, styles.yellowPill]}>
          <Text style={styles.yellowText}>
            YC: <Text style={styles.digitalBadgeNum}>{yellowCards[side]}</Text>
          </Text>
        </View>
      )}
      {redCards[side] > 0 && (
        <View style={[styles.badgePill, styles.redPill]}>
          <Text style={styles.redText}>
            RC: <Text style={styles.digitalBadgeNum}>{redCards[side]}</Text>
          </Text>
        </View>
      )}
      <View style={styles.badgePill}>
        <Text style={styles.badgeText}>
          {(locale === "pt" ? "Cantos" : "Corners")}:{" "}
          <Text style={styles.digitalBadgeNum}>{corners[side]}</Text>
        </Text>
      </View>
      <View style={styles.badgePill}>
        <Text style={styles.badgeText}>
          {(locale === "pt" ? "Faltas" : "Fouls")}:{" "}
          <Text style={styles.digitalBadgeNum}>{fouls[side]}</Text>
        </Text>
      </View>
    </>
  );

  return (
    <ScoreboardMainCard
      compactHeader={{
        sportType: matchData.sport_type,
        sportLabel: matchData.sport_type,
        eventName,
        statusBadge: period,
        onFinish: canEdit ? handleFinalizeMatch : undefined,
        finishLabel: t("scoreboard.endMatch") || "Terminar",
      }}
      leftActions={renderSideActions("home")}
      left={
        <ScoreboardTeamColumn
          teamName={teamA}
          subLabel={null}
          score={goals.home}
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
            <Text style={styles.periodPillText}>{period}</Text>
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
              {formatTime(elapsedSeconds)}
            </Text>
          </TouchableOpacity>

          <View style={styles.clockControlsRow}>
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

            <TouchableOpacity
              style={styles.stoppagePill}
              onPress={addStoppage}
              disabled={!canEdit}
              activeOpacity={0.75}
            >
              <Text style={styles.stoppageText}>
                {t("scoreboard.football.stoppageShort", {
                  min: stoppageMinutes,
                }) || `Comp: +${stoppageMinutes}m`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      }
      right={
        <ScoreboardTeamColumn
          teamName={teamB}
          subLabel={null}
          score={goals.away}
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
  yellowPill: {
    borderColor: "rgba(251, 191, 36, 0.3)",
  },
  yellowText: {
    fontSize: 10,
    color: "#fcd34d",
    fontWeight: "700",
  },
  redPill: {
    borderColor: "rgba(244, 63, 94, 0.3)",
  },
  redText: {
    fontSize: 10,
    color: "#fda4af",
    fontWeight: "700",
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
  clockControlsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
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
  stoppagePill: {
    backgroundColor: ScoreBoardTheme.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  stoppageText: {
    fontSize: 10,
    fontWeight: "600",
    color: ScoreBoardTheme.onSurfaceVariant,
  },
});
