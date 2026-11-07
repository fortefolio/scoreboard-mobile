import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
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
          renderItem={({ item }) => <MatchCard match={item} />}
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
});
