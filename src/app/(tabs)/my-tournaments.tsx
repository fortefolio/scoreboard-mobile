import React, { useState, useEffect, useCallback } from "react";
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
import { TournamentCard } from "@/components/TournamentCard";
import { CreateTournamentModal } from "@/components/tournament/CreateTournamentModal";
import { AuthModal } from "@/components/AuthModal";
import { useAuth } from "@/components/AuthProvider";
import { useLanguage } from "@/lib/i18n";
import { supabase } from "@/lib/supabase/client";

export default function MyTournamentsScreen() {
  const { t, locale } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();
  const isPt = locale === "pt";

  const [tournaments, setTournaments] = useState<any[]>([]);
  const [subscriptionTier, setSubscriptionTier] = useState<string>("free");
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
          .select("*")
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
          <Text style={styles.headerTitle}>{t("nav.myTournaments") || "Os Meus Torneios"}</Text>
          <Text style={styles.headerSubtitle}>
            {isPt ? "Torneios organizados por si" : "Tournaments organized by you"}
          </Text>
        </View>

        {user && (
          <TouchableOpacity
            style={styles.createButtonHeader}
            onPress={handleOpenCreate}
            activeOpacity={0.8}
            testID="header-create-tournament-btn"
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
          data={tournaments}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <TournamentCard tournament={item} />}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4f46e5" />
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <Ionicons name="trophy-outline" size={48} color="#334155" />
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
                <Ionicons name="add-circle-outline" size={18} color="#ffffff" style={{ marginRight: 6 }} />
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
});
