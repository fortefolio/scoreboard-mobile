import React, { useState, useEffect, useCallback, useMemo } from "react";
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
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/components/AuthProvider";
import { useLanguage } from "@/lib/i18n";
import { useFollow } from "@/lib/hooks/useFollow";
import { TopBar } from "@/components/TopBar";
import { FollowButton } from "@/components/FollowButton";
import { RuleModal } from "@/components/RuleModal";
import { supabase } from "@/lib/supabase/client";
import { Colors, Spacing } from "@/constants/theme";

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

  // Fetch match details and events
  const fetchMatch = useCallback(async () => {
    if (!matchIdStr) return;
    try {
      const [matchRes, eventsRes] = await Promise.all([
        supabase
          .from("matches")
          .select("*, tournaments(name)")
          .eq("id", matchIdStr)
          .single(),
        supabase
          .from("match_events")
          .select("*")
          .eq("match_id", matchIdStr)
          .order("created_at", { ascending: false }),
      ]);

      if (matchRes.data) {
        setMatch(matchRes.data);
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
  const isOrganizer = user && match?.organizer_id === user.id;
  const isUmpire =
    user && match?.umpire_id === user.id && match?.umpire_invite_status === "accepted";
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
      Alert.alert("Erro", "Não foi possível iniciar o marcador: " + e.message);
    } finally {
      setStartingMatch(false);
    }
  };

  // Search Umpires
  const searchUmpires = async (query: string) => {
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
      Alert.alert(locale === "pt" ? "Erro" : "Error", e.message);
    }
  };

  // Save Rules
  const handleSaveRules = async (rules: Record<string, any>, court: string | null) => {
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

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#4f46e5" />
          <Text style={styles.loadingText}>{t("common.loading") || "A carregar jogo..."}</Text>
        </View>
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
  const renderHeaderScores = () => {
    const scores = match.scores;
    if (match.sport_type === "Football") {
      const gA = scores?.football?.goals?.[0] ?? scores?.goals?.[0] ?? 0;
      const gB = scores?.football?.goals?.[1] ?? scores?.goals?.[1] ?? 0;
      return (
        <View style={styles.bigScoreRow}>
          <Text style={styles.bigScore}>{gA}</Text>
          <Text style={styles.scoreColon}>:</Text>
          <Text style={styles.bigScore}>{gB}</Text>
        </View>
      );
    }

    if (match.sport_type === "Basketball") {
      const pA = scores?.basketball?.total_points?.[0] ?? scores?.total_points?.[0] ?? 0;
      const pB = scores?.basketball?.total_points?.[1] ?? scores?.total_points?.[1] ?? 0;
      return (
        <View style={styles.bigScoreRow}>
          <Text style={styles.bigScore}>{pA}</Text>
          <Text style={styles.scoreColon}>:</Text>
          <Text style={styles.bigScore}>{pB}</Text>
        </View>
      );
    }

    if (match.sport_type === "Tennis" || match.sport_type === "Padel") {
      const sets = scores?.tennis?.sets || [];
      const games = scores?.tennis?.games || [0, 0];
      const points = scores?.tennis?.points || [0, 0];
      const TENNIS_PTS = ["0", "15", "30", "40", "AD"];
      const ptA = TENNIS_PTS[points[0]] || String(points[0]);
      const ptB = TENNIS_PTS[points[1]] || String(points[1]);

      return (
        <View style={{ alignItems: "center" }}>
          {sets.length > 0 && (
            <Text style={styles.setsHeader}>
              Sets: {sets.map((s: any) => `${s[0]}-${s[1]}`).join("   ")}
            </Text>
          )}
          <View style={styles.bigScoreRow}>
            <Text style={styles.bigScore}>{games[0]}</Text>
            <Text style={styles.scoreColon}>:</Text>
            <Text style={styles.bigScore}>{games[1]}</Text>
          </View>
          {isOngoing && (
            <Text style={styles.liveGamePoints}>
              Pontos: {ptA} - {ptB}
            </Text>
          )}
        </View>
      );
    }

    if (match.sport_type === "Volleyball" || match.sport_type === "Beach Volleyball") {
      const sets = scores?.volleyball?.sets || [];
      const pts = scores?.volleyball?.current_points || [0, 0];
      const setsA = sets.filter((s: any) => s[0] > s[1]).length;
      const setsB = sets.filter((s: any) => s[1] > s[0]).length;

      return (
        <View style={{ alignItems: "center" }}>
          <View style={styles.bigScoreRow}>
            <Text style={styles.bigScore}>{setsA}</Text>
            <Text style={styles.scoreColon}>:</Text>
            <Text style={styles.bigScore}>{setsB}</Text>
          </View>
          {isOngoing && (
            <Text style={styles.liveGamePoints}>
              Set {sets.length + 1}: {pts[0]} - {pts[1]}
            </Text>
          )}
        </View>
      );
    }

    return (
      <View style={styles.bigScoreRow}>
        <Text style={styles.bigScore}>0</Text>
        <Text style={styles.scoreColon}>:</Text>
        <Text style={styles.bigScore}>0</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      {/* Main Global TopBar */}
      <TopBar />

      {/* Top Header Bar */}
      <View style={styles.topNav}>
        <TouchableOpacity
          style={styles.navIconBtn}
          onPress={() => router.back()}
          testID="match-detail-back-btn"
        >
          <Ionicons name="arrow-back" size={20} color="#dce1fb" />
        </TouchableOpacity>

        <Text style={styles.navTitle} numberOfLines={1}>
          {match.tournaments?.name || match.sport_type}
        </Text>

        <View style={styles.navActions}>
          <FollowButton
            entityId={matchIdStr}
            entityType="match"
            size={16}
          />

          <TouchableOpacity style={styles.navIconBtn} onPress={handleShare}>
            <Ionicons name="share-social-outline" size={20} color="#dce1fb" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Match Header Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroMetaRow}>
            <View style={styles.sportBadge}>
              <Text style={styles.sportBadgeText}>{match.sport_type}</Text>
            </View>

            {isOngoing ? (
              <View style={styles.liveIndicator}>
                <View style={styles.livePulse} />
                <Text style={styles.liveText}>{t("status.live") || "EM DIRETO"}</Text>
              </View>
            ) : (
              <Text style={styles.statusBadge}>
                {isCompleted
                  ? t("status.completed") || "TERMINADO"
                  : t("status.scheduled") || "AGENDADO"}
              </Text>
            )}

            {match.court && (
              <Text style={styles.courtBadge} numberOfLines={1}>
                📍 {match.court}
              </Text>
            )}
          </View>

          {/* Teams vs Score Display */}
          <View style={styles.matchupRow}>
            <View style={styles.teamSide}>
              <View style={styles.teamAvatar}>
                <Text style={styles.avatarLetter}>
                  {(teamAName[0] || "A").toUpperCase()}
                </Text>
              </View>
              <Text style={styles.teamTitle} numberOfLines={2}>
                {teamAName}
              </Text>
            </View>

            <View style={styles.scoreCenter}>{renderHeaderScores()}</View>

            <View style={styles.teamSide}>
              <View style={styles.teamAvatar}>
                <Text style={styles.avatarLetter}>
                  {(teamBName[0] || "B").toUpperCase()}
                </Text>
              </View>
              <Text style={styles.teamTitle} numberOfLines={2}>
                {teamBName}
              </Text>
            </View>
          </View>
        </View>

        {/* Start Scoreboard Handheld Button */}
        {canStart && !isCompleted && (
          <TouchableOpacity
            style={styles.startScoreboardBtn}
            onPress={handleStartScoreboard}
            disabled={startingMatch}
            activeOpacity={0.85}
          >
            {startingMatch ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Ionicons name="play-circle" size={24} color="#ffffff" />
                <Text style={styles.startScoreboardText}>
                  {match.status === "scheduled"
                    ? t("match.startScoreboardUpper") || "INICIAR MARCADOR"
                    : t("match.openScoreboardUpper") || "ABRIR CONSOLA DE ÁRBITRO"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

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

        {/* TAB 1: SCORE PROGRESS & EVENTS */}
        {activeTab === "progress" && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>
              {t("match.pointHistoryEvents") || t("match.scoreProgress")}
            </Text>

            {events.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="analytics-outline" size={36} color="#475569" />
                <Text style={styles.emptyText}>{t("match.noPointsRecorded")}</Text>
              </View>
            ) : (
              events.map((ev, idx) => {
                const data = ev.event_data || {};
                const evType = data.type || "point";
                return (
                  <View key={ev.id || idx} style={styles.eventItem}>
                    <View style={styles.eventDot} />
                    <View style={styles.eventBody}>
                      <Text style={styles.eventText}>
                        {data.description ||
                          t("match.pointRecordedFor", {
                            team: data.scoring_side === 0 ? teamAName : teamBName,
                          })}
                      </Text>
                      <Text style={styles.eventTime}>
                        {new Date(ev.created_at).toLocaleTimeString([], {
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
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

                {searchingUmpire && <ActivityIndicator color="#4f46e5" style={{ margin: 8 }} />}

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

      {/* Rules Modal */}
      <RuleModal
        visible={ruleModalVisible}
        onClose={() => setRuleModalVisible(false)}
        onSave={handleSaveRules}
        sportType={match.sport_type}
        initialRules={match.settings}
        initialCourt={match.court}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0c1324",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    color: "#94a3b8",
    fontSize: 14,
  },
  errorTitle: {
    fontSize: 16,
    color: "#f8fafc",
    fontWeight: "700",
    marginTop: 12,
    marginBottom: 16,
  },
  backBtn: {
    backgroundColor: "#1e293b",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backBtnText: {
    color: "#f8fafc",
    fontWeight: "600",
  },
  topNav: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
  },
  navTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#cbd5e1",
    maxWidth: "60%",
    textAlign: "center",
  },
  navIconBtn: {
    padding: 6,
  },
  navActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  heroCard: {
    backgroundColor: "#151b2d",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#232d4b",
    padding: 18,
    marginBottom: 16,
  },
  heroMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
    gap: 8,
  },
  sportBadge: {
    backgroundColor: "rgba(79, 70, 229, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(79, 70, 229, 0.3)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  sportBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#a5b4fc",
    textTransform: "uppercase",
  },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(78, 222, 163, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 5,
  },
  livePulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#4edea3",
  },
  liveText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#4edea3",
  },
  statusBadge: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748b",
    textTransform: "uppercase",
  },
  courtBadge: {
    fontSize: 11,
    color: "#94a3b8",
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
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#0d1322",
    borderWidth: 1,
    borderColor: "#232d4b",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  avatarLetter: {
    fontSize: 20,
    fontWeight: "800",
    color: "#a5b4fc",
  },
  teamTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#f8fafc",
    textAlign: "center",
    lineHeight: 18,
  },
  scoreCenter: {
    paddingHorizontal: 10,
    alignItems: "center",
  },
  bigScoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  bigScore: {
    fontFamily: "Digital7",
    fontSize: 48,
    color: "#4edea3",
    lineHeight: 52,
  },
  scoreColon: {
    fontFamily: "Digital7",
    fontSize: 36,
    color: "#64748b",
  },
  setsHeader: {
    fontSize: 12,
    color: "#94a3b8",
    fontFamily: "monospace",
    marginBottom: 4,
  },
  liveGamePoints: {
    fontSize: 12,
    color: "#fbbf24",
    fontWeight: "700",
    marginTop: 2,
  },
  startScoreboardBtn: {
    backgroundColor: "#4f46e5",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 14,
    gap: 10,
    marginBottom: 18,
    shadowColor: "#4f46e5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  startScoreboardText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 1,
  },
  tabsRow: {
    flexDirection: "row",
    backgroundColor: "#151b2d",
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#232d4b",
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: "center",
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: "#0c1324",
    borderWidth: 1,
    borderColor: "#4f46e5",
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748b",
  },
  tabTextActive: {
    color: "#f8fafc",
    fontWeight: "700",
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
