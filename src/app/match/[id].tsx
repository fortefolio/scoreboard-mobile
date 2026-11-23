import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Share,
  Alert,
  TextInput,
  Modal,
} from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/components/AuthProvider";
import { useLanguage } from "@/lib/i18n";
import { mapErrorToUserMessage } from "@/lib/errors/mapError";
import { useFollow } from "@/lib/hooks/useFollow";
import { TopBar } from "@/components/TopBar";
import { FollowButton, SportFavoriteButton } from "@/components/FollowButton";
import { RuleModal } from "@/components/RuleModal";
import { MatchAtmosphereBackground } from "@/components/match/MatchAtmosphereBackground";
import { ScoreProgressBreakdown } from "@/components/match/ScoreProgressBreakdown";
import { MatchDetailSkeleton } from "@/components/common/Skeleton";
import { supabase } from "@/lib/supabase/client";
import { ScoreBoardTheme, Colors, Spacing } from "@/constants/theme";

export default function MatchDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t, locale } = useLanguage();
  const { user } = useAuth();
  const { isFollowing, toggleFollow } = useFollow();

  const [match, setMatch] = useState<any | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Tabs: progress, rules, official
  const [activeTab, setActiveTab] = useState<"progress" | "rules" | "official">("progress");

  // Modals & Tools
  const [ruleModalVisible, setRuleModalVisible] = useState(false);
  const [umpireSearch, setUmpireSearch] = useState("");
  const [umpireSearchResults, setUmpireSearchResults] = useState<any[]>([]);
  const [searchingUmpire, setSearchingUmpire] = useState(false);
  const [startingMatch, setStartingMatch] = useState(false);

  const matchIdStr = (Array.isArray(id) ? id[0] : id) || "";
  const following = isFollowing(matchIdStr, "match");
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deletingMatch, setDeletingMatch] = useState(false);

  // Fetch match details and events
  const fetchMatch = useCallback(async () => {
    if (!matchIdStr) return;
    try {
      const [matchRes, eventsRes] = await Promise.all([
        supabase
          .from("matches")
          .select("id, tournament_id, organizer_id, umpire_id, umpire_invite_status, sport_type, status, participants, scores, settings, round_number, match_order, bracket_type, group_label, court, scheduled_at, created_at, updated_at, tournaments(name, organizer_id)")
          .eq("id", matchIdStr)
          .single(),
        supabase
          .from("match_events")
          .select("id, match_id, idempotency_key, event_data, created_at")
          .eq("match_id", matchIdStr)
          .order("created_at", { ascending: false }),
      ]);

      if (matchRes.data) {
        let organizerData: { id?: string; username?: string } | null = null;
        const ownerId =
          matchRes.data.organizer_id || (matchRes.data.tournaments as any)?.organizer_id;
        if (ownerId) {
          const { data: oData } = await supabase
            .from("users")
            .select("id, username")
            .eq("id", ownerId)
            .maybeSingle();
          organizerData = oData;
        }
        setMatch({ ...matchRes.data, organizer: organizerData });
      }
      if (eventsRes.data) {
        setEvents(eventsRes.data);
      }
    } catch (e) {
      console.warn("Failed to fetch match:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [matchIdStr]);

  const hasMountedRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (!hasMountedRef.current) {
        hasMountedRef.current = true;
        return;
      }
      fetchMatch();
    }, [fetchMatch])
  );

  useEffect(() => {
    fetchMatch();

    // Subscribe to match broadcast & table events in realtime
    const matchChannel = supabase
      .channel(`match:${matchIdStr}`)
      .on(
        "broadcast",
        { event: "score_update" },
        (response: any) => {
          const payload = response?.payload;
          if (payload && payload.match_id === matchIdStr) {
            setMatch((prev: any) => ({
              ...prev,
              scores: payload.scores ?? prev?.scores,
              status: payload.status ?? prev?.status,
            }));
            if (payload.event_data) {
              setEvents((prev) => [
                {
                  id: `broadcast-${Date.now()}-${Math.random()}`,
                  match_id: payload.match_id,
                  event_data: payload.event_data,
                  created_at: new Date().toISOString(),
                },
                ...prev,
              ]);
            }
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches", filter: `id=eq.${matchIdStr}` },
        (payload) => {
          if (payload.new) {
            setMatch((prev: any) => ({ ...prev, ...payload.new }));
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "match_events", filter: `match_id=eq.${matchIdStr}` },
        (payload) => {
          if (payload.new) {
            setEvents((prev) => {
              const exists = prev.some(
                (e) => e.id && payload.new.id && e.id === payload.new.id
              );
              if (exists) return prev;
              return [payload.new, ...prev];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(matchChannel);
    };
  }, [fetchMatch, matchIdStr]);

  // Permissions
  const isOrganizer = Boolean(
    user?.id && match?.organizer_id && user.id === match.organizer_id
  );
  const isUmpire = Boolean(
    user?.id && match?.umpire_id === user.id && match?.umpire_invite_status === "accepted"
  );
  const canStart = isOrganizer || isUmpire;
  const isOngoing = match?.status === "ongoing";
  const isCompleted = match?.status === "completed";

  // Share functionality
  const handleShare = async () => {
    try {
      const shareUrl = `https://scoreboard.app/match/${matchIdStr}`;
      await Share.share({
        message: `Acompanha o jogo ${match?.participants?.[0]?.name || "Equipa A"} vs ${
          match?.participants?.[1]?.name || "Equipa B"
        } em direto no ScoreBoard: ${shareUrl}`,
        url: shareUrl,
      });
    } catch (e) {
      console.warn("Share error:", e);
    }
  };

  // Start Scoreboard
  const handleStartScoreboard = async () => {
    if (!canStart) return;
    setStartingMatch(true);
    try {
      if (match.status === "scheduled") {
        const { error } = await supabase
          .from("matches")
          .update({ status: "ongoing" })
          .eq("id", matchIdStr);
        if (error) throw error;
      }
      router.push(`/match/${matchIdStr}/scoreboard` as any);
    } catch (e: any) {
      Alert.alert(
        locale === "pt" ? "Erro" : "Error",
        mapErrorToUserMessage(
          e,
          locale,
          locale === "pt" ? "Não foi possível iniciar o marcador." : "Could not start scoreboard."
        )
      );
    } finally {
      setStartingMatch(false);
    }
  };

  // Search Umpires
  const searchUmpires = async (query: string) => {
    if (!isOrganizer) return;
    setUmpireSearch(query);
    if (query.trim().length < 2) {
      setUmpireSearchResults([]);
      return;
    }
    setSearchingUmpire(true);
    try {
      const trimmed = query.trim();
      if (trimmed.length < 3) {
        setUmpireSearchResults([]);
        return;
      }
      const { data, error } = await supabase.rpc("search_umpires", {
        p_query: trimmed,
      });
      if (!error && data) {
        setUmpireSearchResults(data);
      } else {
        setUmpireSearchResults([]);
      }
    } catch (e) {
      console.warn("Umpire search error:", e);
    } finally {
      setSearchingUmpire(false);
    }
  };

  // Assign Umpire
  const assignUmpire = async (umpireId: string | null) => {
    if (!isOrganizer) return;
    try {
      const { error } = await supabase.rpc("appoint_match_umpire", {
        p_match_id: matchIdStr,
        p_new_umpire_id: umpireId,
      });
      if (error) throw error;
      setUmpireSearch("");
      setUmpireSearchResults([]);
      fetchMatch();
      Alert.alert(
        locale === "pt" ? "Sucesso" : "Success",
        umpireId
          ? (locale === "pt" ? "Árbitro designado com sucesso!" : "Referee appointed successfully!")
          : t("match.umpireUnassigned")
      );
    } catch (e: any) {
      Alert.alert(locale === "pt" ? "Erro" : "Error", mapErrorToUserMessage(e, locale));
    }
  };

  // Save Rules
  const handleSaveRules = async (rules: Record<string, any>, court: string | null) => {
    if (!isOrganizer) return;
    const { error } = await supabase
      .from("matches")
      .update({
        settings: rules,
        court: court,
      })
      .eq("id", matchIdStr);
    if (error) throw error;
    fetchMatch();
  };

  // Delete Match
  const handleDeleteMatch = () => {
    if (!isOrganizer) return;
    setDeleteModalVisible(true);
  };

  const confirmDeleteMatch = async () => {
    if (!isOrganizer || deletingMatch) return;
    setDeletingMatch(true);
    try {
      const { error } = await supabase
        .from("matches")
        .delete()
        .eq("id", matchIdStr);
      if (error) throw error;
      setDeleteModalVisible(false);
      router.back();
    } catch (e: any) {
      setDeleteModalVisible(false);
      Alert.alert(
        locale === "pt" ? "Erro" : "Error",
        mapErrorToUserMessage(e, locale)
      );
    } finally {
      setDeletingMatch(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <MatchDetailSkeleton />
      </SafeAreaView>
    );
  }

  if (!match) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
          <Text style={styles.errorTitle}>{t("match.notFound") || "Jogo não encontrado"}</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>{t("common.back") || "Voltar"}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const teamAName = match.participants?.[0]?.name || t("common.teamDefault") + " A";
  const teamBName = match.participants?.[1]?.name || t("common.teamDefault") + " B";

  // Score representations
  const getHeroScoreSummary = () => {
    const scores = match.scores;
    if (match.sport_type === "Football") {
      const gA = scores?.football?.goals?.[0] ?? scores?.goals?.[0] ?? scores?.current?.home ?? 0;
      const gB = scores?.football?.goals?.[1] ?? scores?.goals?.[1] ?? scores?.current?.away ?? 0;
      return { scoreA: gA, scoreB: gB, setSummary: null };
    }

    if (match.sport_type === "Basketball") {
      const pA = scores?.basketball?.total_points?.[0] ?? scores?.total_points?.[0] ?? scores?.current?.home ?? 0;
      const pB = scores?.basketball?.total_points?.[1] ?? scores?.total_points?.[1] ?? scores?.current?.away ?? 0;
      return { scoreA: pA, scoreB: pB, setSummary: null };
    }

    if (match.sport_type === "Tennis" || match.sport_type === "Padel") {
      const sets: [number, number][] = scores?.tennis?.sets || scores?.sets || [];
      const games: [number, number] = scores?.tennis?.games || [0, 0];
      const points: [number, number] = scores?.tennis?.points || [scores?.current?.home ?? 0, scores?.current?.away ?? 0];
      const isTiebreak = Boolean(scores?.tennis?.is_tiebreak);
      const TENNIS_PTS = ["0", "15", "30", "40", "AD"];
      const ptA = isTiebreak ? String(points[0] ?? 0) : (TENNIS_PTS[points[0]] ?? String(points[0] ?? 0));
      const ptB = isTiebreak ? String(points[1] ?? 0) : (TENNIS_PTS[points[1]] ?? String(points[1] ?? 0));
      const setsA = sets.filter((s) => s[0] > s[1]).length;
      const setsB = sets.filter((s) => s[1] > s[0]).length;
      const serving = scores?.tennis?.serving_team;

      return {
        scoreA: setsA,
        scoreB: setsB,
        setSummary: {
          isTennis: true,
          sets,
          games,
          ptA,
          ptB,
          setsA,
          setsB,
          serving,
        },
      };
    }

    if (match.sport_type === "Volleyball" || match.sport_type === "Beach Volleyball") {
      const sets: [number, number][] = scores?.volleyball?.sets || scores?.sets || [];
      const pts: [number, number] = scores?.volleyball?.current_points || [scores?.current?.home ?? 0, scores?.current?.away ?? 0];
      const setsA = sets.filter((s) => s[0] > s[1]).length;
      const setsB = sets.filter((s) => s[1] > s[0]).length;
      const serving = scores?.volleyball?.serving_team;

      return {
        scoreA: setsA,
        scoreB: setsB,
        setSummary: {
          isTennis: false,
          sets,
          games: null,
          ptA: String(pts[0] ?? 0),
          ptB: String(pts[1] ?? 0),
          setsA,
          setsB,
          serving,
        },
      };
    }

    return {
      scoreA: scores?.current?.home ?? 0,
      scoreB: scores?.current?.away ?? 0,
      setSummary: null,
    };
  };

  const heroSummary = getHeroScoreSummary();
  const formattedMatchDate = (() => {
    const rawDate = match.scheduled_at || match.created_at;
    if (!rawDate) return null;
    try {
      return new Date(rawDate).toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return null;
    }
  })();

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <MatchAtmosphereBackground sportType={match.sport_type} mode="spectator" />
      {/* Main Global TopBar */}
      <TopBar />

      {/* Top Row: 32x32 Icon-only Back, Centered Tournament Pill, 32px Spacer */}
      <View style={styles.topNav}>
        <TouchableOpacity
          style={styles.navIconBtn}
          onPress={() => router.back()}
          testID="match-detail-back-btn"
          accessibilityLabel="Back"
        >
          <Ionicons name="arrow-back" size={18} color={ScoreBoardTheme.onSurface} />
        </TouchableOpacity>

        <View style={styles.navCenter}>
          {match.tournaments?.name ? (
            <TouchableOpacity
              style={styles.tournamentPill}
              onPress={() => {
                if (match.tournament_id) {
                  router.push(`/tournament/${match.tournament_id}` as any);
                }
              }}
              disabled={!match.tournament_id}
              activeOpacity={0.75}
            >
              <Ionicons name="trophy-outline" size={13} color={ScoreBoardTheme.textMuted} />
              <Text style={styles.tournamentPillText} numberOfLines={1}>
                {match.tournaments.name}
              </Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.navTitle} numberOfLines={1}>
              {match.sport_type}
            </Text>
          )}
        </View>

        <View style={styles.navSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Match Header Hero Card */}
        <View style={styles.heroCard}>
          {/* Hero Top Bar: @organizer on left, SportFavoriteButton + 3-dots menu on right */}
          <View style={styles.heroTopBar}>
            <View style={styles.heroTopLeft}>
              {(match.organizer?.username || match.organizer?.email) ? (
                <TouchableOpacity
                  style={styles.organizerPill}
                  onPress={() => {
                    const uname =
                      match.organizer?.username ||
                      match.organizer?.email?.split("@")[0];
                    if (uname) router.push(`/user/${encodeURIComponent(uname)}` as any);
                  }}
                  activeOpacity={0.75}
                >
                  <Text style={styles.organizerPillText} numberOfLines={1}>
                    @{match.organizer?.username || match.organizer?.email?.split("@")[0]}
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.sportBadge}>
                  <Text style={styles.sportBadgeText}>{match.sport_type}</Text>
                </View>
              )}
            </View>

            <View style={styles.heroTopRight}>
              <SportFavoriteButton
                entityId={matchIdStr}
                entityType="match"
                sport={match.sport_type}
                size="sm"
              />
              <TouchableOpacity
                style={styles.navIconBtn}
                onPress={() => setMenuOpen(true)}
                activeOpacity={0.75}
                accessibilityLabel={t("match.options") || "Options"}
              >
                <Ionicons name="ellipsis-vertical" size={17} color={ScoreBoardTheme.onSurfaceVariant} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Teams vs Score Display */}
          <View style={styles.matchupRow}>
            <View style={styles.teamSide}>
              <View style={styles.scoreBox}>
                <Text style={styles.scoreBoxText}>{heroSummary.scoreA}</Text>
              </View>
              <Text style={styles.teamTitle} numberOfLines={2}>
                {teamAName}
              </Text>
            </View>

            <View style={styles.scoreCenter}>
              <Text style={styles.vsText}>vs</Text>
              {isOngoing ? (
                <View style={styles.liveIndicator}>
                  <View style={styles.livePulse} />
                  <Text style={styles.liveText}>{t("status.live") || "Live"}</Text>
                </View>
              ) : (
                <Text style={styles.statusBadge}>
                  {isCompleted
                    ? t("status.completed") || "Completed"
                    : t("status.scheduled") || "Scheduled"}
                </Text>
              )}
              {formattedMatchDate && (
                <Text style={styles.matchDateText}>{formattedMatchDate}</Text>
              )}
            </View>

            <View style={styles.teamSide}>
              <View style={styles.scoreBox}>
                <Text style={styles.scoreBoxText}>{heroSummary.scoreB}</Text>
              </View>
              <Text style={styles.teamTitle} numberOfLines={2}>
                {teamBName}
              </Text>
            </View>
          </View>

          {/* Embedded Set / Game / Points Summary Table for Set-based Sports */}
          {heroSummary.setSummary && (
            <>
              <View style={styles.heroDivider} />
              <View style={styles.summaryTable} testID="match-summary-table">
                <View style={styles.summaryHeaderRow}>
                  <Text style={[styles.summaryHeaderText, styles.summaryTeamCol]} numberOfLines={1}>
                    {t("common.team") || "Team"}
                  </Text>
                  {heroSummary.setSummary.sets.map((_, idx) => (
                    <Text key={`sh-${idx}`} style={[styles.summaryHeaderText, styles.summaryNumCol]} numberOfLines={1}>
                      S{idx + 1}
                    </Text>
                  ))}
                  {heroSummary.setSummary.isTennis && (
                    <Text style={[styles.summaryHeaderText, styles.summaryNumCol]} numberOfLines={1}>
                      {t("common.games") || "Games"}
                    </Text>
                  )}
                  <Text style={[styles.summaryHeaderText, styles.summaryNumCol]} numberOfLines={1}>
                    {t("common.pointsLabel") || "Points"}
                  </Text>
                  <Text style={[styles.summaryHeaderText, styles.summaryNumCol]} numberOfLines={1}>
                    Sets
                  </Text>
                </View>

                {[
                  {
                    name: teamAName,
                    teamIdx: 0,
                    games: heroSummary.setSummary.games?.[0] ?? 0,
                    points: heroSummary.setSummary.ptA,
                    setsWon: heroSummary.setSummary.setsA,
                  },
                  {
                    name: teamBName,
                    teamIdx: 1,
                    games: heroSummary.setSummary.games?.[1] ?? 0,
                    points: heroSummary.setSummary.ptB,
                    setsWon: heroSummary.setSummary.setsB,
                  },
                ].map((row, rIdx) => {
                  const isServing =
                    heroSummary.setSummary?.serving === row.teamIdx ||
                    (row.teamIdx === 0 && heroSummary.setSummary?.serving === "home") ||
                    (row.teamIdx === 1 && heroSummary.setSummary?.serving === "away");
                  return (
                    <View
                      key={`sr-${row.teamIdx}`}
                      style={[styles.summaryRow, rIdx === 0 && styles.summaryRowBorder]}
                    >
                      <View style={[styles.summaryTeamCol, styles.summaryTeamCell]}>
                        <Text style={styles.summaryTeamName} numberOfLines={1}>
                          {row.name}
                        </Text>
                        {isServing && <View style={styles.servingDot} />}
                      </View>
                      {heroSummary.setSummary!.sets.map((s, sIdx) => (
                        <Text key={`sv-${row.teamIdx}-${sIdx}`} style={[styles.summaryCellMuted, styles.summaryNumCol]}>
                          {s[row.teamIdx] ?? 0}
                        </Text>
                      ))}
                      {heroSummary.setSummary!.isTennis && (
                        <Text style={[styles.summaryCellMuted, styles.summaryNumCol]}>
                          {row.games}
                        </Text>
                      )}
                      <Text style={[styles.summaryCellBold, styles.summaryNumCol]}>
                        {row.points}
                      </Text>
                      <Text style={[styles.summaryCellBold, styles.summaryNumCol]}>
                        {row.setsWon}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </>
          )}
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === "progress" && styles.tabBtnActive]}
            onPress={() => setActiveTab("progress")}
          >
            <Text style={[styles.tabText, activeTab === "progress" && styles.tabTextActive]}>
              {t("match.scoreProgress") || "Evolução"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === "rules" && styles.tabBtnActive]}
            onPress={() => setActiveTab("rules")}
          >
            <Text style={[styles.tabText, activeTab === "rules" && styles.tabTextActive]}>
              {t("match.matchRules") || "Regras"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === "official" && styles.tabBtnActive]}
            onPress={() => setActiveTab("official")}
          >
            <Text style={[styles.tabText, activeTab === "official" && styles.tabTextActive]}>
              {t("match.matchOfficial") || "Árbitro"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Start Scoreboard Handheld Button */}
        {canStart && !isCompleted && (
          <TouchableOpacity
            testID="start-scoreboard-btn"
            style={styles.startScoreboardBtn}
            onPress={handleStartScoreboard}
            disabled={startingMatch}
            activeOpacity={0.85}
          >
            {startingMatch ? (
              <ActivityIndicator color={ScoreBoardTheme.surfaceContainerLowest} />
            ) : (
              <>
                <Ionicons name="play-circle" size={24} color={ScoreBoardTheme.surfaceContainerLowest} />
                <Text style={styles.startScoreboardText}>
                  {match.status === "scheduled"
                    ? t("match.startScoreboard") || "Start Scoreboard"
                    : t("match.openScoreboard") || "Open Referee Console"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* TAB 1: SCORE PROGRESS & EVENTS */}
        {activeTab === "progress" && (
          <View style={styles.tabContent}>
            <ScoreProgressBreakdown
              match={match}
              events={events}
              teamAName={teamAName}
              teamBName={teamBName}
              emptyText={t("match.noPointsRecorded")}
              formatFallback={(team) =>
                t("match.pointRecordedFor", { team })
              }
            />
          </View>
        )}

        {/* TAB 2: MATCH RULES */}
        {activeTab === "rules" && (
          <View style={styles.tabContent}>
            <View style={styles.rulesHeader}>
              <Text style={styles.sectionTitle}>{t("match.matchRules") || "Regras do Jogo"}</Text>
              {isOrganizer && (
                <TouchableOpacity
                  style={styles.editRulesBtn}
                  onPress={() => setRuleModalVisible(true)}
                >
                  <Ionicons name="settings-outline" size={14} color="#a5b4fc" />
                  <Text style={styles.editRulesBtnText}>
                    {t("match.editRules") || "Configurar"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{t("match.venueCourt")}</Text>
                <Text style={styles.infoVal}>{match.court || t("match.notDefined")}</Text>
              </View>
              <View style={styles.infoDivider} />

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{t("common.format")}</Text>
                <Text style={styles.infoVal}>
                  {match.settings?.max_sets
                    ? `${match.settings.max_sets} Sets`
                    : match.settings?.quarter_minutes
                    ? `4x ${match.settings.quarter_minutes} min`
                    : t("match.officialDefault")}
                </Text>
              </View>
              <View style={styles.infoDivider} />

              {match.sport_type === "Padel" && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>{t("match.advantageRule")}</Text>
                  <Text style={styles.infoVal}>
                    {match.settings?.no_ad ? "Golden Point (No-Ad)" : t("match.standardAdvantage")}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* TAB 3: OFFICIAL & UMPIRE */}
        {activeTab === "official" && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>
              {t("match.matchOfficial") || "Árbitro Oficial"}
            </Text>

            <View style={styles.infoCard}>
              <View style={styles.umpireRow}>
                <Ionicons
                  name="shield-checkmark"
                  size={24}
                  color={match.umpire_id ? "#4edea3" : "#64748b"}
                />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.umpireName}>
                    {match.umpire_id
                      ? match.umpire_invite_status === "accepted"
                        ? t("match.umpireConfirmed")
                        : t("match.inviteSentPending")
                      : t("match.noUmpireAssigned")}
                  </Text>
                  <Text style={styles.umpireSub}>
                    {match.umpire_id
                      ? t("match.accessGrantedMobile")
                      : t("match.organizerDefaultReferee")}
                  </Text>
                </View>
              </View>
            </View>

            {/* Organizer Tool: Search & Appoint Umpire */}
            {isOrganizer && (
              <View style={styles.appointSection}>
                <Text style={styles.subSectionTitle}>
                  {t("match.appointOtherRefereeUpper") || t("match.appointOtherReferee")}
                </Text>

                {/* Quick Action: Assign Myself as Referee */}
                {user && match.umpire_id !== user.id && (
                  <TouchableOpacity
                    style={styles.selfAssignBtn}
                    onPress={() => assignUmpire(user.id)}
                  >
                    <Ionicons name="person-circle-outline" size={18} color="#38bdf8" />
                    <Text style={styles.selfAssignBtnText}>
                      {t("match.assignMyselfAsReferee")}
                    </Text>
                  </TouchableOpacity>
                )}

                <TextInput
                  style={styles.searchInput}
                  placeholder={t("match.searchUmpirePlaceholder")}
                  placeholderTextColor="#64748b"
                  value={umpireSearch}
                  onChangeText={searchUmpires}
                />

                {searchingUmpire && (
                  <ActivityIndicator color={ScoreBoardTheme.onSurfaceVariant} style={{ margin: 8 }} />
                )}

                {umpireSearchResults.map((u) => (
                  <TouchableOpacity
                    key={u.id}
                    style={styles.searchUserItem}
                    onPress={() => assignUmpire(u.id)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.searchUserName}>{u.username || t("match.noName")}</Text>
                      <Text style={styles.searchUserEmail}>{u.email}</Text>
                    </View>
                    <Ionicons name="person-add-outline" size={18} color="#4edea3" />
                  </TouchableOpacity>
                ))}

                {match.umpire_id && (
                  <TouchableOpacity
                    style={styles.unassignBtn}
                    onPress={() => assignUmpire(null)}
                  >
                    <Ionicons name="person-remove-outline" size={16} color="#f87171" />
                    <Text style={styles.unassignBtnText}>
                      {t("match.unassignUmpire")}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Rules Modal (Organizer only) */}
      {isOrganizer && (
        <RuleModal
          visible={ruleModalVisible}
          onClose={() => setRuleModalVisible(false)}
          onSave={handleSaveRules}
          sportType={match.sport_type}
          initialRules={match.settings}
          initialCourt={match.court}
        />
      )}

      {/* 3-Dots Options Menu Modal */}
      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
      >
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setMenuOpen(false)}
        >
          <View style={styles.menuCard}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuOpen(false);
                handleShare();
              }}
            >
              <Ionicons name="share-outline" size={17} color={ScoreBoardTheme.onSurfaceVariant} />
              <Text style={styles.menuItemText}>
                {t("match.shareLink") || "Share Link"}
              </Text>
            </TouchableOpacity>

            {isOrganizer && (
              <>
                <TouchableOpacity
                  style={[styles.menuItem, styles.menuItemDivider]}
                  onPress={() => {
                    setMenuOpen(false);
                    setRuleModalVisible(true);
                  }}
                >
                  <Ionicons name="options-outline" size={17} color={ScoreBoardTheme.onSurfaceVariant} />
                  <Text style={styles.menuItemText}>
                    {t("match.matchRules")}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  testID="match-detail-delete-btn"
                  style={[styles.menuItem, styles.menuItemDivider]}
                  onPress={() => {
                    setMenuOpen(false);
                    handleDeleteMatch();
                  }}
                >
                  <Ionicons name="trash-outline" size={17} color="#ef4444" />
                  <Text style={[styles.menuItemText, { color: "#ef4444" }]}>
                    {t("match.deleteMatch")}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Delete Match Confirmation Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => !deletingMatch && setDeleteModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => !deletingMatch && setDeleteModalVisible(false)}
        >
          <View
            style={styles.confirmModalCard}
            onStartShouldSetResponder={() => true}
            testID="delete-match-confirm-modal"
          >
            <Text style={styles.confirmModalTitle}>
              {t("match.deleteMatch")}
            </Text>
            <Text style={styles.confirmModalBody}>
              {t("match.deleteMatchConfirm")}
            </Text>
            <View style={styles.confirmModalActions}>
              <TouchableOpacity
                style={styles.confirmCancelBtn}
                onPress={() => setDeleteModalVisible(false)}
                disabled={deletingMatch}
                activeOpacity={0.75}
              >
                <Text style={styles.confirmCancelText}>
                  {t("common.cancel")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmDeleteBtn}
                onPress={confirmDeleteMatch}
                disabled={deletingMatch}
                activeOpacity={0.75}
                testID="confirm-delete-match-btn"
              >
                {deletingMatch ? (
                  <ActivityIndicator size="small" color="#f87171" />
                ) : (
                  <Text style={styles.confirmDeleteText}>
                    {t("match.deleteMatch")}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: ScoreBoardTheme.background,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    color: ScoreBoardTheme.onSurfaceVariant,
    fontSize: 14,
  },
  errorTitle: {
    fontSize: 16,
    color: ScoreBoardTheme.onSurface,
    fontWeight: "700",
    marginTop: 12,
    marginBottom: 16,
  },
  backBtn: {
    backgroundColor: ScoreBoardTheme.surfaceContainerHighest,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backBtnText: {
    color: ScoreBoardTheme.onSurface,
    fontWeight: "600",
  },
  topNav: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  navCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    minWidth: 0,
  },
  navSpacer: {
    width: 32,
  },
  tournamentPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: ScoreBoardTheme.surfaceContainer,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    maxWidth: "100%",
  },
  tournamentPillText: {
    fontSize: 12,
    fontWeight: "500",
    color: ScoreBoardTheme.onSurfaceVariant,
  },
  navTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: ScoreBoardTheme.onSurfaceVariant,
    textAlign: "center",
  },
  navIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: ScoreBoardTheme.surfaceContainer,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    padding: 16,
    paddingTop: 4,
    paddingBottom: 40,
  },
  heroCard: {
    backgroundColor: ScoreBoardTheme.surfaceContainer,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    padding: 16,
    marginBottom: 16,
  },
  heroTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 8,
  },
  heroTopLeft: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  heroTopRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
  organizerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    height: 28,
    paddingHorizontal: 9,
    borderRadius: 6,
    backgroundColor: ScoreBoardTheme.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    maxWidth: 160,
  },
  organizerPillText: {
    fontSize: 12,
    fontWeight: "500",
    color: ScoreBoardTheme.textMuted,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  menuCard: {
    width: "100%",
    maxWidth: 260,
    backgroundColor: ScoreBoardTheme.surfaceContainerHigh,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  menuItemDivider: {
    borderTopWidth: 1,
    borderTopColor: ScoreBoardTheme.borderSubtle,
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: "500",
    color: ScoreBoardTheme.onSurface,
  },
  confirmModalCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: ScoreBoardTheme.surfaceContainer,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    padding: 20,
  },
  confirmModalTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: ScoreBoardTheme.onSurface,
    marginBottom: 8,
  },
  confirmModalBody: {
    fontSize: 13,
    lineHeight: 19,
    color: ScoreBoardTheme.textMuted,
    marginBottom: 20,
  },
  confirmModalActions: {
    flexDirection: "row",
    gap: 10,
  },
  confirmCancelBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: ScoreBoardTheme.surfaceContainerLow,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmCancelText: {
    fontSize: 13,
    fontWeight: "500",
    color: ScoreBoardTheme.onSurfaceVariant,
  },
  confirmDeleteBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  confirmDeleteText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#f87171",
  },
  sportBadge: {
    backgroundColor: ScoreBoardTheme.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  sportBadgeText: {
    fontSize: 11,
    fontWeight: "500",
    color: ScoreBoardTheme.onSurfaceVariant,
  },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  livePulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: ScoreBoardTheme.liveCrimson,
  },
  liveText: {
    fontSize: 11,
    fontWeight: "500",
    color: ScoreBoardTheme.onSurface,
  },
  statusBadge: {
    fontSize: 11,
    fontWeight: "400",
    color: ScoreBoardTheme.textMuted,
  },
  courtBadge: {
    fontSize: 11,
    color: ScoreBoardTheme.textMuted,
  },
  matchupRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  teamSide: {
    flex: 1,
    alignItems: "center",
  },
  teamAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: ScoreBoardTheme.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  avatarLetter: {
    fontSize: 18,
    fontWeight: "500",
    color: ScoreBoardTheme.onSurfaceVariant,
  },
  teamTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: ScoreBoardTheme.onSurface,
    textAlign: "center",
    lineHeight: 18,
  },
  scoreCenter: {
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  scoreBox: {
    width: 72,
    height: 72,
    borderRadius: 14,
    backgroundColor: ScoreBoardTheme.surfaceContainerLow,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  scoreBoxText: {
    fontFamily: "Digital7Mono",
    fontSize: 40,
    color: ScoreBoardTheme.onSurface,
    fontVariant: ["tabular-nums"],
  },
  vsText: {
    fontSize: 12,
    fontWeight: "500",
    color: ScoreBoardTheme.textMuted,
  },
  matchDateText: {
    fontSize: 11,
    color: ScoreBoardTheme.textMuted,
    fontVariant: ["tabular-nums"],
  },
  heroDivider: {
    height: 1,
    backgroundColor: ScoreBoardTheme.borderSubtle,
    marginVertical: 16,
  },
  summaryTable: {
    backgroundColor: ScoreBoardTheme.surfaceContainerLow,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    overflow: "hidden",
  },
  summaryHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: ScoreBoardTheme.borderSubtle,
  },
  summaryHeaderText: {
    fontSize: 11,
    fontWeight: "500",
    color: ScoreBoardTheme.textMuted,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  summaryRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: ScoreBoardTheme.borderSubtle,
  },
  summaryTeamCol: {
    flex: 1,
    paddingRight: 8,
  },
  summaryTeamCell: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  summaryTeamName: {
    fontSize: 13,
    fontWeight: "500",
    color: ScoreBoardTheme.onSurface,
    flexShrink: 1,
  },
  servingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: ScoreBoardTheme.onSurface,
  },
  summaryNumCol: {
    width: 48,
    textAlign: "center",
  },
  summaryCellMuted: {
    fontFamily: "Digital7Mono",
    fontSize: 14,
    color: ScoreBoardTheme.textMuted,
    fontVariant: ["tabular-nums"],
  },
  summaryCellBold: {
    fontFamily: "Digital7Mono",
    fontSize: 14,
    fontWeight: "700",
    color: ScoreBoardTheme.onSurface,
    fontVariant: ["tabular-nums"],
  },
  bigScoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  bigScore: {
    fontFamily: "Digital7Mono",
    fontSize: 42,
    color: ScoreBoardTheme.onSurface,
    lineHeight: 46,
    fontVariant: ["tabular-nums"],
  },
  scoreColon: {
    fontFamily: "Digital7Mono",
    fontSize: 32,
    color: ScoreBoardTheme.textMuted,
  },
  setsHeader: {
    fontFamily: "Digital7Mono",
    fontSize: 12,
    color: ScoreBoardTheme.textMuted,
    fontVariant: ["tabular-nums"],
    marginBottom: 4,
  },
  liveGamePoints: {
    fontFamily: "Digital7Mono",
    fontSize: 12,
    color: ScoreBoardTheme.onSurfaceVariant,
    fontWeight: "500",
    marginTop: 2,
    fontVariant: ["tabular-nums"],
  },
  startScoreboardBtn: {
    backgroundColor: ScoreBoardTheme.onSurface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
    marginBottom: 16,
  },
  startScoreboardText: {
    color: ScoreBoardTheme.surfaceContainerLowest,
    fontSize: 14,
    fontWeight: "700",
  },
  tabsRow: {
    flexDirection: "row",
    backgroundColor: ScoreBoardTheme.surfaceContainerLow,
    borderRadius: 10,
    padding: 3,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 7,
  },
  tabBtnActive: {
    backgroundColor: ScoreBoardTheme.surfaceContainerHighest,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "500",
    color: ScoreBoardTheme.onSurfaceVariant,
  },
  tabTextActive: {
    color: ScoreBoardTheme.onSurface,
    fontWeight: "600",
  },
  tabContent: {
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#f8fafc",
    marginBottom: 12,
  },
  rulesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  editRulesBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e293b",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  editRulesBtnText: {
    color: "#a5b4fc",
    fontSize: 11,
    fontWeight: "700",
  },
  infoCard: {
    backgroundColor: "#151b2d",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#232d4b",
    padding: 16,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 13,
    color: "#94a3b8",
  },
  infoVal: {
    fontSize: 13,
    fontWeight: "700",
    color: "#f8fafc",
  },
  infoDivider: {
    height: 1,
    backgroundColor: "#1e293b",
  },
  umpireRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  umpireName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#f8fafc",
  },
  umpireSub: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 2,
  },
  appointSection: {
    marginTop: 20,
  },
  selfAssignBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.3)",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
    gap: 8,
  },
  selfAssignBtnText: {
    color: "#38bdf8",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  unassignBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    paddingVertical: 8,
    gap: 6,
  },
  unassignBtnText: {
    color: "#f87171",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  subSectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#94a3b8",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  searchInput: {
    backgroundColor: "#151b2d",
    borderWidth: 1,
    borderColor: "#232d4b",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#f8fafc",
    fontSize: 13,
    marginBottom: 8,
  },
  searchUserItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#151b2d",
    borderWidth: 1,
    borderColor: "#232d4b",
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
  },
  searchUserName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#f8fafc",
  },
  searchUserEmail: {
    fontSize: 11,
    color: "#94a3b8",
  },
  emptyCard: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#151b2d",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#232d4b",
    padding: 32,
    gap: 8,
  },
  emptyText: {
    color: "#64748b",
    fontSize: 13,
    textAlign: "center",
  },
  eventItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#151b2d",
    borderWidth: 1,
    borderColor: "#232d4b",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  eventDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#4edea3",
  },
  eventBody: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  eventText: {
    fontSize: 13,
    color: "#f8fafc",
    fontWeight: "500",
  },
  eventTime: {
    fontSize: 11,
    color: "#64748b",
  },
});
