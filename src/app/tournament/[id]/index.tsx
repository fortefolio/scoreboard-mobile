import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Share,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/components/AuthProvider";
import { useLanguage } from "@/lib/i18n";
import { useFollow } from "@/lib/hooks/useFollow";
import { MatchCard } from "@/components/MatchCard";
import { TopBar } from "@/components/TopBar";
import { FollowButton } from "@/components/FollowButton";
import { GroupStandingsView } from "@/components/tournament/GroupStandingsView";
import { TournamentBracketView } from "@/components/tournament/TournamentBracketView";
import { TournamentSettingsModal } from "@/components/tournament/TournamentSettingsModal";
import { calculateStandings, Standing } from "@/lib/standings/groups";
import { supabase } from "@/lib/supabase/client";

export default function TournamentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t, locale } = useLanguage();
  const { user } = useAuth();
  const { isFollowing, toggleFollow } = useFollow();
  const isPt = locale === "pt";

  const tournamentId = (Array.isArray(id) ? id[0] : id) || "";
  const following = isFollowing(tournamentId, "tournament");

  const [tournament, setTournament] = useState<any | null>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [bracketMatches, setBracketMatches] = useState<any[]>([]);
  const [groups, setGroups] = useState<Record<string, Standing[]>>({});
  const [participantCount, setParticipantCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [generatingBracket, setGeneratingBracket] = useState(false);

  // Tabs: matches, standings, bracket
  const [activeTab, setActiveTab] = useState<"matches" | "standings" | "bracket">("matches");

  const fetchTournamentData = useCallback(async () => {
    if (!tournamentId) return;

    try {
      const [tourRes, matchesRes, bracketRes, partsCountRes] = await Promise.all([
        supabase.from("tournaments").select("*").eq("id", tournamentId).single(),
        supabase
          .from("matches")
          .select("*, tournaments(name)")
          .eq("tournament_id", tournamentId)
          .order("round_number", { ascending: true })
          .order("match_order", { ascending: true }),
        supabase
          .from("bracket_matches")
          .select("*, match:matches(*)")
          .eq("tournament_id", tournamentId)
          .order("round_number", { ascending: true }),
        supabase
          .from("tournament_participants")
          .select("id", { count: "exact", head: true })
          .eq("tournament_id", tournamentId),
      ]);

      if (tourRes.data) setTournament(tourRes.data);
      if (matchesRes.data) {
        setMatches(matchesRes.data);

        // Calculate group standings client-side if group matches exist
        const groupMatches = matchesRes.data.filter((m) => m.group_label);
        if (groupMatches.length > 0) {
          const rawStandings = calculateStandings(groupMatches) as Standing[];
          const grouped = rawStandings.reduce((acc: any, row: Standing) => {
            if (!acc[row.group_label]) acc[row.group_label] = [];
            acc[row.group_label].push(row);
            return acc;
          }, {});

          Object.keys(grouped).forEach((label) => {
            grouped[label].sort(
              (a: Standing, b: Standing) => b.wins - a.wins || b.point_diff - a.point_diff
            );
          });
          setGroups(grouped);
        }
      }
      if (bracketRes.data) setBracketMatches(bracketRes.data);
      if (typeof partsCountRes.count === "number") setParticipantCount(partsCountRes.count);
    } catch (e) {
      console.warn("Tournament detail load error:", e);
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    fetchTournamentData();

    const channelId = `tournament-hub-${tournamentId}-${Math.random().toString(36).slice(2, 9)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches", filter: `tournament_id=eq.${tournamentId}` },
        () => {
          fetchTournamentData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTournamentData, tournamentId]);

  const handleShare = async () => {
    try {
      const shareUrl = `https://scoreboard.app/tournament/${tournamentId}`;
      await Share.share({
        message: `Acompanha o torneio ${tournament?.name || "Torneio"} no ScoreBoard: ${shareUrl}`,
        url: shareUrl,
      });
    } catch (e) {
      console.warn("Share error:", e);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#4f46e5" />
        </View>
      </SafeAreaView>
    );
  }

  if (!tournament) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
          <Text style={styles.emptyTitle}>{t("tournament.notFound") || "Torneio não encontrado"}</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>{t("common.back") || "Voltar"}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isPending = tournament.status === "pending";
  const isOngoing = tournament.status === "ongoing";
  const isOrganizer = Boolean(user && tournament && user.id === tournament.organizer_id);

  const handleGenerateBracket = async () => {
    if (!tournament) return;

    Alert.alert(
      isPt ? "Gerar Competição" : "Generate Tournament",
      isPt
        ? "Deseja gerar a chave/fase de grupos com base nas equipas inscritas?"
        : "Generate the bracket/group stage for all registered teams?",
      [
        { text: isPt ? "Cancelar" : "Cancel", style: "cancel" },
        {
          text: isPt ? "Gerar" : "Generate",
          onPress: async () => {
            setGeneratingBracket(true);
            try {
              const { data: partData, error: partError } = await supabase
                .from("tournament_participants")
                .select("name")
                .eq("tournament_id", tournamentId)
                .order("seed", { ascending: true, nullsFirst: false });

              if (partError) throw partError;

              const teamNames = partData?.map((p: any) => p.name) || [];
              if (teamNames.length < 2) {
                Alert.alert(
                  isPt ? "Equipas Insuficientes" : "Insufficient Teams",
                  isPt
                    ? "É necessário ter pelo menos 2 equipas inscritas para gerar a competição."
                    : "At least 2 teams are required to generate the tournament."
                );
                setGeneratingBracket(false);
                return;
              }

              const { error: invokeError } = await supabase.functions.invoke("generate-tournament-bracket", {
                body: {
                  tournament_id: tournament.id,
                  organizer_id: tournament.organizer_id,
                  sport_type: tournament.sport_type,
                  teams: teamNames,
                  settings: tournament.settings,
                },
              });

              if (invokeError) throw invokeError;

              Alert.alert(
                isPt ? "Sucesso" : "Success",
                isPt ? "Chaveamento gerado com sucesso!" : "Bracket generated successfully!"
              );
              fetchTournamentData();
            } catch (err: any) {
              Alert.alert(
                isPt ? "Erro ao Gerar" : "Generation Error",
                err?.message || (isPt ? "Ocorreu um erro ao gerar a chave." : "Failed to generate bracket.")
              );
            } finally {
              setGeneratingBracket(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      {/* Main Global TopBar */}
      <TopBar />

      {/* Top Navigation */}
      <View style={styles.topNav}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#dce1fb" />
        </TouchableOpacity>

        <Text style={styles.navTitle} numberOfLines={1}>
          {tournament.name}
        </Text>

        <View style={styles.navActions}>
          <FollowButton
            entityId={tournamentId}
            entityType="tournament"
            size={16}
          />

          <TouchableOpacity style={styles.iconBtn} onPress={handleShare}>
            <Ionicons name="share-social-outline" size={20} color="#dce1fb" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Tournament Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.metaRow}>
            <View style={styles.sportBadge}>
              <Text style={styles.sportBadgeText}>{tournament.sport_type}</Text>
            </View>

            {isOrganizer && (
              <View style={styles.organizerBadge}>
                <Ionicons name="shield-checkmark" size={13} color="#818cf8" style={{ marginRight: 4 }} />
                <Text style={styles.organizerBadgeText}>
                  {isPt ? "ORGANIZADOR" : "ORGANIZER"}
                </Text>
              </View>
            )}

            {isOngoing ? (
              <View style={styles.liveIndicator}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>{t("status.live") || "A DECORRER"}</Text>
              </View>
            ) : (
              <Text style={styles.statusBadge}>
                {tournament.status === "completed"
                  ? t("status.completed") || "TERMINADO"
                  : t("status.scheduled") || "INSCRIÇÕES ABERTAS"}
              </Text>
            )}
          </View>

          <Text style={styles.title}>{tournament.name}</Text>

          {/* Quick Action Buttons: Inscrição & Equipas */}
          <View style={styles.actionButtonsRow}>
            {isPending && (
              <TouchableOpacity
                style={styles.signupActionBtn}
                onPress={() => router.push(`/tournament/${tournamentId}/signup` as any)}
              >
                <Ionicons name="person-add" size={16} color="#ffffff" />
                <Text style={styles.signupActionText}>{t("tournament.registerTeam") || "Inscrever Equipa"}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.teamsActionBtn}
              onPress={() => router.push(`/tournament/${tournamentId}/teams` as any)}
            >
              <Ionicons name="people" size={16} color="#a5b4fc" />
              <Text style={styles.teamsActionText}>
                {participantCount} Equipas
              </Text>
            </TouchableOpacity>
          </View>

          {/* Organizer Control Panel */}
          {isOrganizer && (
            <View style={styles.organizerPanel} testID="organizer-controls-section">
              <View style={styles.organizerPanelHeader}>
                <Ionicons name="construct-outline" size={15} color="#818cf8" />
                <Text style={styles.organizerPanelTitle}>
                  {isPt ? "Painel de Gestão do Organizador" : "Organizer Control Panel"}
                </Text>
              </View>

              <View style={styles.organizerButtonsRow}>
                <TouchableOpacity
                  style={styles.organizerActionBtn}
                  onPress={() => setSettingsModalVisible(true)}
                  testID="organizer-settings-btn"
                >
                  <Ionicons name="settings-outline" size={16} color="#cbd5e1" />
                  <Text style={styles.organizerActionBtnText}>
                    {isPt ? "Definições" : "Settings"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.organizerActionBtn}
                  onPress={() => router.push(`/tournament/${tournamentId}/teams` as any)}
                  testID="organizer-teams-btn"
                >
                  <Ionicons name="people-outline" size={16} color="#cbd5e1" />
                  <Text style={styles.organizerActionBtnText}>
                    {isPt ? "Equipas" : "Teams"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.organizerGenerateBtn, generatingBracket && { opacity: 0.7 }]}
                  onPress={handleGenerateBracket}
                  disabled={generatingBracket}
                  testID="organizer-generate-btn"
                >
                  {generatingBracket ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Ionicons name="sparkles" size={15} color="#ffffff" style={{ marginRight: 4 }} />
                      <Text style={styles.organizerGenerateBtnText}>
                        {isPending
                          ? isPt ? "Gerar Chave" : "Generate"
                          : isPt ? "Regenerar" : "Regenerate"}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Navigation Tabs */}
        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === "matches" && styles.tabBtnActive]}
            onPress={() => setActiveTab("matches")}
          >
            <Text style={[styles.tabText, activeTab === "matches" && styles.tabTextActive]}>
              Jogos ({matches.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === "standings" && styles.tabBtnActive]}
            onPress={() => setActiveTab("standings")}
          >
            <Text style={[styles.tabText, activeTab === "standings" && styles.tabTextActive]}>
              Classificação
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === "bracket" && styles.tabBtnActive]}
            onPress={() => setActiveTab("bracket")}
          >
            <Text style={[styles.tabText, activeTab === "bracket" && styles.tabTextActive]}>
              Chave (Brackets)
            </Text>
          </TouchableOpacity>
        </View>

        {/* TAB 1: MATCHES */}
        {activeTab === "matches" && (
          <View style={styles.tabContent}>
            {matches.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="tennisball-outline" size={40} color="#475569" />
                <Text style={styles.emptyTitle}>{t("tournament.noScheduledMatches") || "Nenhum jogo agendado"}</Text>
                <Text style={styles.emptySubtitle}>
                  O calendário de jogos deste torneio ainda não foi publicado.
                </Text>
              </View>
            ) : (
              matches.map((m) => <MatchCard key={m.id} match={m} />)
            )}
          </View>
        )}

        {/* TAB 2: STANDINGS */}
        {activeTab === "standings" && (
          <View style={styles.tabContent}>
            <GroupStandingsView groups={groups} />
          </View>
        )}

        {/* TAB 3: BRACKET */}
        {activeTab === "bracket" && (
          <View style={styles.tabContent}>
            <TournamentBracketView bracketMatches={bracketMatches} />
          </View>
        )}
      </ScrollView>

      {tournament && isOrganizer && (
        <TournamentSettingsModal
          visible={settingsModalVisible}
          onClose={() => setSettingsModalVisible(false)}
          tournament={tournament}
          onUpdateSuccess={fetchTournamentData}
          onDeleteSuccess={() => {
            setSettingsModalVisible(false);
            router.replace("/(tabs)/my-tournaments" as any);
          }}
        />
      )}
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
    fontSize: 15,
    fontWeight: "700",
    color: "#f8fafc",
    maxWidth: "60%",
    textAlign: "center",
  },
  iconBtn: {
    padding: 4,
  },
  navActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  heroCard: {
    backgroundColor: "#151b2d",
    borderWidth: 1,
    borderColor: "#232d4b",
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
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
    fontWeight: "800",
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
  liveDot: {
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
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#f8fafc",
    marginBottom: 16,
    lineHeight: 28,
  },
  actionButtonsRow: {
    flexDirection: "row",
    gap: 10,
  },
  signupActionBtn: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#4f46e5",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  signupActionText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  teamsActionBtn: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#1e293b",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  teamsActionText: {
    color: "#f8fafc",
    fontSize: 13,
    fontWeight: "700",
  },
  organizerBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(99, 102, 241, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.35)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  organizerBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#a5b4fc",
    letterSpacing: 0.5,
  },
  organizerPanel: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
  },
  organizerPanelHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  organizerPanelTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#a5b4fc",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  organizerButtonsRow: {
    flexDirection: "row",
    gap: 8,
  },
  organizerActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 10,
    gap: 6,
  },
  organizerActionBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#cbd5e1",
  },
  organizerGenerateBtn: {
    flex: 1.2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4f46e5",
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 10,
    gap: 4,
  },
  organizerGenerateBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#ffffff",
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
    fontSize: 12,
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
  emptyCard: {
    backgroundColor: "#151b2d",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#232d4b",
    padding: 32,
    alignItems: "center",
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#f8fafc",
    marginTop: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#64748b",
    textAlign: "center",
  },
  backBtn: {
    marginTop: 16,
    backgroundColor: "#1e293b",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backBtnText: {
    color: "#f8fafc",
    fontWeight: "600",
  },
});
