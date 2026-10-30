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
import { TopBar } from "@/components/TopBar";
import { SportFilterBar } from "@/components/SportFilterBar";
import { SearchBar } from "@/components/SearchBar";
import { MatchCard } from "@/components/MatchCard";
import { MatchListItem } from "@/components/MatchListItem";
import { TournamentCard } from "@/components/TournamentCard";
import { Pagination } from "@/components/Pagination";
import { AuthModal } from "@/components/AuthModal";
import { useAuth } from "@/components/AuthProvider";
import { useTranslation } from "@/lib/i18n";
import { useFollow } from "@/lib/hooks/useFollow";
import { supabase } from "@/lib/supabase/client";
import { ScoreBoardTheme } from "@/constants/theme";

const MATCHES_PER_PAGE = 12;
const TOURNAMENTS_PER_PAGE = 8;

interface FeedHeaderProps {
  totalMatchesCount: number;
  totalTournamentsCount: number;
  totalFollowedCount: number;
  user: any;
  activeSegment: "matches" | "tournaments" | "following";
  filteredMatchesCount: number;
  filteredTournamentsCount: number;
  onTabChange: (tab: "matches" | "tournaments" | "following") => void;
  selectedSport: string;
  onSportChange: (sport: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  statusFilter: string;
  onStatusChange: (status: string) => void;
  displayCount: number;
  isTournaments: boolean;
  viewMode: "list" | "cards";
  onViewModeChange: (mode: "list" | "cards") => void;
  t: (key: string) => string;
}

const FeedHeader = React.memo(function FeedHeader({
  totalMatchesCount,
  totalTournamentsCount,
  totalFollowedCount,
  user,
  activeSegment,
  filteredMatchesCount,
  filteredTournamentsCount,
  onTabChange,
  selectedSport,
  onSportChange,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  displayCount,
  isTournaments,
  viewMode,
  onViewModeChange,
  t,
}: FeedHeaderProps) {
  return (
    <View style={styles.headerContainer}>
      {/* Hero Command Center Card matching Web */}
      <View style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <View style={styles.liveBadge}>
            <View style={styles.livePulseDot} />
            <Text style={styles.liveBadgeText}>{t("home.liveBadge") || "LIVE ARENA"}</Text>
          </View>

          {/* Quick Stat Counters */}
          <View style={styles.statsPill}>
            <View style={styles.statCol}>
              <Text style={styles.statNumPrimary}>{totalMatchesCount}</Text>
              <Text style={styles.statLabel}>{t("nav.matches") || "Matches"}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={styles.statNumSecondary}>{totalTournamentsCount}</Text>
              <Text style={styles.statLabel}>{t("nav.tournaments") || "Tourn."}</Text>
            </View>
            {user && (
              <>
                <View style={styles.statDivider} />
                <View style={styles.statCol}>
                  <Text style={styles.statNumAmber}>{totalFollowedCount}</Text>
                  <Text style={styles.statLabel}>{t("common.following") || "Favs"}</Text>
                </View>
              </>
            )}
          </View>
        </View>

        <Text style={styles.heroTitle}>{t("home.heroTitle") || "Multi-Sport Command"}</Text>
        <Text style={styles.heroSubtitle}>
          {t("home.heroSubtitle") || "Real-time scores, tournament brackets & referee controls."}
        </Text>
      </View>

      {/* Main Segment Switcher: Matches / Tournaments / Following */}
      <View style={styles.segmentContainer}>
        <TouchableOpacity
          style={[styles.segmentBtn, activeSegment === "matches" && styles.segmentBtnActive]}
          onPress={() => onTabChange("matches")}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.segmentText,
              activeSegment === "matches" && styles.segmentTextActive,
            ]}
          >
            {t("nav.matches") || "Matches"} ({filteredMatchesCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, activeSegment === "tournaments" && styles.segmentBtnActive]}
          onPress={() => onTabChange("tournaments")}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.segmentText,
              activeSegment === "tournaments" && styles.segmentTextActive,
            ]}
          >
            {t("nav.tournaments") || "Tournaments"} ({filteredTournamentsCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, activeSegment === "following" && styles.segmentBtnActive]}
          onPress={() => onTabChange("following")}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.segmentText,
              activeSegment === "following" && styles.segmentTextActive,
            ]}
          >
            {t("common.following") || "Following"} ({totalFollowedCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Sport Filter Bar */}
      <SportFilterBar selectedSport={selectedSport} onSelectSport={onSportChange} />

      {/* Search Bar & Status Filter */}
      <SearchBar
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        statusFilter={statusFilter}
        onStatusChange={onStatusChange}
      />

      {/* View Mode & Count Bar (matching web controls) */}
      <View style={styles.viewModeBar}>
        <Text style={styles.resultCountText}>
          {displayCount}{" "}
          {isTournaments ? t("nav.tournaments") : t("nav.matches")}
        </Text>

        <View style={styles.viewModeToggle}>
          <TouchableOpacity
            style={[styles.toggleBtn, viewMode === "list" && styles.toggleBtnActive]}
            onPress={() => onViewModeChange("list")}
            activeOpacity={0.7}
          >
            <Ionicons
              name="reorder-four"
              size={16}
              color={viewMode === "list" ? "#ffffff" : "rgba(220, 225, 251, 0.4)"}
            />
            <Text
              style={[
                styles.toggleBtnText,
                viewMode === "list" && styles.toggleBtnTextActive,
              ]}
            >
              {t("common.viewList") || "List"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toggleBtn, viewMode === "cards" && styles.toggleBtnActive]}
            onPress={() => onViewModeChange("cards")}
            activeOpacity={0.7}
          >
            <Ionicons
              name="grid-outline"
              size={14}
              color={viewMode === "cards" ? "#ffffff" : "rgba(220, 225, 251, 0.4)"}
            />
            <Text
              style={[
                styles.toggleBtnText,
                viewMode === "cards" && styles.toggleBtnTextActive,
              ]}
            >
              {t("common.viewCards") || "Cards"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
});

