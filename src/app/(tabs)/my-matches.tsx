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
import { CreateMatchModal } from "@/components/match/CreateMatchModal";
import { AuthModal } from "@/components/AuthModal";
import { useAuth } from "@/components/AuthProvider";
import { useLanguage } from "@/lib/i18n";
import { supabase } from "@/lib/supabase/client";

export default function MyMatchesScreen() {
  const { t, locale } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();
  const isPt = locale === "pt";

  const [matches, setMatches] = useState<any[]>([]);
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

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
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
          <TouchableOpacity
            style={styles.createButtonHeader}
            onPress={handleOpenCreate}
            activeOpacity={0.8}
            testID="header-create-match-btn"
          >
            <Ionicons name="add" size={18} color="#ffffff" />
            <Text style={styles.createButtonHeaderText}>
              {isPt ? "Criar" : "Create"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#4f46e5" />
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
          data={matches}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MatchCard
              match={item}
              canDelete={user ? item.organizer_id === user.id : false}
              onDelete={handleDeleteMatch}
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4f46e5" />
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
    backgroundColor: "#0c1324",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
  },
  headerTextCol: {
    flex: 1,
  },
  headerBackBtn: {
    marginRight: 12,
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#f8fafc",
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#94a3b8",
    marginTop: 2,
  },
  createButtonHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4f46e5",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    gap: 4,
  },
  createButtonHeaderText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 13,
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
    backgroundColor: "#4f46e5",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    marginTop: 8,
  },
  emptyCreateButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  signInButton: {
    backgroundColor: "#4f46e5",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginTop: 12,
  },
  signInButtonText: {
    color: "#ffffff",
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
    backgroundColor: "#0f172a",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1e293b",
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
    color: "#f8fafc",
    marginBottom: 8,
    textAlign: "center",
  },
  deleteModalMessage: {
    fontSize: 14,
    color: "#94a3b8",
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
    backgroundColor: "#1e293b",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#334155",
  },
  cancelDeleteBtnText: {
    color: "#94a3b8",
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
