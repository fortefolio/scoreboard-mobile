import React, { useState, useEffect, useCallback } from "react";
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
import { MatchCard } from "@/components/MatchCard";
import { MatchListItem } from "@/components/MatchListItem";
import { MatchAtmosphereBackground } from "@/components/match/MatchAtmosphereBackground";
import { CreateMatchModal } from "@/components/match/CreateMatchModal";
import { AuthModal } from "@/components/AuthModal";
import { useAuth } from "@/components/AuthProvider";
import { useLanguage } from "@/lib/i18n";
import { supabase } from "@/lib/supabase/client";
import { ScoreBoardTheme } from "@/constants/theme";

export default function MyMatchesScreen() {
  const { t, locale } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();
  const isPt = locale === "pt";

  const [matches, setMatches] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"list" | "cards">("list");
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
        .select("*, tournaments(name)")
        .or(`organizer_id.eq.${user.id},umpire_id.eq.${user.id}`)
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

  const filteredMatches = matches.filter((m) =>
    statusFilter === "all" ? true : m.status === statusFilter
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <MatchAtmosphereBackground sportType="random" mode="spectator" />
      <TopBar />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBackBtn}
          onPress={() => router.push("/(tabs)" as any)}
          activeOpacity={0.7}
          testID="header-back-btn"
        >
          <Ionicons name="arrow-back" size={24} color="#f8fafc" />
        </TouchableOpacity>

        <View style={styles.headerTextCol}>
          <Text style={styles.headerTitle}>{t("nav.myMatches") || "Os Meus Jogos"}</Text>
          <Text style={styles.headerSubtitle}>
            {isPt ? "Jogos organizados ou arbitrados por si" : "Matches organized or umpired by you"}
          </Text>
        </View>

        {user && (
          <View style={styles.headerRightControls}>
            <TouchableOpacity
              style={styles.createButtonHeader}
              onPress={handleOpenCreate}
              activeOpacity={0.8}
              testID="header-create-match-btn"
            >
              <Ionicons name="add" size={16} color={ScoreBoardTheme.surfaceContainerLowest} />
              <Text style={styles.createButtonHeaderText}>
                {t("common.newMatch")}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {user && (
        <View style={styles.filterToolbar}>
          <View style={styles.statusTabsRow}>
            {(["all", "ongoing", "scheduled", "completed"] as const).map((st) => {
              const active = statusFilter === st;
              const label =
                st === "all"
                  ? isPt ? "Todos" : "All"
                  : st === "ongoing"
                  ? t("status.live")
                  : st === "scheduled"
                  ? t("status.scheduled")
                  : t("status.completed");
              return (
                <TouchableOpacity
                  key={st}
                  style={[styles.statusTab, active && styles.statusTabActive]}
                  onPress={() => setStatusFilter(st)}
                >
                  <Text style={[styles.statusTabText, active && styles.statusTabTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.viewToggle}>
            <TouchableOpacity
              style={[styles.toggleBtn, viewMode === "list" && styles.toggleBtnActive]}
              onPress={() => setViewMode("list")}
            >
              <Ionicons
                name="reorder-four"
                size={15}
                color={viewMode === "list" ? ScoreBoardTheme.onSurface : ScoreBoardTheme.textMuted}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, viewMode === "cards" && styles.toggleBtnActive]}
              onPress={() => setViewMode("cards")}
            >
              <Ionicons
                name="grid-outline"
                size={14}
                color={viewMode === "cards" ? ScoreBoardTheme.onSurface : ScoreBoardTheme.textMuted}
              />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={ScoreBoardTheme.onSurfaceVariant} />
        </View>
      ) : !user ? (
        <View style={styles.centered}>
          <Ionicons name="lock-closed-outline" size={48} color="#475569" />
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
          data={filteredMatches}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) =>
            viewMode === "list" ? (
              <MatchListItem match={item} />
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
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ScoreBoardTheme.onSurfaceVariant} />
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <Ionicons name="tennisball-outline" size={48} color="#334155" />
              <Text style={styles.emptyTitle}>
                {isPt ? "Nenhum jogo criado" : "No matches created"}
              </Text>
              <Text style={styles.emptySubtitle}>
                {isPt
                  ? "Ainda não organizou nem foi designado como árbitro de nenhum jogo."
                  : "You haven't organized or been assigned as referee to any matches yet."}
              </Text>
              <TouchableOpacity
                style={styles.emptyCreateButton}
                onPress={handleOpenCreate}
                activeOpacity={0.8}
                testID="empty-create-match-btn"
              >
                <Ionicons name="add-circle-outline" size={18} color="#ffffff" style={{ marginRight: 6 }} />
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
                  ? "Tem a certeza que deseja eliminar este jogo? Esta ação é irreversível."
                  : "Are you sure you want to delete this match? This action cannot be undone."}
              </Text>
              <View style={styles.deleteButtonsRow}>
                <TouchableOpacity
                  style={styles.cancelDeleteBtn}
                  onPress={() => setMatchToDelete(null)}
                  disabled={deletingMatch}
                  testID="cancel-delete-match-btn"
                >
                  <Text style={styles.cancelDeleteBtnText}>
                    {isPt ? "Cancelar" : "Cancel"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.confirmDeleteBtn}
                  onPress={confirmDeleteMatch}
                  disabled={deletingMatch}
                  testID="confirm-delete-match-btn"
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: ScoreBoardTheme.borderSubtle,
  },
  headerTextCol: {
    flex: 1,
  },
  headerBackBtn: {
    marginRight: 12,
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: ScoreBoardTheme.onSurface,
  },
  headerSubtitle: {
    fontSize: 12,
    color: ScoreBoardTheme.textMuted,
    marginTop: 2,
  },
  headerRightControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  createButtonHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: ScoreBoardTheme.onSurface,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 4,
  },
  createButtonHeaderText: {
    fontSize: 12,
    fontWeight: "600",
    color: ScoreBoardTheme.surfaceContainerLowest,
  },
  filterToolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: ScoreBoardTheme.borderSubtle,
    gap: 8,
  },
  statusTabsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  statusTab: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: ScoreBoardTheme.surfaceContainer,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
  },
  statusTabActive: {
    backgroundColor: ScoreBoardTheme.surfaceContainerHighest,
    borderColor: ScoreBoardTheme.onSurfaceVariant,
  },
  statusTabText: {
    fontSize: 11,
    fontWeight: "500",
    color: ScoreBoardTheme.textMuted,
  },
  statusTabTextActive: {
    color: ScoreBoardTheme.onSurface,
    fontWeight: "600",
  },
  viewToggle: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: ScoreBoardTheme.surfaceContainer,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    padding: 2,
    gap: 2,
  },
  toggleBtn: {
    padding: 5,
    borderRadius: 6,
  },
  toggleBtnActive: {
    backgroundColor: ScoreBoardTheme.surfaceContainerHighest,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
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
    color: "#f8fafc",
    marginTop: 14,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#64748b",
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
