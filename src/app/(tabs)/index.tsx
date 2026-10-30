import React, { useState, useEffect, useCallback, useMemo } from "react";
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
import { TopBar } from "@/components/TopBar";
import { SportFilterBar } from "@/components/SportFilterBar";
import { SearchBar } from "@/components/SearchBar";
import { MatchCard } from "@/components/MatchCard";
import { TournamentCard } from "@/components/TournamentCard";
import { useAuth } from "@/components/AuthProvider";
import { useLanguage } from "@/lib/i18n";
import { useFollow } from "@/lib/hooks/useFollow";
import { supabase } from "@/lib/supabase/client";

export default function FeedScreen() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { followedMatchIds, followedTournamentIds } = useFollow();

  const [activeSegment, setActiveSegment] = useState<"matches" | "tournaments" | "following">("matches");
  const [selectedSport, setSelectedSport] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [matches, setMatches] = useState<any[]>([]);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Fetch feed data
  const fetchData = useCallback(async () => {
    try {
      const [matchesRes, tournamentsRes] = await Promise.all([
        supabase
          .from("matches")
          .select("*, tournaments(name)")
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("tournaments")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100),
      ]);

      if (matchesRes.data) setMatches(matchesRes.data);
      if (tournamentsRes.data) setTournaments(tournamentsRes.data);
    } catch (e) {
      console.warn("Error loading feed data:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Realtime channel for live match score updates
    const channel = supabase
      .channel("feed-live-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches" },
        (payload) => {
          if (payload.eventType === "UPDATE") {
            setMatches((prev) =>
              prev.map((m) => (m.id === payload.new.id ? { ...m, ...payload.new } : m))
            );
          } else if (payload.eventType === "INSERT") {
            setMatches((prev) => [payload.new, ...prev]);
          } else if (payload.eventType === "DELETE") {
            setMatches((prev) => prev.filter((m) => m.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Filtered Matches
  const filteredMatches = useMemo(() => {
    return matches.filter((m) => {
      // Following filter
      if (activeSegment === "following" && !followedMatchIds.has(m.id)) {
        return false;
      }

      // Sport filter
      if (selectedSport !== "all" && m.sport_type?.toLowerCase() !== selectedSport.toLowerCase()) {
        return false;
      }

      // Status filter
      if (statusFilter !== "all" && m.status !== statusFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase();
        const teamA = m.participants?.[0]?.name?.toLowerCase() || "";
        const teamB = m.participants?.[1]?.name?.toLowerCase() || "";
        const tourName = m.tournaments?.name?.toLowerCase() || "";
        if (!teamA.includes(q) && !teamB.includes(q) && !tourName.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [matches, activeSegment, followedMatchIds, selectedSport, statusFilter, searchQuery]);

  // Filtered Tournaments
  const filteredTournaments = useMemo(() => {
    return tournaments.filter((t) => {
      // Following filter
      if (activeSegment === "following" && !followedTournamentIds.has(t.id)) {
        return false;
      }

      // Sport filter
      if (selectedSport !== "all" && t.sport_type?.toLowerCase() !== selectedSport.toLowerCase()) {
        return false;
      }

      // Status filter
      if (statusFilter !== "all" && t.status !== statusFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase();
        const name = t.name?.toLowerCase() || "";
        if (!name.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [tournaments, activeSegment, followedTournamentIds, selectedSport, statusFilter, searchQuery]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      {/* Top Application Bar */}
      <TopBar />

      {/* Segmented View Switcher: Jogos / Torneios / A Seguir */}
      <View style={styles.segmentContainer}>
        <TouchableOpacity
          style={[styles.segmentBtn, activeSegment === "matches" && styles.segmentBtnActive]}
          onPress={() => setActiveSegment("matches")}
        >
          <Text
            style={[
              styles.segmentText,
              activeSegment === "matches" && styles.segmentTextActive,
            ]}
          >
            {t("home.matchesTab") || "Jogos"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, activeSegment === "tournaments" && styles.segmentBtnActive]}
          onPress={() => setActiveSegment("tournaments")}
        >
          <Text
            style={[
              styles.segmentText,
              activeSegment === "tournaments" && styles.segmentTextActive,
            ]}
          >
            {t("home.tournamentsTab") || "Torneios"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, activeSegment === "following" && styles.segmentBtnActive]}
          onPress={() => setActiveSegment("following")}
        >
          <Text
            style={[
              styles.segmentText,
              activeSegment === "following" && styles.segmentTextActive,
            ]}
          >
            {t("home.followingTab") || "A Seguir"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Sport Filter Bar */}
      <SportFilterBar selectedSport={selectedSport} onSelectSport={setSelectedSport} />

      {/* Search Bar & Status Filter */}
      <SearchBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
      />

      {/* Main Feed Content */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#4f46e5" />
          <Text style={styles.loadingText}>{t("common.loading") || "A carregar feed..."}</Text>
        </View>
      ) : activeSegment === "matches" ? (
        <FlatList
          data={filteredMatches}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <MatchCard match={item} />}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4f46e5" />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="tennisball-outline" size={48} color="#334155" />
              <Text style={styles.emptyTitle}>
                {t("home.noMatchesFound") || "Nenhum jogo encontrado"}
              </Text>
              <Text style={styles.emptySubtitle}>
                {t("home.noMatchesFilterDesc") || "Experimente alterar os filtros aplicados."}
              </Text>
              {(selectedSport !== "all" || statusFilter !== "all" || searchQuery.length > 0) && (
                <TouchableOpacity
                  style={styles.clearBtn}
                  onPress={() => {
                    setSelectedSport("all");
                    setStatusFilter("all");
                    setSearchQuery("");
                  }}
                >
                  <Text style={styles.clearBtnText}>
                    {t("common.clearFilters") || "Limpar Filtros"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      ) : activeSegment === "tournaments" ? (
        <FlatList
          data={filteredTournaments}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <TournamentCard tournament={item} />}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4f46e5" />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="trophy-outline" size={48} color="#334155" />
              <Text style={styles.emptyTitle}>
                {t("home.noTournamentsFound") || "Nenhum torneio encontrado"}
              </Text>
              <Text style={styles.emptySubtitle}>
                {t("home.noTournamentsFilterDesc") || "Tente outros filtros de pesquisa."}
              </Text>
            </View>
          }
        />
      ) : (
        /* Following Tab */
        <FlatList
          data={filteredMatches.concat(filteredTournaments)}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) =>
            item.sport_type && item.participants ? (
              <MatchCard match={item} />
            ) : (
              <TournamentCard tournament={item} />
            )
          }
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4f46e5" />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="heart-outline" size={48} color="#334155" />
              <Text style={styles.emptyTitle}>
                {user ? t("home.emptyFollowingTitle") || "Ainda não segue jogos ou torneios" : t("home.unauthTitle") || "Inicie sessão"}
              </Text>
              <Text style={styles.emptySubtitle}>
                {user ? t("home.emptyFollowingDesc") || "Toque no coração de um jogo ou torneio para acompanhá-lo aqui." : t("home.unauthDesc") || "Faça login para acompanhar as suas equipas e torneios favoritos."}
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
    backgroundColor: "#0b0f19",
  },
  segmentContainer: {
    flexDirection: "row",
    backgroundColor: "#151b2d",
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 6,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: "#232d4b",
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 8,
  },
  segmentBtnActive: {
    backgroundColor: "#0b0f19",
    borderWidth: 1,
    borderColor: "#4f46e5",
  },
  segmentText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748b",
  },
  segmentTextActive: {
    color: "#f8fafc",
    fontWeight: "700",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: "#94a3b8",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    paddingHorizontal: 24,
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
  clearBtn: {
    marginTop: 16,
    backgroundColor: "#1e293b",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  clearBtnText: {
    color: "#a5b4fc",
    fontSize: 13,
    fontWeight: "600",
  },
});
