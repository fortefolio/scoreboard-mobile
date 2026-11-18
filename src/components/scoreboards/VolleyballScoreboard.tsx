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
import { useLanguage } from "@/lib/i18n";
import { recordMatchEventAtomic } from "@/lib/scoring/atomicScoring";
import { ScoreBoardTheme } from "@/constants/theme";
import {
  ScoreboardMainCard,
  ScoreboardTeamColumn,
  ScoreboardActionButton,
} from "@/components/scoreboards/ScoreboardLayout";

interface VolleyballScoreboardProps {
  matchData: any;
  rules?: any;
  canEdit: boolean;
}

export function VolleyballScoreboard({ matchData, rules, canEdit }: VolleyballScoreboardProps) {
  const { t, locale } = useLanguage();
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
      await recordMatchEventAtomic(supabase, {
        matchId: matchData.id,
        eventData: {
          type: "point_won",
          side: teamIdx === 0 ? "home" : "away",
          scoring_side: teamIdx,
          description: `Ponto ganho por ${teamIdx === 0 ? teamA : teamB}`,
        },
      });
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

    await recordMatchEventAtomic(supabase, {
      matchId: matchData.id,
      newScores: updated,
      eventData: {
        type: "correct_point",
        side: teamIdx === 0 ? "home" : "away",
        points: newPoints,
      },
    });
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

  const toggleServer = async () => {
    if (!canEdit) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const nextIdx = serverIdx === 0 ? 1 : 0;
    setServerIdx(nextIdx);

    const currentScores = matchData?.scores || {};
    const updated = { ...currentScores, serving_index: nextIdx };

    await recordMatchEventAtomic(supabase, {
      matchId: matchData.id,
      newScores: updated,
      eventData: {
        type: "server_changed",
        serving_index: nextIdx,
      },
    });
  };

  const handleFinalizeMatch = () => {
    if (!canEdit) return;
    Alert.alert(
      t("scoreboard.endMatchTitle") || "Terminar Jogo",
      t("scoreboard.endMatchConfirm", { sport: isBeachVolleyball ? "Vólei de Praia" : "Voleibol" }) ||
        `Tens a certeza que queres terminar este jogo de ${isBeachVolleyball ? "Vólei de Praia" : "Voleibol"}?`,
      [
        { text: t("common.cancel") || "Cancelar", style: "cancel" },
        {
          text: t("scoreboard.endMatch") || "Terminar",
          style: "destructive",
          onPress: async () => {
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

  const renderServerSubLabel = (isServing: boolean) =>
    isServing ? (
      <View style={styles.servingPill}>
        <View style={styles.servingDot} />
        <Text style={styles.servingPillText}>
          {t("scoreboard.serving") || "SERVING"}
        </Text>
      </View>
    ) : (
      <Text style={styles.receiverText}>
        {(locale === "pt" ? "A Receber" : "Receiving")}
      </Text>
    );

  return (
    <View style={styles.shell}>
      {/* Toss Server Modal */}
      {serverIdx === null && (
        <View style={styles.tossBackdrop}>
          <View style={styles.tossCard}>
            <View style={styles.tossIconBox}>
              <Ionicons
                name="logo-usd"
                size={18}
                color={ScoreBoardTheme.onSurface}
              />
            </View>
            <Text style={styles.tossTitle}>
              {t("scoreboard.volleyball.firstServePrompt") ||
                "QUEM EFETUA O PRIMEIRO SERVIÇO?"}
            </Text>
            <Text style={styles.tossSubtitle}>
              {(locale === "pt" ? "Escolhe quem serve primeiro para iniciar o jogo" : "Choose who serves first to start the match")}
            </Text>
            <View style={styles.tossButtonsRow}>
              <TouchableOpacity
                testID="toss-home-btn"
                style={styles.tossBtn}
                onPress={() => handleToss(0)}
                disabled={tossing}
                activeOpacity={0.8}
              >
                <Text style={styles.tossBtnText} numberOfLines={1}>
                  {teamA}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="toss-away-btn"
                style={styles.tossBtn}
                onPress={() => handleToss(1)}
                disabled={tossing}
                activeOpacity={0.8}
              >
                <Text style={styles.tossBtnText} numberOfLines={1}>
                  {teamB}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <ScoreboardMainCard
        compactHeader={{
          sportType: matchData.sport_type,
          sportLabel: matchData.sport_type,
          eventName,
          statusBadge: isDecidingSet
            ? t("scoreboard.volleyball.setDecider", { set: currentSetNum }) ||
              `Set ${currentSetNum}`
            : `${"Set"} ${currentSetNum}`,
          onFinish: canEdit ? handleFinalizeMatch : undefined,
          finishLabel: t("scoreboard.endMatch") || "Terminar",
        }}
        leftActions={
          canEdit ? (
            <>
              <ScoreboardActionButton
                testID="btn-point-home"
                variant="primary"
                icon="add"
                label={"Pt"}
                onPress={() => handlePoint(0)}
              />
              <ScoreboardActionButton
                testID="btn-undo-home"
                variant="secondary"
                icon="arrow-undo"
                label={t("scoreboard.undo") || "-1"}
                onPress={() => handleCorrectPoint(0)}
              />
              <ScoreboardActionButton
                testID="btn-timeout-home"
                variant="secondary"
                label={(locale === "pt" ? "Desc" : "TO")}
                onPress={() => handleTimeout("home")}
                disabled={timeouts.home <= 0}
                style={timeouts.home <= 0 ? styles.btnDisabled : undefined}
              />
              <ScoreboardActionButton
                testID="btn-srv-home"
                variant="secondary"
                label={(locale === "pt" ? "Serv" : "Srv")}
                onPress={toggleServer}
              />
            </>
          ) : undefined
        }
        left={
          <ScoreboardTeamColumn
            teamName={teamA}
            subLabel={renderServerSubLabel(serverIdx === 0)}
            score={currentPoints[0]}
            pills={
              <>
                <View style={styles.badgePill}>
                  <Text style={styles.badgeText}>
                    {t("scoreboard.setsShort") || "Sets:"}{" "}
                    <Text style={styles.digitalBadgeNum}>{setsWonA}</Text>
                  </Text>
                </View>
                <View style={styles.badgePill}>
                  <Text style={styles.badgeText}>
                    {(locale === "pt" ? "Desc" : "TO")}:{" "}
                    <Text style={styles.digitalBadgeNum}>{timeouts.home}/2</Text>
                  </Text>
                </View>
              </>
            }
          />
        }
        center={
          <View style={styles.centerColumn}>
            <Text style={styles.centerSetText}>
              {isDecidingSet
                ? t("scoreboard.volleyball.setDecider", {
                    set: currentSetNum,
                  }) || `Set ${currentSetNum}`
                : `${"Set"} ${currentSetNum}`}
            </Text>

            <View style={styles.targetBox}>
              <Text style={styles.targetDigital}>{activeLimit}</Text>
            </View>
            <Text style={styles.targetLabel}>
              {t("scoreboard.volleyball.setLimit") || "SET LIMIT"}
            </Text>

            <Text style={styles.rulesMetaText}>
              {(locale === "pt" ? `À melhor de ${defaultMaxSets} Sets` : `Best of ${defaultMaxSets} Sets`)}{" "}
              • {t("scoreboard.volleyball.deuceAdv2") || "DEUCE (+2 Adv)"}
            </Text>

            {isDeuce && (
              <View style={styles.alertPill}>
                <Text style={styles.alertText}>
                  {t("scoreboard.volleyball.deuceAdv2") || "DEUCE (+2 Adv)"}
                </Text>
              </View>
            )}
            {isCourtSwitch && (
              <View style={styles.alertPill}>
                <Text style={styles.alertText}>
                  {t("scoreboard.courtSwitch") || "COURT SWITCH"}
                </Text>
              </View>
            )}
          </View>
        }
        right={
          <ScoreboardTeamColumn
            teamName={teamB}
            subLabel={renderServerSubLabel(serverIdx === 1)}
            score={currentPoints[1]}
            pills={
              <>
                <View style={styles.badgePill}>
                  <Text style={styles.badgeText}>
                    {t("scoreboard.setsShort") || "Sets:"}{" "}
                    <Text style={styles.digitalBadgeNum}>{setsWonB}</Text>
                  </Text>
                </View>
                <View style={styles.badgePill}>
                  <Text style={styles.badgeText}>
                    {(locale === "pt" ? "Desc" : "TO")}:{" "}
                    <Text style={styles.digitalBadgeNum}>{timeouts.away}/2</Text>
                  </Text>
                </View>
              </>
            }
          />
        }
        rightActions={
          canEdit ? (
            <>
              <ScoreboardActionButton
                testID="btn-point-away"
                variant="primary"
                icon="add"
                label={"Pt"}
                onPress={() => handlePoint(1)}
              />
              <ScoreboardActionButton
                testID="btn-undo-away"
                variant="secondary"
                icon="arrow-undo"
                label={t("scoreboard.undo") || "-1"}
                onPress={() => handleCorrectPoint(1)}
              />
              <ScoreboardActionButton
                testID="btn-timeout-away"
                variant="secondary"
                label={(locale === "pt" ? "Desc" : "TO")}
                onPress={() => handleTimeout("away")}
                disabled={timeouts.away <= 0}
                style={timeouts.away <= 0 ? styles.btnDisabled : undefined}
              />
              <ScoreboardActionButton
                testID="btn-srv-away"
                variant="secondary"
                label={(locale === "pt" ? "Serv" : "Srv")}
                onPress={toggleServer}
              />
            </>
          ) : undefined
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    position: "relative",
  },
  tossBackdrop: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 30,
    backgroundColor: "rgba(7, 8, 13, 0.86)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  tossCard: {
    width: "90%",
    maxWidth: 400,
    backgroundColor: ScoreBoardTheme.surfaceContainer,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    padding: 20,
    alignItems: "center",
  },
  tossIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: ScoreBoardTheme.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  tossTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: ScoreBoardTheme.onSurface,
    textAlign: "center",
    marginBottom: 4,
  },
  tossSubtitle: {
    fontSize: 12,
    color: ScoreBoardTheme.textMuted,
    textAlign: "center",
    marginBottom: 16,
  },
  tossButtonsRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  tossBtn: {
    flex: 1,
    backgroundColor: ScoreBoardTheme.onSurface,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  tossBtnText: {
    color: ScoreBoardTheme.surfaceContainerLowest,
    fontSize: 13,
    fontWeight: "700",
  },
  servingPill: {
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
  servingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: ScoreBoardTheme.onSurface,
  },
  servingPillText: {
    fontSize: 10,
    fontWeight: "700",
    color: ScoreBoardTheme.onSurface,
    letterSpacing: 0.5,
  },
  receiverText: {
    fontSize: 11,
    color: ScoreBoardTheme.textMuted,
    fontWeight: "500",
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
  btnDisabled: {
    opacity: 0.35,
  },
  centerColumn: {
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 4,
  },
  centerSetText: {
    fontSize: 11,
    fontWeight: "600",
    color: ScoreBoardTheme.textMuted,
    textAlign: "center",
  },
  targetBox: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ScoreBoardTheme.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
  },
  targetDigital: {
    fontFamily: "Digital7Mono",
    fontSize: 24,
    lineHeight: 28,
    color: ScoreBoardTheme.onSurface,
    fontVariant: ["tabular-nums"],
  },
  targetLabel: {
    fontSize: 9,
    color: ScoreBoardTheme.textMuted,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  rulesMetaText: {
    fontSize: 10,
    color: ScoreBoardTheme.textMuted,
    textAlign: "center",
  },
  alertPill: {
    backgroundColor: ScoreBoardTheme.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  alertText: {
    fontSize: 9,
    fontWeight: "700",
    color: ScoreBoardTheme.onSurface,
    letterSpacing: 0.5,
  },
});
