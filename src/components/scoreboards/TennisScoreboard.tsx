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

const TENNIS_PTS = ["0", "15", "30", "40"];

interface TennisScoreboardProps {
  matchData: any;
  rules?: any;
  canEdit: boolean;
}

export function TennisScoreboard({ matchData, rules, canEdit }: TennisScoreboardProps) {
  const { t } = useLanguage();
  const isPadel = matchData.sport_type === "Padel";
  const defaultMaxSets = rules?.max_sets || 3;
  const noAd = rules?.no_ad ?? (isPadel ? true : false);

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
  const [tossing, setTossing] = useState(false);
  const [aces, setAces] = useState({ home: 0, away: 0 });
  const [doubleFaults, setDoubleFaults] = useState({ home: 0, away: 0 });

  useEffect(() => {
    if (matchData.scores?.tennis) {
      setPoints(matchData.scores.tennis.points || [0, 0]);
      setGames(matchData.scores.tennis.games || [0, 0]);
      setSets(matchData.scores.tennis.sets || []);
      setServerIdx(matchData.scores.serving_index ?? null);
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

  const isTiebreak = games[0] === 6 && games[1] === 6;

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

    const newPoints: [number, number] = [...points];
    newPoints[winnerIdx]++;
    setPoints(newPoints);

    try {
      const { error } = await recordMatchEventAtomic(supabase, {
        matchId: matchData.id,
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
    if (!canEdit || points[idx] <= 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const newPoints: [number, number] = [...points];
    newPoints[idx] = Math.max(0, newPoints[idx] - 1);
    setPoints(newPoints);

    const currentScores = matchData?.scores || {};
    const updated = {
      ...currentScores,
      tennis: {
        ...(currentScores.tennis || {}),
        points: newPoints,
      },
    };

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

  return (
    <View style={styles.landscapeContainer}>
      {/* Coin Toss / Server Selection Overlay */}
      {serverIdx === null && (
        <View style={styles.tossOverlay}>
          <Text style={styles.tossTitle}>{t("scoreboard.tennis.selectFirstServer") || "SELECIONE QUEM SERVE PRIMEIRO"}</Text>
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
              <Text style={styles.servingText}>{t("scoreboard.serving") || "A SERVIR"}</Text>
            </View>
          )}
        </View>

        {/* Stats Badges */}
        <View style={styles.statsBadgesRow}>
          <View style={styles.badgePill}>
            <Text style={styles.badgeText}>
              {t("scoreboard.setsShort") || "Sets:"} <Text style={styles.digitalBadgeNum}>{setsWonA}</Text>
            </Text>
          </View>
          <View style={styles.badgePill}>
            <Text style={styles.badgeText}>
              {t("scoreboard.gamesShort") || "Jogos:"} <Text style={styles.digitalBadgeNum}>{games[0]}</Text>
            </Text>
          </View>
        </View>

        {/* Big Home Point in Digital Font */}
        <Text style={[styles.scoreDigital, { color: "#818cf8" }]}>
          {formatPoints(points[0], points[1])}
        </Text>

        {/* Home Controls */}
        {canEdit && (
          <View style={styles.controlsBlock}>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.btn, styles.btnPoint]}
                onPress={() => handlePoint(0)}
              >
                <Ionicons name="add" size={15} color="#ffffff" />
                <Text style={styles.btnPointText}>{t("scoreboard.point") || "PONTO"}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnUndo]}
                onPress={() => handleCorrectPoint(0)}
              >
                <Ionicons name="arrow-undo" size={13} color="#94a3b8" />
                <Text style={styles.btnUndoText}>{t("scoreboard.undo") || "-1"}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.btn, styles.btnSubAction]}
                onPress={() => handleAce(0)}
                disabled={serverIdx !== 0}
              >
                <Text style={styles.btnSubText}>{t("scoreboard.tennis.ace") || "Ás (Ace)"}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnSubAction]}
                onPress={() => handleDoubleFault(0)}
                disabled={serverIdx !== 0}
              >
                <Text style={styles.btnSubText}>{t("scoreboard.tennis.doubleFault") || "Falta Dupla"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Column 2: Center Info, Games Board, Server Side & Technical Alerts */}
      <View style={styles.centerColumn}>
        <View style={styles.periodPill}>
          <Text style={styles.periodPillText}>
            {isTiebreak ? "TIE-BREAK" : `SET ${sets.length + 1}`}
          </Text>
        </View>

        {/* Games Board in Digital Font */}
        <View style={styles.gamesBox}>
          <Text style={styles.gamesLabel}>{t("scoreboard.gamesUpper") || "JOGOS"}</Text>
          <Text style={styles.gamesDigital}>
            {games[0]} - {games[1]}
          </Text>
        </View>

        {/* Court Side */}
        <View style={styles.courtSideRow}>
          <Ionicons name="swap-horizontal" size={11} color="#60a5fa" />
          <Text style={styles.courtSideText}>
            {isDeuceCourt ? (t("scoreboard.tennis.rightDeuceSide") || "Lado Direito") : (t("scoreboard.tennis.leftAdvantageSide") || "Lado Esquerdo")}
          </Text>
        </View>

        {/* Context Alerts */}
        {isBreakPoint && (
          <View style={styles.alertPillBreak}>
            <Text style={styles.alertTextBreak}>{t("scoreboard.tennis.breakPoint") || "BREAK POINT"}</Text>
          </View>
        )}
        {isDeuceAlert && (
          <View style={styles.alertPillDeuce}>
            <Text style={styles.alertTextDeuce}>
              {noAd ? (t("scoreboard.tennis.goldenPoint") || "PONTO DE OURO") : (t("scoreboard.tennis.deuce") || "DEUCE")}
            </Text>
          </View>
        )}
        {isChangeOfEnds && (
          <View style={styles.alertPillSwitch}>
            <Text style={styles.alertTextSwitch}>{t("scoreboard.courtSwitch") || "TROCA DE CAMPO"}</Text>
          </View>
        )}

        {/* Toggle Server */}
        {canEdit && (
          <TouchableOpacity style={styles.serverToggleBtn} onPress={toggleServer}>
            <Ionicons name="sync" size={11} color="#60a5fa" />
            <Text style={styles.serverToggleText}>{t("scoreboard.tennis.toggleServer") || "Alternar Servidor"}</Text>
          </TouchableOpacity>
        )}

        {/* Finalize Match */}
        {canEdit && (
          <TouchableOpacity style={styles.endMatchBtn} onPress={handleFinalizeMatch}>
            <Ionicons name="checkmark-circle-outline" size={13} color="#f87171" />
            <Text style={styles.endMatchText}>{t("scoreboard.endMatch") || "Terminar"}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Column 3: Team Away */}
      <View style={styles.teamColumn}>
        <View style={styles.teamHeaderRow}>
          {serverIdx === 1 && (
            <View style={styles.servingBadgeAway}>
              <Text style={styles.servingTextAway}>{t("scoreboard.serving") || "A SERVIR"}</Text>
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
              {t("scoreboard.gamesShort") || "Jogos:"} <Text style={styles.digitalBadgeNum}>{games[1]}</Text>
            </Text>
          </View>
          <View style={styles.badgePill}>
            <Text style={styles.badgeText}>
              {t("scoreboard.setsShort") || "Sets:"} <Text style={styles.digitalBadgeNum}>{setsWonB}</Text>
            </Text>
          </View>
        </View>

        {/* Big Away Point in Digital Font */}
        <Text style={[styles.scoreDigital, { color: "#4edea3" }]}>
          {formatPoints(points[1], points[0])}
        </Text>

        {/* Away Controls */}
        {canEdit && (
          <View style={styles.controlsBlock}>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.btn, styles.btnUndo]}
                onPress={() => handleCorrectPoint(1)}
              >
                <Ionicons name="arrow-undo" size={13} color="#94a3b8" />
                <Text style={styles.btnUndoText}>{t("scoreboard.undo") || "-1"}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnPoint, styles.btnPointAway]}
                onPress={() => handlePoint(1)}
              >
                <Ionicons name="add" size={15} color="#ffffff" />
                <Text style={styles.btnPointText}>{t("scoreboard.point") || "PONTO"}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.btn, styles.btnSubAction]}
                onPress={() => handleDoubleFault(1)}
                disabled={serverIdx !== 1}
              >
                <Text style={styles.btnSubText}>{t("scoreboard.tennis.doubleFault") || "Falta Dupla"}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnSubAction]}
                onPress={() => handleAce(1)}
                disabled={serverIdx !== 1}
              >
                <Text style={styles.btnSubText}>{t("scoreboard.tennis.ace") || "Ás (Ace)"}</Text>
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
  gamesBox: {
    alignItems: "center",
    backgroundColor: "#141c2e",
    borderWidth: 1,
    borderColor: "#222f50",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  gamesLabel: {
    fontSize: 8,
    color: "#94a3b8",
    fontWeight: "700",
  },
  gamesDigital: {
    fontFamily: "Digital7",
    fontSize: 22,
    color: "#ffffff",
  },
  courtSideRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  courtSideText: {
    fontSize: 9,
    color: "#94a3b8",
    fontWeight: "700",
  },
  alertPillBreak: {
    backgroundColor: "rgba(244, 63, 94, 0.2)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  alertTextBreak: {
    fontSize: 8,
    fontWeight: "900",
    color: "#f43f5e",
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
