import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
import { FeedHeader } from "@/components/FeedHeader";
import { MatchCard } from "@/components/MatchCard";
import { MatchListItem } from "@/components/MatchListItem";
import { Pagination } from "@/components/Pagination";
import { AuthModal } from "@/components/AuthModal";
import { CreateMatchModal } from "@/components/match/CreateMatchModal";
import { MatchAtmosphereBackground } from "@/components/match/MatchAtmosphereBackground";
import { useAuth } from "@/components/AuthProvider";
import { useTranslation } from "@/lib/i18n";
import { supabase } from "@/lib/supabase/client";
import { ScoreBoardTheme } from "@/constants/theme";

const MATCHES_PER_PAGE = 12;

export default function MatchesFeedScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);

  const [viewMode, setViewMode] = useState<"list" | "cards">("list");
  const [selectedSport, setSelectedSport] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [authModalVisible, setAuthModalVisible] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);

  const [matches, setMatches] = useState<any[]>([]);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Fetch matches & tournaments (for quick-jump search)
  const fetchMatches = useCallback(async () => {
    try {
      const [matchesRes, tournamentsRes] = await Promise.all([
        supabase
          .from("matches")
          .select("*, tournaments(name), organizer:users!organizer_id(username)")
          .order("created_at", { ascending: false })
          .limit(300),
        supabase
          .from("tournaments")
          .select("*, organizer:users!organizer_id(username)")
          .order("created_at", { ascending: false })
          .limit(100),
      ]);

      if (matchesRes.data) setMatches(matchesRes.data);
      if (tournamentsRes.data) setTournaments(tournamentsRes.data);
    } catch (e) {
      console.warn("Error loading matches:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchMatches();

    const channelId = `realtime-matches-feed-${Math.random().toString(36).slice(2, 9)}`;
    const channel = supabase
      .channel(channelId)
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
  }, [fetchMatches]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMatches();
  };

  const clearFilters = () => {
    setSelectedSport("all");
    setStatusFilter("all");
    setSearchQuery("");
    setCurrentPage(1);
  };

  const handleSportChange = (sport: string) => {
    setSelectedSport(sport);
    setCurrentPage(1);
  };

  const handleStatusChange = (status: string) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    setCurrentPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  // Filter & sort matches
  const filteredMatches = useMemo(() => {
    const filtered = matches.filter((m) => {
      if (selectedSport !== "all" && m.sport_type?.toLowerCase() !== selectedSport.toLowerCase()) {
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

  const totalPages = Math.max(1, Math.ceil(filteredMatches.length / MATCHES_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedData = useMemo(() => {
    const start = (safePage - 1) * MATCHES_PER_PAGE;
    return filteredMatches.slice(start, start + MATCHES_PER_PAGE);
  }, [filteredMatches, safePage]);

  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={ScoreBoardTheme.onSurfaceVariant} />
          <Text style={styles.loadingText}>{t("common.loading") || "Loading live data..."}</Text>
        </View>
      );
    }

    const hasActiveFilters =
      selectedSport !== "all" || statusFilter !== "all" || searchQuery.trim().length > 0;

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="search-outline" size={44} color="rgba(220, 225, 251, 0.25)" />
        <Text style={styles.emptyTitle}>{t("home.noMatchesFound") || "No matches found"}</Text>
        <Text style={styles.emptySubtitle}>
          {hasActiveFilters
            ? t("home.noMatchesFilterDesc") || "Try adjusting your filters or search term."
            : t("home.noMatchesFound")}
        </Text>
        {hasActiveFilters && (
          <TouchableOpacity style={styles.clearBtn} onPress={clearFilters}>
            <Text style={styles.clearBtnText}>{t("common.clearFilters") || "Clear Filters"}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <MatchAtmosphereBackground sportType="random" mode="spectator" />
      {/* Top Application Bar */}
      <TopBar onSearchPress={() => {}} />

      {/* Persistent Filters & Search (Placed outside FlatList so TextInput never loses focus) */}
      <FeedHeader
        selectedSport={selectedSport}
        onSportChange={handleSportChange}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        statusFilter={statusFilter}
        onStatusChange={handleStatusChange}
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
        tournaments={tournaments}
        currentTab="matches"
        primaryActionLabel={t("common.newMatch")}
        onPrimaryAction={() => {
          if (!user) {
            setAuthModalVisible(true);
          } else {
            setCreateModalVisible(true);
          }
        }}
      />

      {/* Matches Feed List */}
      <FlatList
        ref={flatListRef}
        data={paginatedData}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) =>
          viewMode === "list" ? (
            <MatchListItem
              match={item}
              onAuthRequired={() => setAuthModalVisible(true)}
            />
          ) : (
            <MatchCard match={item} onAuthRequired={() => setAuthModalVisible(true)} />
          )
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
        ListEmptyComponent={renderEmpty()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={ScoreBoardTheme.onSurfaceVariant}
            colors={[ScoreBoardTheme.onSurfaceVariant]}
          />
        }
      />

      <AuthModal visible={authModalVisible} onClose={() => setAuthModalVisible(false)} />
      {user && (
        <CreateMatchModal
          visible={createModalVisible}
          onClose={() => setCreateModalVisible(false)}
          userId={user.id}
          onCreateSuccess={(matchId?: string) => {
            setCreateModalVisible(false);
            fetchMatches();
            if (matchId) router.push(`/match/${matchId}` as any);
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
  listContent: {
    paddingBottom: 40,
    paddingHorizontal: 16,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 12,
    fontWeight: "500",
    color: ScoreBoardTheme.textMuted,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: ScoreBoardTheme.onSurface,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 12,
    fontWeight: "400",
    color: ScoreBoardTheme.textMuted,
    textAlign: "center",
    marginTop: 4,
    lineHeight: 18,
  },
  clearBtn: {
    marginTop: 16,
    backgroundColor: ScoreBoardTheme.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  clearBtnText: {
    fontSize: 12,
    fontWeight: "500",
    color: ScoreBoardTheme.primary,
  },
});
