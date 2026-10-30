import React, { useState, useEffect, useCallback } from "react";
import { View, Text, FlatList, RefreshControl, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { TopBar } from "@/components/TopBar";
import { MatchCard } from "@/components/MatchCard";
import { useAuth } from "@/components/AuthProvider";
import { useLanguage } from "@/lib/i18n";
import { supabase } from "@/lib/supabase/client";

export default function MyMatchesScreen() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();

  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

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

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <TopBar />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t("nav.myMatches") || "Os Meus Jogos"}</Text>
        <Text style={styles.headerSubtitle}>
          Jogos organizados ou arbitrados por si
        </Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#4f46e5" />
        </View>
      ) : !user ? (
        <View style={styles.centered}>
          <Ionicons name="lock-closed-outline" size={48} color="#475569" />
          <Text style={styles.emptyTitle}>Inicie Sessão</Text>
          <Text style={styles.emptySubtitle}>
            Precisa de ter sessão iniciada para ver e gerir os seus jogos.
          </Text>
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
              <Text style={styles.emptyTitle}>Nenhum jogo criado</Text>
              <Text style={styles.emptySubtitle}>
                Ainda não organizou nem foi designado como árbitro de nenhum jogo.
              </Text>
            </View>
          }
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
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
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
  },
});