export default function FeedScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { followedMatchIds, followedTournamentIds } = useFollow();
  const flatListRef = useRef<FlatList>(null);

  const [activeSegment, setActiveSegment] = useState<"matches" | "tournaments" | "following">("matches");
  const [viewMode, setViewMode] = useState<"list" | "cards">("list");
  const [selectedSport, setSelectedSport] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [authModalVisible, setAuthModalVisible] = useState(false);

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
          .limit(300),
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
    const channelId = `feed-live-${Math.random().toString(36).slice(2, 9)}`;
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
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const clearFilters = () => {
    setSelectedSport("all");
    setStatusFilter("all");
    setSearchQuery("");
    setCurrentPage(1);
  };

  const handleTabChange = (tab: "matches" | "tournaments" | "following") => {
    setActiveSegment(tab);
    setCurrentPage(1);
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
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

  // Filtered Matches
  const filteredMatches = useMemo(() => {
    return matches.filter((m) => {
      if (activeSegment === "following" && !followedMatchIds.has(m.id)) {
        return false;
      }
      if (selectedSport !== "all" && m.sport_type?.toLowerCase() !== selectedSport.toLowerCase()) {
        return false;
      }
      if (statusFilter !== "all" && m.status !== statusFilter) {
        return false;
      }
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase();
        const sport = m.sport_type?.toLowerCase() || "";
        const tourney = m.tournaments?.name?.toLowerCase() || "";
        const p1 = m.participants?.[0]?.name?.toLowerCase() || "";
        const p2 = m.participants?.[1]?.name?.toLowerCase() || "";
        if (!sport.includes(q) && !tourney.includes(q) && !p1.includes(q) && !p2.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [matches, activeSegment, followedMatchIds, selectedSport, statusFilter, searchQuery]);

  // Filtered Tournaments
  const filteredTournaments = useMemo(() => {
    return tournaments.filter((tItem) => {
      if (activeSegment === "following" && !followedTournamentIds.has(tItem.id)) {
        return false;
      }
      if (selectedSport !== "all" && tItem.sport_type?.toLowerCase() !== selectedSport.toLowerCase()) {
        return false;
      }
      if (statusFilter !== "all" && tItem.status !== statusFilter) {
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
  }, [tournaments, activeSegment, followedTournamentIds, selectedSport, statusFilter, searchQuery]);

  const totalMatchesCount = matches.length;
  const totalTournamentsCount = tournaments.length;
  const totalFollowedCount = followedMatchIds.size + followedTournamentIds.size;

  const isTournaments = activeSegment === "tournaments";
  const displayData = isTournaments ? filteredTournaments : filteredMatches;
  const itemsPerPage = isTournaments ? TOURNAMENTS_PER_PAGE : MATCHES_PER_PAGE;
  const totalPages = Math.max(1, Math.ceil(displayData.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);

  // Paginate items for the current page
  const paginatedData = useMemo(() => {
    const start = (safePage - 1) * itemsPerPage;
    return displayData.slice(start, start + itemsPerPage);
  }, [displayData, safePage, itemsPerPage]);

  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#4edea3" />
          <Text style={styles.loadingText}>{t("common.loading") || "Loading live data..."}</Text>
        </View>
      );
    }

    const hasActiveFilters =
      selectedSport !== "all" || statusFilter !== "all" || searchQuery.trim().length > 0;

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="search-outline" size={44} color="rgba(220, 225, 251, 0.25)" />
        <Text style={styles.emptyTitle}>
          {activeSegment === "matches"
            ? t("home.noMatchesFound") || "No matches found"
            : t("home.noTournamentsFound") || "No tournaments found"}
        </Text>
        <Text style={styles.emptySubtitle}>
          {hasActiveFilters
            ? t("home.noMatchesFilterDesc") || "Try adjusting your filters or search term."
            : activeSegment === "following"
            ? t("home.noFavoritesDescription") || "You haven't followed any matches or tournaments yet."
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
      {/* Top Application Bar */}
      <TopBar onSearchPress={() => {}} />

      {/* Feed List */}
      <FlatList
        ref={flatListRef}
        data={paginatedData}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) =>
          isTournaments ? (
            <TournamentCard
              tournament={item}
              onAuthRequired={() => setAuthModalVisible(true)}
            />
          ) : viewMode === "list" ? (
            <MatchListItem
              match={item}
              onAuthRequired={() => setAuthModalVisible(true)}
            />
          ) : (
            <MatchCard match={item} onAuthRequired={() => setAuthModalVisible(true)} />
          )
        }
        ListHeaderComponent={
          <FeedHeader
            totalMatchesCount={totalMatchesCount}
            totalTournamentsCount={totalTournamentsCount}
            totalFollowedCount={totalFollowedCount}
            user={user}
            activeSegment={activeSegment}
            filteredMatchesCount={filteredMatches.length}
            filteredTournamentsCount={filteredTournaments.length}
            onTabChange={handleTabChange}
            selectedSport={selectedSport}
            onSportChange={handleSportChange}
            searchQuery={searchQuery}
            onSearchChange={handleSearchChange}
            statusFilter={statusFilter}
            onStatusChange={handleStatusChange}
            displayCount={displayData.length}
            isTournaments={isTournaments}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            t={t}
          />
        }
        ListFooterComponent={
          displayData.length > 0 ? (
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
            tintColor="#4edea3"
            colors={["#4edea3"]}
          />
        }
      />

      <AuthModal visible={authModalVisible} onClose={() => setAuthModalVisible(false)} />
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
  headerContainer: {
    marginBottom: 8,
  },
  heroCard: {
    backgroundColor: ScoreBoardTheme.surfaceContainerLow,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderGhost,
    padding: 16,
    marginVertical: 12,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(79, 70, 229, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(79, 70, 229, 0.35)",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: ScoreBoardTheme.primary,
  },
  liveBadgeText: {
    fontSize: 9,
    fontWeight: "900",
    color: ScoreBoardTheme.primary,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  statsPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(25, 31, 49, 0.7)",
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderGhost,
    gap: 8,
  },
  statCol: {
    alignItems: "center",
  },
  statNumPrimary: {
    fontSize: 12,
    fontWeight: "900",
    color: ScoreBoardTheme.primary,
  },
  statNumSecondary: {
    fontSize: 12,
    fontWeight: "900",
    color: ScoreBoardTheme.secondary,
  },
  statNumAmber: {
    fontSize: 12,
    fontWeight: "900",
    color: "#fbbf24",
  },
  statLabel: {
    fontSize: 8,
    fontWeight: "700",
    color: "rgba(220, 225, 251, 0.45)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 16,
    backgroundColor: ScoreBoardTheme.borderGhost,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: ScoreBoardTheme.onSurface,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 12,
    fontWeight: "500",
    color: "rgba(220, 225, 251, 0.65)",
    lineHeight: 17,
  },
  segmentContainer: {
    flexDirection: "row",
    backgroundColor: ScoreBoardTheme.surfaceContainerLow,
    borderRadius: 14,
    padding: 3,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderGhost,
    marginBottom: 8,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
  },
  segmentBtnActive: {
    backgroundColor: ScoreBoardTheme.primaryContainer,
  },
  segmentText: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(220, 225, 251, 0.5)",
  },
  segmentTextActive: {
    color: "#ffffff",
    fontWeight: "900",
  },
  viewModeBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    marginTop: 8,
    marginBottom: 6,
  },
  resultCountText: {
    fontSize: 11,
    fontWeight: "800",
    color: "rgba(220, 225, 251, 0.5)",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  viewModeToggle: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: ScoreBoardTheme.surfaceContainerLow,
    borderRadius: 10,
    padding: 2,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderGhost,
  },
  toggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  toggleBtnActive: {
    backgroundColor: ScoreBoardTheme.primaryContainer,
  },
  toggleBtnText: {
    fontSize: 10,
    fontWeight: "700",
    color: "rgba(220, 225, 251, 0.5)",
  },
  toggleBtnTextActive: {
    color: "#ffffff",
    fontWeight: "800",
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: "rgba(220, 225, 251, 0.6)",
    marginTop: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: ScoreBoardTheme.onSurface,
  },
  emptySubtitle: {
    fontSize: 12,
    color: "rgba(220, 225, 251, 0.5)",
    textAlign: "center",
    maxWidth: 260,
  },
  clearBtn: {
    marginTop: 8,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 9999,
  },
  clearBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: ScoreBoardTheme.primary,
  },
});
