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
import { SportFavoriteButton } from "@/components/FollowButton";
import { MatchAtmosphereBackground } from "@/components/match/MatchAtmosphereBackground";
import { GroupStandingsView } from "@/components/tournament/GroupStandingsView";
import { TournamentBracketView } from "@/components/tournament/TournamentBracketView";
import { TournamentRosterSection } from "@/components/tournament/TournamentRosterSection";
import { TournamentSettingsModal } from "@/components/tournament/TournamentSettingsModal";
import { calculateStandings, Standing } from "@/lib/standings/groups";
import { ScoreBoardTheme } from "@/constants/theme";
import { supabase } from "@/lib/supabase/client";

export default function TournamentDetailScreen() {
  const { id, tab } = useLocalSearchParams<{ id: string; tab?: string }>();
  const router = useRouter();
  const { t, locale } = useLanguage();
  const { user } = useAuth();
  const { isFollowing, toggleFollow } = useFollow();
  const isPt = locale === "pt";

  const tournamentId = (Array.isArray(id) ? id[0] : id) || "";
  const requestedTab = Array.isArray(tab) ? tab[0] : tab;
  const following = isFollowing(tournamentId, "tournament");

  const [tournament, setTournament] = useState<any | null>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [bracketMatches, setBracketMatches] = useState<any[]>([]);
  const [groups, setGroups] = useState<Record<string, Standing[]>>({});
  const [participants, setParticipants] = useState<any[]>([]);
  const [participantCount, setParticipantCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [generatingBracket, setGeneratingBracket] = useState(false);

  // Tabs: teams (default), standings, group_matches, bracket, settings
  const [activeTab, setActiveTab] = useState<
    "teams" | "group_matches" | "standings" | "bracket" | "settings"
  >("teams");
  const hasGroups = Object.keys(groups).length > 0;

  useEffect(() => {
    if (
      requestedTab === "teams" ||
      requestedTab === "bracket" ||
      requestedTab === "standings" ||
      requestedTab === "group_matches"
    ) {
      setActiveTab(requestedTab);
    } else if (requestedTab === "settings") {
      setActiveTab("settings");
    }
  }, [requestedTab]);

  const fetchTournamentData = useCallback(async () => {
    if (!tournamentId) return;

    try {
      const [tourRes, matchesRes, bracketRes, partsCountRes] = await Promise.all([
        supabase
          .from("tournaments")
          .select("id, name, sport_type, status, visibility, start_date, end_date, organizer_id, settings, signup_schema, created_at, updated_at, organizer:users!organizer_id(username)")
          .eq("id", tournamentId)
          .single(),
        supabase
          .from("matches")
          .select("id, tournament_id, organizer_id, umpire_id, sport_type, status, participants, scores, round_number, match_order, bracket_type, group_label, court, scheduled_at, created_at, tournaments(name)")
          .eq("tournament_id", tournamentId)
          .order("round_number", { ascending: true })
          .order("match_order", { ascending: true }),
        supabase
          .from("bracket_matches")
          .select("id, tournament_id, round_number, match_order, match_id, match:matches(id, tournament_id, organizer_id, umpire_id, sport_type, status, participants, scores, round_number, match_order, bracket_type)")
          .eq("tournament_id", tournamentId)
          .order("round_number", { ascending: true }),
        supabase
          .from("tournament_participants")
          .select("id, name, seed")
          .eq("tournament_id", tournamentId)
          .order("seed", { ascending: true, nullsFirst: false }),
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
      if (bracketRes.data && bracketRes.data.length > 0) {
        setBracketMatches(bracketRes.data);
      } else if (matchesRes.data) {
        const knockoutNodes = matchesRes.data
          .filter((m) => !m.group_label && m.round_number != null)
          .map((m) => ({
            id: m.id,
            round_number: m.round_number,
            match_id: m.id,
            match: m,
          }));

        if (
          knockoutNodes.length === 0 &&
          tourRes.data?.settings?.stage_1?.type === "groups"
        ) {
          const groupLabels = Array.from(
            new Set(
              matchesRes.data
                .filter((m: any) => m.group_label)
                .map((m: any) => String(m.group_label))
            )
          ).sort();

          if (groupLabels.length > 0) {
            const advancePerGroup =
              Number(tourRes.data.settings.stage_1.advance_per_group) || 2;
            const totalAdvancing = groupLabels.length * advancePerGroup;

            let bracketSize = 2;
            while (bracketSize < totalAdvancing) bracketSize *= 2;

            const numRounds = Math.log2(bracketSize);
            const virtualNodes: any[] = [];
            let globalOrder = 1;

            for (let r = 1; r <= numRounds; r++) {
              const matchesInRound = bracketSize / Math.pow(2, r);
              for (let m = 1; m <= matchesInRound; m++) {
                const participants: any[] = [null, null];

                if (r === 1) {
                  const groupIdx =
                    Math.floor((m - 1) / Math.max(1, advancePerGroup / 2)) %
                    groupLabels.length;
                  const nextGroupIdx = (groupIdx + 1) % groupLabels.length;
                  const gA = groupLabels[groupIdx];
                  const gB = groupLabels[nextGroupIdx];
                  const labelA = gA.startsWith("Group ") ? gA : `Group ${gA}`;
                  const labelB = gB.startsWith("Group ") ? gB : `Group ${gB}`;

                  if (m % 2 !== 0) {
                    participants[0] = { name: `1st ${labelA}` };
                    participants[1] = { name: `2nd ${labelB}` };
                  } else {
                    participants[0] = { name: `1st ${labelB}` };
                    participants[1] = { name: `2nd ${labelA}` };
                  }
                } else {
                  const prevRound = virtualNodes.filter(
                    (n) => n.round_number === r - 1
                  );
                  const src1 = prevRound[(m - 1) * 2]?.match?.global_match_order;
                  const src2 = prevRound[(m - 1) * 2 + 1]?.match?.global_match_order;
                  participants[0] = {
                    name: src1 ? `Winner of Match ${src1}` : "TBD",
                  };
                  participants[1] = {
                    name: src2 ? `Winner of Match ${src2}` : "TBD",
                  };
                }

                virtualNodes.push({
                  id: `virtual-${r}-${m}`,
                  round_number: r,
                  match_id: null,
                  match: {
                    status: "scheduled",
                    participants,
                    scores: {},
                    global_match_order: globalOrder++,
                  },
                });
              }
            }

            setBracketMatches(virtualNodes);
          } else {
            setBracketMatches([]);
          }
        } else {
          setBracketMatches(knockoutNodes);
        }
      }
      if (Array.isArray(partsCountRes.data)) {
        setParticipants(partsCountRes.data);
        setParticipantCount(partsCountRes.data.length);
      } else if (typeof partsCountRes.count === "number") {
        setParticipantCount(partsCountRes.count);
      }
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
          <ActivityIndicator size="large" color={ScoreBoardTheme.onSurfaceVariant} />
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
  const isCompleted = tournament.status === "completed";
  const maxTeams = Number(tournament?.settings?.max_teams) || 16;
  const organizerObj = Array.isArray(tournament.organizer)
    ? tournament.organizer[0]
    : tournament.organizer;
  const organizerUsername: string | undefined = organizerObj?.username;

  const formatDateRange = () => {
    const start = tournament.start_date ? new Date(tournament.start_date) : null;
    const end = tournament.end_date ? new Date(tournament.end_date) : null;
    const validStart = start && !isNaN(start.getTime()) ? start : null;
    const validEnd = end && !isNaN(end.getTime()) ? end : null;
    if (!validStart && !validEnd) return null;
    const fmt = (d: Date) =>
      d.toLocaleDateString(isPt ? "pt-PT" : "en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    if (validStart && validEnd) {
      const s = fmt(validStart);
      const e = fmt(validEnd);
      return s === e ? s : `${s} – ${e}`;
    }
    return fmt((validStart || validEnd)!);
  };
  const dateRangeLabel = formatDateRange();
  const isOrganizer = Boolean(
    user?.id && tournament?.organizer_id && user.id === tournament.organizer_id
  );
  const safeActiveTab =
    activeTab === "settings" && !isOrganizer ? "teams" : activeTab;

  const handleGenerateBracket = async () => {
    if (!tournament || !isOrganizer) return;

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
      <MatchAtmosphereBackground sportType={tournament.sport_type} mode="spectator" />
      {/* Main Global TopBar */}
      <TopBar />

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Compact 3-Row Tournament Hero Card */}
        <View style={styles.heroCard}>
          {/* Row 1: Back + @username on left, SportFavoriteButton + Share on right */}
          <View style={styles.heroTopRow}>
            <View style={styles.heroTopLeft}>
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => router.back()}
                accessibilityLabel="Back"
              >
                <Ionicons name="arrow-back" size={18} color={ScoreBoardTheme.onSurface} />
              </TouchableOpacity>

              {organizerUsername ? (
                <TouchableOpacity
                  style={styles.ownerPill}
                  onPress={() =>
                    router.push(`/user/${encodeURIComponent(organizerUsername)}` as any)
                  }
                  activeOpacity={0.75}
                >
                  <Text style={styles.ownerPillText} numberOfLines={1}>
                    @{organizerUsername}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>

            <View style={styles.heroTopRight}>
              <SportFavoriteButton
                entityId={tournamentId}
                entityType="tournament"
                sport={tournament.sport_type}
                size="sm"
              />
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={handleShare}
                accessibilityLabel="Share"
              >
                <Ionicons
                  name="share-social-outline"
                  size={17}
                  color={ScoreBoardTheme.onSurfaceVariant}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Row 2: Centered Tournament Title */}
          <Text
            style={styles.title}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
          >
            {tournament.name}
          </Text>

          {/* Row 3: Centered Metadata (Status, Date Range, Team Count) */}
          <View style={styles.heroMetaRow}>
            <View style={styles.statusPill}>
              {isOngoing && <View style={styles.liveDot} />}
              <Text style={styles.statusPillText}>
                {isOngoing
                  ? isPt
                    ? "A Decorrer"
                    : "Ongoing"
                  : isCompleted
                  ? isPt
                    ? "Terminado"
                    : "Completed"
                  : isPt
                  ? "Pendente"
                  : "Pending"}
              </Text>
            </View>

            {dateRangeLabel ? (
              <View style={styles.metaInfoItem}>
                <Ionicons
                  name="calendar-outline"
                  size={14}
                  color={ScoreBoardTheme.textMuted}
                />
                <Text style={styles.metaInfoText}>{dateRangeLabel}</Text>
              </View>
            ) : null}

            <View style={styles.metaInfoItem}>
              <Ionicons
                name="people-outline"
                size={14}
                color={ScoreBoardTheme.textMuted}
              />
              <Text style={styles.metaInfoText}>
                {participantCount} / {maxTeams}
              </Text>
            </View>
          </View>
        </View>

        {/* Navigation Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsScrollContainer}
          style={styles.tabsScroll}
        >
          <View style={styles.tabsRow}>
            <TouchableOpacity
              style={[styles.tabBtn, safeActiveTab === "teams" && styles.tabBtnActive]}
              onPress={() => setActiveTab("teams")}
              testID="tab-teams"
            >
              <Ionicons
                name="people-outline"
                size={15}
                color={safeActiveTab === "teams" ? ScoreBoardTheme.onSurface : ScoreBoardTheme.textMuted}
              />
              <Text style={[styles.tabText, safeActiveTab === "teams" && styles.tabTextActive]}>
                {isPt ? "Equipas" : "Teams"}
              </Text>
            </TouchableOpacity>

            {hasGroups && (
              <>
                <TouchableOpacity
                  style={[styles.tabBtn, safeActiveTab === "standings" && styles.tabBtnActive]}
                  onPress={() => setActiveTab("standings")}
                >
                  <Ionicons
                    name="bar-chart-outline"
                    size={15}
                    color={safeActiveTab === "standings" ? ScoreBoardTheme.onSurface : ScoreBoardTheme.textMuted}
                  />
                  <Text style={[styles.tabText, safeActiveTab === "standings" && styles.tabTextActive]}>
                    {isPt ? "Classificação" : "Standings"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.tabBtn, safeActiveTab === "group_matches" && styles.tabBtnActive]}
                  onPress={() => setActiveTab("group_matches")}
                >
                  <Ionicons
                    name="tennisball-outline"
                    size={15}
                    color={safeActiveTab === "group_matches" ? ScoreBoardTheme.onSurface : ScoreBoardTheme.textMuted}
                  />
                  <Text style={[styles.tabText, safeActiveTab === "group_matches" && styles.tabTextActive]}>
                    {isPt ? "Jogos" : "Matches"}
                  </Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity
              style={[styles.tabBtn, safeActiveTab === "bracket" && styles.tabBtnActive]}
              onPress={() => setActiveTab("bracket")}
              testID="tab-bracket"
            >
              <Ionicons
                name="git-network-outline"
                size={15}
                color={safeActiveTab === "bracket" ? ScoreBoardTheme.onSurface : ScoreBoardTheme.textMuted}
              />
              <Text style={[styles.tabText, safeActiveTab === "bracket" && styles.tabTextActive]}>
                {isPt ? "Chave" : "Bracket"}
              </Text>
            </TouchableOpacity>

            {isOrganizer && (
              <TouchableOpacity
                style={[styles.tabBtn, safeActiveTab === "settings" && styles.tabBtnActive]}
                onPress={() => {
                  setActiveTab("settings");
                  setSettingsModalVisible(true);
                }}
                testID="tab-settings"
              >
                <Ionicons
                  name="settings-outline"
                  size={15}
                  color={safeActiveTab === "settings" ? ScoreBoardTheme.onSurface : ScoreBoardTheme.textMuted}
                />
                <Text style={[styles.tabText, safeActiveTab === "settings" && styles.tabTextActive]}>
                  {isPt ? "Definições" : "Settings"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>

        {/* TAB 1: TEAMS */}
        {safeActiveTab === "teams" && (
          <View style={styles.tabContent}>
            <TournamentRosterSection
              tournamentId={tournamentId}
              initialTournament={tournament}
              embedded
              onTeamsChanged={fetchTournamentData}
            />
          </View>
        )}

        {/* TAB 1B: GROUP MATCHES */}
        {safeActiveTab === "group_matches" && (
          <View style={styles.tabContent}>
            {Object.keys(groups)
              .sort()
              .map((grp) => {
                const grpMatches = matches.filter((m) => m.group_label === grp);
                return (
                  <View key={grp} style={{ marginBottom: 16 }}>
                    <Text style={styles.groupHeading}>{grp}</Text>
                    {grpMatches.length === 0 ? (
                      <View style={styles.emptyCard}>
                        <Text style={styles.emptySubtitle}>
                          {isPt ? "Sem jogos neste grupo." : "No matches in this group."}
                        </Text>
                      </View>
                    ) : (
                      grpMatches.map((m) => <MatchCard key={m.id} match={m} />)
                    )}
                  </View>
                );
              })}
          </View>
        )}

        {/* TAB 2: STANDINGS */}
        {safeActiveTab === "standings" && (
          <View style={styles.tabContent}>
            <GroupStandingsView groups={groups} />
          </View>
        )}

        {/* TAB 3: BRACKET */}
        {safeActiveTab === "bracket" && (
          <View style={styles.tabContent}>
            {isOrganizer && (
              <TouchableOpacity
                style={[styles.organizerGenerateBtn, { marginBottom: 12 }, generatingBracket && { opacity: 0.7 }]}
                onPress={handleGenerateBracket}
                disabled={generatingBracket}
                testID="organizer-generate-btn"
              >
                {generatingBracket ? (
                  <ActivityIndicator size="small" color={ScoreBoardTheme.surfaceContainerLowest} />
                ) : (
                  <>
                    <Ionicons name="sparkles" size={15} color={ScoreBoardTheme.surfaceContainerLowest} style={{ marginRight: 4 }} />
                    <Text style={styles.organizerGenerateBtnText}>
                      {isPending
                        ? isPt ? "Gerar Chave" : "Generate Bracket"
                        : isPt ? "Regenerar Chave" : "Regenerate Bracket"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
            <TournamentBracketView bracketMatches={bracketMatches} tournament={tournament} />
          </View>
        )}

        {/* TAB 4: SETTINGS (Organizer only) */}
        {isOrganizer && safeActiveTab === "settings" && (
          <View style={styles.tabContent}>
            <View style={styles.rosterSummaryCard}>
              <Text style={styles.rosterSummaryTitle}>
                {isPt ? "Definições do Torneio" : "Tournament Settings"}
              </Text>
              <Text style={[styles.rosterSummarySub, { marginTop: 4, marginBottom: 14 }]}>
                {isPt
                  ? `Visibilidade: ${tournament.visibility || "public"} · Máx. Equipas: ${Number(tournament?.settings?.max_teams) || 16} · Campos: ${Number(tournament?.settings?.number_of_courts) || 1}`
                  : `Visibility: ${tournament.visibility || "public"} · Max Teams: ${Number(tournament?.settings?.max_teams) || 16} · Courts: ${Number(tournament?.settings?.number_of_courts) || 1}`}
              </Text>
              <TouchableOpacity
                style={styles.manageRosterBtn}
                onPress={() => setSettingsModalVisible(true)}
                testID="organizer-settings-btn"
              >
                <Ionicons name="settings-outline" size={14} color={ScoreBoardTheme.surfaceContainerLowest} />
                <Text style={styles.manageRosterBtnText}>
                  {isPt ? "Editar Definições" : "Edit Settings"}
                </Text>
              </TouchableOpacity>
            </View>
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
    backgroundColor: ScoreBoardTheme.background,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: ScoreBoardTheme.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  heroCard: {
    backgroundColor: ScoreBoardTheme.surfaceContainer,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  heroTopLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  heroTopRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  ownerPill: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: ScoreBoardTheme.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    justifyContent: "center",
    maxWidth: 180,
  },
  ownerPillText: {
    fontSize: 12,
    fontWeight: "500",
    color: ScoreBoardTheme.onSurfaceVariant,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: ScoreBoardTheme.onSurface,
    textAlign: "center",
    lineHeight: 26,
  },
  heroMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: ScoreBoardTheme.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: ScoreBoardTheme.liveCrimson,
  },
  statusPillText: {
    fontSize: 11.5,
    fontWeight: "500",
    color: ScoreBoardTheme.onSurface,
  },
  metaInfoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaInfoText: {
    fontSize: 11.5,
    color: ScoreBoardTheme.textMuted,
    fontWeight: "500",
  },
  actionButtonsRow: {
    flexDirection: "row",
    gap: 10,
  },
  signupActionBtn: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: ScoreBoardTheme.onSurface,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  signupActionText: {
    color: ScoreBoardTheme.surfaceContainerLowest,
    fontSize: 13,
    fontWeight: "700",
  },
  teamsActionBtn: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: ScoreBoardTheme.surfaceContainerHighest,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  teamsActionText: {
    color: ScoreBoardTheme.onSurface,
    fontSize: 13,
    fontWeight: "700",
  },
  organizerBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: ScoreBoardTheme.surfaceContainerHighest,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  organizerBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: ScoreBoardTheme.onSurfaceVariant,
    letterSpacing: 0.5,
  },
  organizerPanel: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: ScoreBoardTheme.borderSubtle,
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
    color: ScoreBoardTheme.onSurfaceVariant,
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
    backgroundColor: ScoreBoardTheme.surfaceContainerHighest,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 10,
    gap: 6,
  },
  organizerActionBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: ScoreBoardTheme.onSurfaceVariant,
  },
  organizerGenerateBtn: {
    flex: 1.2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ScoreBoardTheme.onSurface,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 10,
    gap: 4,
  },
  organizerGenerateBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: ScoreBoardTheme.surfaceContainerLowest,
  },
  tabsScroll: {
    marginBottom: 16,
  },
  tabsScrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
  },
  tabsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: ScoreBoardTheme.surfaceContainerLowest,
    borderRadius: 12,
    padding: 4,
    gap: 4,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
  },
  tabBtn: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 14,
    alignItems: "center",
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: ScoreBoardTheme.surfaceContainer,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "500",
    color: ScoreBoardTheme.textMuted,
  },
  tabTextActive: {
    color: ScoreBoardTheme.onSurface,
    fontWeight: "600",
  },
  tabContent: {
    marginTop: 4,
  },
  groupHeading: {
    fontSize: 13,
    fontWeight: "700",
    color: ScoreBoardTheme.onSurfaceVariant,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 2,
  },
  emptyCard: {
    backgroundColor: ScoreBoardTheme.surfaceContainer,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    padding: 32,
    alignItems: "center",
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: ScoreBoardTheme.onSurface,
    marginTop: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: ScoreBoardTheme.textMuted,
    textAlign: "center",
  },
  backBtn: {
    marginTop: 16,
    backgroundColor: ScoreBoardTheme.surfaceContainerHighest,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backBtnText: {
    color: "#f8fafc",
    fontWeight: "600",
  },
  rosterSummaryCard: {
    backgroundColor: ScoreBoardTheme.surfaceContainer,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    padding: 16,
  },
  rosterSummaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 14,
  },
  rosterSummaryTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: ScoreBoardTheme.onSurface,
  },
  rosterSummarySub: {
    fontSize: 12,
    color: ScoreBoardTheme.textMuted,
    marginTop: 2,
  },
  manageRosterBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: ScoreBoardTheme.onSurface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  manageRosterBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: ScoreBoardTheme.surfaceContainerLowest,
  },
  emptyRosterInline: {
    alignItems: "center",
    paddingVertical: 20,
    gap: 8,
  },
  rosterList: {
    gap: 8,
  },
  rosterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: ScoreBoardTheme.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  rosterSeed: {
    fontSize: 12,
    fontWeight: "700",
    color: ScoreBoardTheme.textMuted,
    width: 22,
  },
  rosterTeamName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: ScoreBoardTheme.onSurface,
  },
});
