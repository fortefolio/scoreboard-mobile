import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { TopBar } from "@/components/TopBar";
import { WorkspaceTabs } from "@/components/WorkspaceTabs";
import { FeedHeader } from "@/components/FeedHeader";
import { MatchCard } from "@/components/MatchCard";
import { GroupedMatchList } from "@/components/GroupedMatchList";
import { Pagination } from "@/components/Pagination";
import { MatchAtmosphereBackground } from "@/components/match/MatchAtmosphereBackground";
import { CreateMatchModal } from "@/components/match/CreateMatchModal";
import { MatchListSkeleton } from "@/components/common/Skeleton";
import { AuthModal } from "@/components/AuthModal";
import { useAuth } from "@/components/AuthProvider";
import { useLanguage } from "@/lib/i18n";
import { supabase } from "@/lib/supabase/client";
import { ScoreBoardTheme } from "@/constants/theme";

const ITEMS_PER_PAGE = 12;

export default function MyMatchesScreen() {
  const { t, locale } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const isPt = locale === "pt";

  const [matches, setMatches] = useState<any[]>([]);
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
  const [matchToDelete, setMatchToDelete] = useState<any | null>(null);
  const [deletingMatch, setDeletingMatch] = useState<boolean>(false);

  const handleDeleteMatch = (matchId: string) => {
    const target = matches.find((m) => m.id === matchId);
    if (target) setMatchToDelete(target);
  };

  const confirmDeleteMatch = async () => {
    if (!matchToDelete) return;
    setDeletingMatch(true);
    try {
      const { error } = await supabase
        .from("matches")
        .delete()
        .eq("id", matchToDelete.id);

      if (error) throw error;
      setMatchToDelete(null);
      fetchMyMatches();
    } catch (err: any) {
      Alert.alert(isPt ? "Erro ao Eliminar" : "Error Deleting", err?.message || "");
    } finally {
      setDeletingMatch(false);
    }
  };

  const fetchMyMatches = useCallback(async () => {
    if (!user) {
      setMatches([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("matches")
        .select("*, tournaments(name), organizer:users!organizer_id(username)")
        .eq("organizer_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMatches(data || []);
    } catch (e) {
      console.warn("Error loading my matches:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchMyMatches();
  }, [fetchMyMatches]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMyMatches();
  };

  const handleOpenCreate = () => {
    if (!user) {
      setAuthModalVisible(true);
      return;
    }
    setCreateModalVisible(true);
  };

  const handleCreateSuccess = (matchId?: string) => {
    setCreateModalVisible(false);
    fetchMyMatches();
    if (matchId) {
      router.push(`/match/${matchId}` as any);
    }
  };

  const filteredMatches = useMemo(() => {
    const filtered = matches.filter((m) => {
      if (
        selectedSport !== "all" &&
        m.sport_type?.toLowerCase() !== selectedSport.toLowerCase()
      ) {
        return false;
      }
      if (statusFilter !== "all" && m.status?.toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase();
        const p1 = m.participants?.[0]?.name?.toLowerCase() || "";
        const p2 = m.participants?.[1]?.name?.toLowerCase() || "";
        const tName = m.tournaments?.name?.toLowerCase() || "";
        const court = m.court?.toLowerCase() || "";
        if (!p1.includes(q) && !p2.includes(q) && !tName.includes(q) && !court.includes(q)) {
          return false;
        }
      }
      return true;
    });
    return [...filtered].sort((a, b) => {
      const tA = new Date(a.scheduled_at || a.created_at || 0).getTime();
      const tB = new Date(b.scheduled_at || b.created_at || 0).getTime();
      return sortOrder === "desc" ? tB - tA : tA - tB;
    });
  }, [matches, selectedSport, statusFilter, searchQuery, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredMatches.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedMatches = useMemo(() => {
    const start = (safePage - 1) * ITEMS_PER_PAGE;
    return filteredMatches.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredMatches, safePage]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <MatchAtmosphereBackground sportType="random" mode="spectator" />
      <TopBar />
      <WorkspaceTabs activeTab="my-matches" />

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
          displayCount={filteredMatches.length}
          countLabel={t("nav.matches") || "Matches"}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          showViewToggle={true}
          sortOrder={sortOrder}
          onSortOrderChange={(order) => {
            setSortOrder(order);
            setCurrentPage(1);
          }}
          matches={matches}
          currentTab="matches"
          primaryActionLabel={t("common.newMatch")}
          primaryActionTestID="header-create-match-btn"
          onPrimaryAction={handleOpenCreate}
        />
      )}

      {loading ? (
        <MatchListSkeleton />
      ) : !user ? (
        <View style={styles.centered}>
          <Ionicons name="lock-closed-outline" size={48} color={ScoreBoardTheme.textMuted} />
          <Text style={styles.emptyTitle}>
            {isPt ? "Inicie Sessão" : "Sign In Required"}
          </Text>
          <Text style={styles.emptySubtitle}>
            {isPt
              ? "Precisa de ter sessão iniciada para ver e gerir os seus jogos."
              : "You need to be signed in to view and manage your matches."}
          </Text>
          <TouchableOpacity
            style={styles.signInButton}
            onPress={() => setAuthModalVisible(true)}
            testID="my-matches-signin-btn"
          >
            <Text style={styles.signInButtonText}>
              {isPt ? "Iniciar Sessão" : "Sign In"}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={
            viewMode === "list"
              ? paginatedMatches.length > 0
                ? [{ id: "__grouped__" }]
                : []
              : paginatedMatches
          }
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) =>
            viewMode === "list" ? (
              <GroupedMatchList
                matches={paginatedMatches}
                showOrganizer={false}
                renderRowActions={(m) => (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    {m.status !== "completed" && (
                      <TouchableOpacity
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 7,
                          backgroundColor: ScoreBoardTheme.surfaceContainerHigh,
                          borderWidth: 1,
                          borderColor: ScoreBoardTheme.borderSubtle,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                        onPress={() => router.push(`/match/${m.id}/scoreboard` as any)}
                        activeOpacity={0.75}
                      >
                        <Ionicons
                          name="play-outline"
                          size={14}
                          color={ScoreBoardTheme.onSurface}
                        />
                      </TouchableOpacity>
                    )}
                    {user && m.organizer_id === user.id && (
                      <TouchableOpacity
                        testID={`match-delete-btn-${m.id}`}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 7,
                          backgroundColor: ScoreBoardTheme.surfaceContainerHigh,
                          borderWidth: 1,
                          borderColor: "rgba(244, 63, 94, 0.25)",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                        onPress={() => handleDeleteMatch(m.id)}
                        activeOpacity={0.75}
                      >
                        <Ionicons name="trash-outline" size={14} color="#f43f5e" />
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              />
            ) : (
              <MatchCard
                match={item}
                canDelete={user ? item.organizer_id === user.id : false}
                onDelete={handleDeleteMatch}
              />
            )
          }
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={ScoreBoardTheme.onSurfaceVariant}
            />
          }
          ListFooterComponent={
            filteredMatches.length > 0 ? (
              <Pagination
                currentPage={safePage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            ) : undefined
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <Ionicons name="tennisball-outline" size={48} color={ScoreBoardTheme.textMuted} />
              <Text style={styles.emptyTitle}>
                {isPt ? "Nenhum jogo criado" : "No matches created"}
              </Text>
              <Text style={styles.emptySubtitle}>
                {isPt
                  ? "Ainda não organizou nenhum jogo na plataforma ScoreBoard."
                  : "You haven't organized any matches yet."}
              </Text>
              <TouchableOpacity
                style={styles.emptyCreateButton}
                onPress={handleOpenCreate}
                activeOpacity={0.8}
                testID="empty-create-match-btn"
              >
                <Ionicons
                  name="add-circle-outline"
                  size={18}
                  color={ScoreBoardTheme.surfaceContainerLowest}
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.emptyCreateButtonText}>
                  {isPt ? "Criar Primeiro Jogo" : "Create First Match"}
                </Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Delete Match Confirmation Modal */}
      {matchToDelete && (
        <Modal
          visible={!!matchToDelete}
          transparent
          animationType="fade"
          onRequestClose={() => setMatchToDelete(null)}
        >
          <View style={styles.deleteModalOverlay}>
            <View style={styles.deleteModalCard}>
              <View style={styles.deleteIconWrapper}>
                <Ionicons name="trash-outline" size={32} color="#ef4444" />
              </View>
              <Text style={styles.deleteModalTitle}>
                {isPt ? "Eliminar Jogo" : "Delete Match"}
              </Text>
              <Text style={styles.deleteModalMessage}>
                {isPt
                  ? `Tem a certeza que pretende eliminar o jogo ${matchToDelete.participants?.[0]?.name || "Equipa A"} vs ${matchToDelete.participants?.[1]?.name || "Equipa B"}? Esta ação é irreversível.`
                  : `Are you sure you want to delete ${matchToDelete.participants?.[0]?.name || "Team A"} vs ${matchToDelete.participants?.[1]?.name || "Team B"}? This cannot be undone.`}
              </Text>

              <View style={styles.deleteButtonsRow}>
                <TouchableOpacity
                  style={styles.cancelDeleteBtn}
                  onPress={() => setMatchToDelete(null)}
                  disabled={deletingMatch}
                >
                  <Text style={styles.cancelDeleteBtnText}>
                    {isPt ? "Cancelar" : "Cancel"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.confirmDeleteBtn}
                  onPress={confirmDeleteMatch}
                  disabled={deletingMatch}
                >
                  {deletingMatch ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.confirmDeleteBtnText}>
                      {isPt ? "Eliminar" : "Delete"}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {user && (
        <CreateMatchModal
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
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  deleteModalCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: ScoreBoardTheme.surfaceContainer,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    padding: 24,
    alignItems: "center",
  },
  deleteIconWrapper: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  deleteModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: ScoreBoardTheme.onSurface,
    marginBottom: 8,
    textAlign: "center",
  },
  deleteModalMessage: {
    fontSize: 14,
    color: ScoreBoardTheme.onSurfaceVariant,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  deleteButtonsRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  cancelDeleteBtn: {
    flex: 1,
    height: 44,
    backgroundColor: ScoreBoardTheme.surfaceContainerHighest,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
  },
  cancelDeleteBtnText: {
    color: ScoreBoardTheme.onSurfaceVariant,
    fontSize: 14,
    fontWeight: "600",
  },
  confirmDeleteBtn: {
    flex: 1,
    height: 44,
    backgroundColor: "#ef4444",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmDeleteBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
});
