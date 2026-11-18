import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { TopBar } from "@/components/TopBar";
import { WorkspaceTabs } from "@/components/WorkspaceTabs";
import { FeedHeader } from "@/components/FeedHeader";
import { MatchAtmosphereBackground } from "@/components/match/MatchAtmosphereBackground";
import { TournamentCard } from "@/components/TournamentCard";
import { Pagination } from "@/components/Pagination";
import { CreateTournamentModal } from "@/components/tournament/CreateTournamentModal";
import { AuthModal } from "@/components/AuthModal";
import { useAuth } from "@/components/AuthProvider";
import { ScoreBoardTheme } from "@/constants/theme";
import { useLanguage } from "@/lib/i18n";
import { supabase } from "@/lib/supabase/client";

const TOURNAMENTS_PER_PAGE = 9;

export default function MyTournamentsScreen() {
  const { t, locale } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const isPt = locale === "pt";

  const [tournaments, setTournaments] = useState<any[]>([]);
  const [subscriptionTier, setSubscriptionTier] = useState<string>("free");
  const [selectedSport, setSelectedSport] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [viewMode, setViewMode] = useState<"list" | "cards">("list");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [createModalVisible, setCreateModalVisible] = useState<boolean>(false);
  const [authModalVisible, setAuthModalVisible] = useState<boolean>(false);

  const fetchMyTournaments = useCallback(async () => {
    if (!user) {
      setTournaments([]);
      setSubscriptionTier("free");
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const [tRes, uRes] = await Promise.all([
        supabase
          .from("tournaments")
          .select("*, organizer:users!organizer_id(username)")
          .eq("organizer_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("users")
          .select("subscription_tier")
          .eq("id", user.id)
          .maybeSingle(),
      ]);

      if (tRes.error) throw tRes.error;
      setTournaments(tRes.data || []);
      if (uRes.data?.subscription_tier) {
        setSubscriptionTier(uRes.data.subscription_tier);
      }
    } catch (e) {
      console.warn("Error loading my tournaments:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchMyTournaments();
  }, [fetchMyTournaments]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMyTournaments();
  };

  const handleOpenCreate = () => {
    if (!user) {
      setAuthModalVisible(true);
      return;
    }

    if (subscriptionTier !== "pro") {
      Alert.alert(
        isPt ? "Plano PRO Necessário" : "PRO Plan Required",
        isPt
          ? "A criação de torneios é uma funcionalidade exclusiva para membros com plano PRO. Por favor atualize o seu plano na versão Web para desbloquear a organização de torneios."
          : "Tournament creation is exclusive to PRO members. Please upgrade your plan on the Web app to organize tournaments.",
        [{ text: "OK" }]
      );
      return;
    }
    setCreateModalVisible(true);
  };

  const handleCreateSuccess = (tournamentId: string) => {
    setCreateModalVisible(false);
    fetchMyTournaments();
    router.push(`/tournament/${tournamentId}` as any);
  };

  const filteredTournaments = useMemo(() => {
    const filtered = tournaments.filter((tItem) => {
      if (
        selectedSport !== "all" &&
        tItem.sport_type?.toLowerCase() !== selectedSport.toLowerCase()
      ) {
        return false;
      }
      if (statusFilter !== "all" && tItem.status?.toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase();
        const name = tItem.name?.toLowerCase() || "";
        const sport = tItem.sport_type?.toLowerCase() || "";
        if (!name.includes(q) && !sport.includes(q)) {
          return false;
        }
      }
      return true;
    });
    return [...filtered].sort((a, b) => {
      const tA = new Date(a.start_date || a.created_at || 0).getTime();
      const tB = new Date(b.start_date || b.created_at || 0).getTime();
      return sortOrder === "desc" ? tB - tA : tA - tB;
    });
  }, [tournaments, selectedSport, statusFilter, searchQuery, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredTournaments.length / TOURNAMENTS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedTournaments = useMemo(() => {
    const start = (safePage - 1) * TOURNAMENTS_PER_PAGE;
    return filteredTournaments.slice(start, start + TOURNAMENTS_PER_PAGE);
  }, [filteredTournaments, safePage]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <MatchAtmosphereBackground sportType="random" mode="spectator" />
      <TopBar />
      <WorkspaceTabs activeTab="my-tournaments" />

      {user && (
        <FeedHeader
          selectedSport={selectedSport}
          onSportChange={(s) => {
            setSelectedSport(s);
            setCurrentPage(1);
          }}
          searchQuery={searchQuery}
          onSearchChange={(q) => {
            setSearchQuery(q);
            setCurrentPage(1);
          }}
          statusFilter={statusFilter}
          onStatusChange={(st) => {
            setStatusFilter(st);
            setCurrentPage(1);
          }}
          displayCount={filteredTournaments.length}
          countLabel={t("nav.tournaments") || "Tournaments"}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          showViewToggle={true}
          sortOrder={sortOrder}
          onSortOrderChange={(order) => {
            setSortOrder(order);
            setCurrentPage(1);
          }}
          tournaments={tournaments}
          currentTab="tournaments"
          primaryActionLabel={t("common.newTournament")}
          primaryActionTestID="header-create-tournament-btn"
          onPrimaryAction={handleOpenCreate}
        />
      )}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={ScoreBoardTheme.onSurfaceVariant} />
        </View>
      ) : !user ? (
        <View style={styles.centered}>
          <Ionicons name="lock-closed-outline" size={48} color={ScoreBoardTheme.textMuted} />
          <Text style={styles.emptyTitle}>
            {isPt ? "Inicie Sessão" : "Sign In Required"}
          </Text>
          <Text style={styles.emptySubtitle}>
            {isPt
              ? "Precisa de ter sessão iniciada para aceder aos seus torneios."
              : "You need to be signed in to access your organized tournaments."}
          </Text>
          <TouchableOpacity
            style={styles.signInButton}
            onPress={() => setAuthModalVisible(true)}
            testID="my-tournaments-signin-btn"
          >
            <Text style={styles.signInButtonText}>
              {isPt ? "Iniciar Sessão" : "Sign In"}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={paginatedTournaments}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <TournamentCard tournament={item} compact={viewMode === "list"} />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={ScoreBoardTheme.onSurfaceVariant}
            />
          }
          ListFooterComponent={
            filteredTournaments.length > 0 ? (
              <Pagination
                currentPage={safePage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            ) : undefined
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <Ionicons name="trophy-outline" size={48} color={ScoreBoardTheme.textMuted} />
              <Text style={styles.emptyTitle}>
                {isPt ? "Nenhum torneio criado" : "No tournaments created"}
              </Text>
              <Text style={styles.emptySubtitle}>
                {isPt
                  ? "Ainda não criou torneios na plataforma ScoreBoard."
                  : "You haven't created any tournaments on ScoreBoard yet."}
              </Text>
              <TouchableOpacity
                style={styles.emptyCreateButton}
                onPress={handleOpenCreate}
                activeOpacity={0.8}
                testID="empty-create-tournament-btn"
              >
                <Ionicons
                  name="add-circle-outline"
                  size={18}
                  color={ScoreBoardTheme.surfaceContainerLowest}
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.emptyCreateButtonText}>
                  {isPt ? "Criar Primeiro Torneio" : "Create First Tournament"}
                </Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {user && (
        <CreateTournamentModal
          visible={createModalVisible}
          onClose={() => setCreateModalVisible(false)}
          onCreateSuccess={handleCreateSuccess}
          userId={user.id}
        />
      )}

      <AuthModal
        visible={authModalVisible}
        onClose={() => setAuthModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: ScoreBoardTheme.background,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 28,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: ScoreBoardTheme.onSurface,
    marginTop: 14,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: ScoreBoardTheme.textMuted,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 16,
  },
  emptyCreateButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: ScoreBoardTheme.onSurface,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    marginTop: 8,
  },
  emptyCreateButtonText: {
    color: ScoreBoardTheme.surfaceContainerLowest,
    fontSize: 14,
    fontWeight: "700",
  },
  signInButton: {
    backgroundColor: ScoreBoardTheme.onSurface,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginTop: 12,
  },
  signInButtonText: {
    color: ScoreBoardTheme.surfaceContainerLowest,
    fontSize: 14,
    fontWeight: "700",
  },
});
