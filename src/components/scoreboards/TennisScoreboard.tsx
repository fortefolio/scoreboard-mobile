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
import {
  calculateTennisScore,
  createInitialTennisScores,
  TennisRules,
  TennisScoresState,
} from "@/lib/scoring/tennis-engine";
import { ScoreBoardTheme } from "@/constants/theme";
import {
  ScoreboardMainCard,
  ScoreboardTeamColumn,
  ScoreboardActionButton,
} from "@/components/scoreboards/ScoreboardLayout";

const TENNIS_PTS = ["0", "15", "30", "40"];

interface TennisScoreboardProps {
  matchData: any;
  rules?: any;
  canEdit: boolean;
}

export function TennisScoreboard({ matchData, rules, canEdit }: TennisScoreboardProps) {
  const { t, locale } = useLanguage();
  const isPadel = matchData.sport_type === "Padel";
  const defaultMaxSets = rules?.max_sets || 3;
  const noAd = rules?.no_ad ?? (isPadel ? true : false);
  const effectiveRules: TennisRules = { ...rules, no_ad: noAd };

  const normalizeScoresState = (raw: any): TennisScoresState => {
    const base = createInitialTennisScores((raw?.serving_index ?? 0) as 0 | 1);
    const tData = raw?.tennis || {};
    const g: [number, number] = tData.games || [0, 0];
    return {
      ...base,
      ...(raw || {}),
      serving_index: (raw?.serving_index ?? 0) as 0 | 1,
      match_won: Boolean(raw?.match_won),
      tennis: {
        ...base.tennis,
        ...tData,
        points: tData.points || [0, 0],
        games: g,
        sets: tData.sets || [],
        current_set: tData.current_set ?? (tData.sets?.length || 0) + 1,
        is_tiebreak: Boolean(tData.is_tiebreak ?? (g[0] === 6 && g[1] === 6 && rules?.set_type !== "advantage")),
      },
    };
  };

  const [points, setPoints] = useState<[number, number]>(
    matchData.scores?.tennis?.points || [0, 0]
  );
  const [games, setGames] = useState<[number, number]>(
    matchData.scores?.tennis?.games || [0, 0]
  );
  const [sets, setSets] = useState<any[]>(matchData.scores?.tennis?.sets || []);
  const [serverIdx, setServerIdx] = useState<number | null>(
    matchData.scores?.serving_index ?? null
  );
  const [isTiebreakState, setIsTiebreakState] = useState<boolean>(
    Boolean(
      matchData.scores?.tennis?.is_tiebreak ??
        ((matchData.scores?.tennis?.games?.[0] ?? 0) === 6 &&
          (matchData.scores?.tennis?.games?.[1] ?? 0) === 6 &&
          rules?.set_type !== "advantage")
    )
  );
  const [tossing, setTossing] = useState(false);
  const [aces, setAces] = useState({ home: 0, away: 0 });
  const [doubleFaults, setDoubleFaults] = useState({ home: 0, away: 0 });
  const scoresRef = useRef<TennisScoresState>(normalizeScoresState(matchData.scores));
  const serverIdxRef = useRef<number | null>(matchData.scores?.serving_index ?? null);

  useEffect(() => {
    if (matchData.scores?.tennis) {
      const normalized = normalizeScoresState(matchData.scores);
      scoresRef.current = normalized;
      serverIdxRef.current = matchData.scores.serving_index ?? null;
      setPoints(normalized.tennis.points);
      setGames(normalized.tennis.games);
      setSets(normalized.tennis.sets);
      setServerIdx(matchData.scores.serving_index ?? null);
      setIsTiebreakState(normalized.tennis.is_tiebreak);
      if (matchData.scores.tennis.stats) {
        setAces(matchData.scores.tennis.stats.aces || { home: 0, away: 0 });
        setDoubleFaults(matchData.scores.tennis.stats.double_faults || { home: 0, away: 0 });
      }
    }
  }, [matchData.scores]);

  const teamA = matchData.participants?.[0]?.name || "Jogador / Dupla A";
  const teamB = matchData.participants?.[1]?.name || "Jogador / Dupla B";

  const setsWonA = sets.filter((s: any) =>
    Array.isArray(s) ? s[0] > s[1] : (s.team1 ?? s.home ?? 0) > (s.team2 ?? s.away ?? 0)
  ).length;
  const setsWonB = sets.filter((s: any) =>
    Array.isArray(s) ? s[1] > s[0] : (s.team2 ?? s.away ?? 0) > (s.team1 ?? s.home ?? 0)
  ).length;

  const isTiebreak = isTiebreakState;

  const formatPoints = (pts: number, oppPts: number) => {
    if (isTiebreak) return String(pts);
    if (pts >= 3 && oppPts >= 3) {
      if (noAd) return "40";
      if (pts === oppPts) return "40";
      return pts > oppPts ? "AD" : "40";
    }
    return TENNIS_PTS[pts] || String(pts);
  };

  const totalPointsInGame = points[0] + points[1];
  const isDeuceCourt = totalPointsInGame % 2 === 0;

  // Alerts
  const isDeuceAlert = !isTiebreak && points[0] >= 3 && points[1] >= 3 && points[0] === points[1];
  const isAdvantageA = !isTiebreak && points[0] >= 3 && points[1] >= 3 && points[0] - points[1] === 1;
  const isAdvantageB = !isTiebreak && points[0] >= 3 && points[1] >= 3 && points[1] - points[0] === 1;
  const isBreakPoint =
    !isTiebreak &&
    ((serverIdx === 0 && (points[1] === 3 && points[0] < 3 || isAdvantageB)) ||
     (serverIdx === 1 && (points[0] === 3 && points[1] < 3 || isAdvantageA)));

  const totalGamesInSet = games[0] + games[1];
  const isChangeOfEnds =
    !isTiebreak
      ? totalGamesInSet > 0 && totalGamesInSet % 2 === 1 && points[0] === 0 && points[1] === 0
      : totalPointsInGame > 0 && totalPointsInGame % 6 === 0;

  const handleToss = async (selectedIdx: number) => {
    if (!canEdit) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    serverIdxRef.current = selectedIdx;
    scoresRef.current = {
      ...scoresRef.current,
      serving_index: selectedIdx as 0 | 1,
    };
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
    if (serverIdxRef.current === null && serverIdx === null) {
      Alert.alert("Serviço", "Selecione primeiro quem está a servir!");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    const prevState = scoresRef.current;
    const nextScores = calculateTennisScore(prevState, winnerIdx as 0 | 1, effectiveRules);
    const existingStats = (prevState.tennis as any)?.stats;
    if (existingStats) {
      (nextScores.tennis as any).stats = existingStats;
    }

    scoresRef.current = nextScores;
    serverIdxRef.current = nextScores.serving_index;
    setPoints(nextScores.tennis.points);
    setGames(nextScores.tennis.games);
    setSets(nextScores.tennis.sets);
    setServerIdx(nextScores.serving_index);
    setIsTiebreakState(nextScores.tennis.is_tiebreak);

    try {
      const { error } = await recordMatchEventAtomic(supabase, {
        matchId: matchData.id,
        newScores: nextScores,
        newStatus: nextScores.match_won ? "completed" : "ongoing",
        eventData: {
          type: "point_won",
          side: winnerIdx === 0 ? "home" : "away",
          winner_index: winnerIdx,
          scoring_side: winnerIdx,
          description: `Ponto ganho por ${winnerIdx === 0 ? teamA : teamB}`,
        },
      });
      if (error) throw error;
    } catch (e: any) {
      Alert.alert("Erro", "Falha ao registar ponto: " + e.message);
    }
  };

  const handleCorrectPoint = async (idx: number) => {
    const currentPoints = scoresRef.current.tennis.points;
    if (!canEdit || currentPoints[idx] <= 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const newPoints: [number, number] = [...currentPoints];
    newPoints[idx] = Math.max(0, newPoints[idx] - 1);
    const updated: TennisScoresState = {
      ...scoresRef.current,
      tennis: {
        ...scoresRef.current.tennis,
        points: newPoints,
      },
    };
    scoresRef.current = updated;
    setPoints(newPoints);

    await recordMatchEventAtomic(supabase, {
      matchId: matchData.id,
      newScores: updated,
      eventData: {
        type: "correct_point",
        side: idx === 0 ? "home" : "away",
        points: newPoints,
      },
    });
  };

  const handleAce = async (idx: number) => {
    if (!canEdit) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const side = idx === 0 ? "home" : "away";
    const updated = { ...aces, [side]: aces[side] + 1 };
    setAces(updated);

    await handlePoint(idx);

    await recordMatchEventAtomic(supabase, {
      matchId: matchData.id,
      eventData: { type: "tennis_stat", stat: "ace", side },
    });
  };

  const handleDoubleFault = async (serverPlayerIdx: number) => {
    if (!canEdit) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    const side = serverPlayerIdx === 0 ? "home" : "away";
    const oppIdx = serverPlayerIdx === 0 ? 1 : 0;
    const updated = { ...doubleFaults, [side]: doubleFaults[side] + 1 };
    setDoubleFaults(updated);

    await handlePoint(oppIdx);

    await recordMatchEventAtomic(supabase, {
      matchId: matchData.id,
      eventData: { type: "tennis_stat", stat: "double_fault", side },
    });
  };

  const toggleServer = async () => {
    if (!canEdit) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const nextIdx = (serverIdxRef.current ?? serverIdx) === 0 ? 1 : 0;
    serverIdxRef.current = nextIdx;
    const updated: TennisScoresState = {
      ...scoresRef.current,
      serving_index: nextIdx as 0 | 1,
    };
    scoresRef.current = updated;
    setServerIdx(nextIdx);

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
      t("scoreboard.endMatchConfirm", { sport: isPadel ? "Padel" : "Ténis" }) || `Tens a certeza que queres terminar este jogo de ${isPadel ? "Padel" : "Ténis"}?`,
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
        {(locale === "pt" ? "Recetor" : "Receiver")}
      </Text>
    );

  return (
    <View style={styles.shell}>
      {/* Coin Toss / Server Selection Modal */}
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
              {t("scoreboard.tennis.selectFirstServer") ||
                "SELECIONE QUEM SERVE PRIMEIRO"}
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
          sportLabel: getSportTranslation(matchData.sport_type, t),
          eventName,
          statusBadge: isTiebreak
            ? "Tie-Break"
            : `${"Set"} ${sets.length + 1}`,
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
                testID="btn-ace-home"
                variant="secondary"
                icon="flash"
                label={"Ace"}
                onPress={() => handleAce(0)}
                disabled={serverIdx !== 0}
                style={serverIdx !== 0 ? styles.btnDisabled : undefined}
              />
              <ScoreboardActionButton
                testID="btn-df-home"
                variant="secondary"
                icon="close"
                label={(locale === "pt" ? "FD" : "DF")}
                onPress={() => handleDoubleFault(0)}
                disabled={serverIdx !== 0}
                style={serverIdx !== 0 ? styles.btnDisabled : undefined}
              />
            </>
          ) : undefined
        }
        left={
          <ScoreboardTeamColumn
            teamName={teamA}
            subLabel={renderServerSubLabel(serverIdx === 0)}
            score={formatPoints(points[0], points[1])}
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
                    {t("scoreboard.gamesShort") || "Jogos:"}{" "}
                    <Text style={styles.digitalBadgeNum}>{games[0]}</Text>
                  </Text>
                </View>
              </>
            }
          />
        }
        center={
          <View style={styles.centerColumn}>
            <Text style={styles.centerSetGameText}>
              {isTiebreak
                ? "TIE-BREAK"
                : `${"Set"} ${sets.length + 1} • ${
                    (locale === "pt" ? "Jogo" : "Game")
                  } ${games[0] + games[1] + 1}`}
            </Text>

            <View style={styles.gamesBox}>
              <Text style={styles.gamesLabel}>
                {t("scoreboard.gamesUpper") || "JOGOS"}
              </Text>
              <Text style={styles.gamesDigital}>
                {games[0]} - {games[1]}
              </Text>
            </View>

            <View style={styles.courtSideRow}>
              <Ionicons
                name="swap-horizontal"
                size={12}
                color={ScoreBoardTheme.onSurfaceVariant}
              />
              <Text style={styles.courtSideText} numberOfLines={1}>
                {isDeuceCourt
                  ? t("scoreboard.tennis.rightDeuceSide") ||
                    "Right Side (Deuce)"
                  : t("scoreboard.tennis.leftAdvantageSide") ||
                    "Left Side (Ad)"}
              </Text>
            </View>

            {isBreakPoint && (
              <View style={styles.alertPill}>
                <Text style={styles.alertText}>
                  {t("scoreboard.tennis.breakPoint") || "BREAK POINT"}
                </Text>
              </View>
            )}
            {isDeuceAlert && (
              <View style={styles.alertPill}>
                <Text style={styles.alertText}>
                  {noAd
                    ? t("scoreboard.tennis.goldenPoint") || "PONTO DE OURO"
                    : t("scoreboard.tennis.deuce") || "DEUCE"}
                </Text>
              </View>
            )}
            {isChangeOfEnds && (
              <View style={styles.alertPill}>
                <Text style={styles.alertText}>
                  {t("scoreboard.courtSwitch") || "TROCA DE CAMPO"}
                </Text>
              </View>
            )}

            {canEdit && (
              <TouchableOpacity
                testID="toggle-server-btn"
                style={styles.serverToggleBtn}
                onPress={toggleServer}
                activeOpacity={0.75}
              >
                <Ionicons
                  name="sync"
                  size={12}
                  color={ScoreBoardTheme.onSurfaceVariant}
                />
                <Text style={styles.serverToggleText}>
                  {t("scoreboard.tennis.toggleServer") || "Alternar Servidor"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        }
        right={
          <ScoreboardTeamColumn
            teamName={teamB}
            subLabel={renderServerSubLabel(serverIdx === 1)}
            score={formatPoints(points[1], points[0])}
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
                    {t("scoreboard.gamesShort") || "Jogos:"}{" "}
                    <Text style={styles.digitalBadgeNum}>{games[1]}</Text>
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
                testID="btn-ace-away"
                variant="secondary"
                icon="flash"
                label={"Ace"}
                onPress={() => handleAce(1)}
                disabled={serverIdx !== 1}
                style={serverIdx !== 1 ? styles.btnDisabled : undefined}
              />
              <ScoreboardActionButton
                testID="btn-df-away"
                variant="secondary"
                icon="close"
                label={(locale === "pt" ? "FD" : "DF")}
                onPress={() => handleDoubleFault(1)}
                disabled={serverIdx !== 1}
                style={serverIdx !== 1 ? styles.btnDisabled : undefined}
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
    gap: 8,
    paddingHorizontal: 4,
  },
  centerSetGameText: {
    fontSize: 11,
    fontWeight: "600",
    color: ScoreBoardTheme.textMuted,
    textAlign: "center",
  },
  gamesBox: {
    alignItems: "center",
    backgroundColor: ScoreBoardTheme.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
  },
  gamesLabel: {
    fontSize: 8,
    color: ScoreBoardTheme.textMuted,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  gamesDigital: {
    fontFamily: "Digital7Mono",
    fontSize: 24,
    lineHeight: 28,
    color: ScoreBoardTheme.onSurface,
    fontVariant: ["tabular-nums"],
  },
  courtSideRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  courtSideText: {
    fontSize: 10,
    color: ScoreBoardTheme.onSurfaceVariant,
    fontWeight: "500",
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
  serverToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: ScoreBoardTheme.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  serverToggleText: {
    fontSize: 11,
    fontWeight: "600",
    color: ScoreBoardTheme.onSurfaceVariant,
  },
});
