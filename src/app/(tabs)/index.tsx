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
import { AuthModal } from "@/components/AuthModal";
import { useAuth } from "@/components/AuthProvider";
import { useTranslation } from "@/lib/i18n";
import { useFollow } from "@/lib/hooks/useFollow";
import { supabase } from "@/lib/supabase/client";
import { ScoreBoardTheme } from "@/constants/theme";

export default function FeedScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { followedMatchIds, followedTournamentIds } = useFollow();

  const [activeSegment, setActiveSegment] = useState<"matches" | "tournaments" | "following">("matches");
  const [selectedSport, setSelectedSport] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
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

  const clearFilters = () => {
    setSelectedSport("all");
    setStatusFilter("all");
    setSearchQuery("");
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

  const renderHeader = () => (
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
          onPress={() => setActiveSegment("matches")}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.segmentText,
              activeSegment === "matches" && styles.segmentTextActive,
            ]}
          >
            {t("nav.matches") || "Matches"} ({filteredMatches.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, activeSegment === "tournaments" && styles.segmentBtnActive]}
          onPress={() => setActiveSegment("tournaments")}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.segmentText,
              activeSegment === "tournaments" && styles.segmentTextActive,
            ]}
          >
            {t("nav.tournaments") || "Tournaments"} ({filteredTournaments.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, activeSegment === "following" && styles.segmentBtnActive]}
          onPress={() => setActiveSegment("following")}
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
      <SportFilterBar selectedSport={selectedSport} onSelectSport={setSelectedSport} />

      {/* Search Bar & Status Filter */}
      <SearchBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
      />
    </View>
  );

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

  const isTournaments = activeSegment === "tournaments";
  const displayData = isTournaments ? filteredTournaments : filteredMatches;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      {/* Top Application Bar */}
      <TopBar onSearchPress={() => {}} />

      {/* Feed List */}
      <FlatList
        data={displayData}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) =>
          isTournaments ? (
            <TournamentCard
              tournament={item}
              onAuthRequired={() => setAuthModalVisible(true)}
            />
          ) : (
            <MatchCard match={item} onAuthRequired={() => setAuthModalVisible(true)} />
          )
        }
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
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
