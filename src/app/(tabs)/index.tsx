import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { TopBar } from "@/components/TopBar";
import { FeedHeader } from "@/components/FeedHeader";
import { MatchCard } from "@/components/MatchCard";
import { MatchListItem } from "@/components/MatchListItem";
import { GroupedMatchList } from "@/components/GroupedMatchList";
import { Pagination } from "@/components/Pagination";
import { AuthModal } from "@/components/AuthModal";
import { CreateMatchModal } from "@/components/match/CreateMatchModal";
import { MatchListSkeleton } from "@/components/common/Skeleton";
import { MatchAtmosphereBackground } from "@/components/match/MatchAtmosphereBackground";
import { GuestLandingHero } from "@/components/home/GuestLandingHero";
import {
  TechnicalCapabilitiesSection,
  SectionDivider,
} from "@/components/home/TechnicalCapabilitiesSection";
import { useAuth } from "@/components/AuthProvider";
import { useSafeRefresh } from "@/lib/hooks/useSafeRefresh";
import { useTranslation } from "@/lib/i18n";
import { supabase } from "@/lib/supabase/client";
import { ScoreBoardTheme } from "@/constants/theme";

const MATCHES_PER_PAGE = 12;

export default function MatchesFeedScreen() {
  const { t, locale } = useTranslation();
  const { user } = useAuth();
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const feedDividerYRef = useRef<number>(0);
  const { refreshEnabled, scrollHandlers } = useSafeRefresh();

  const [viewMode, setViewMode] = useState<"list" | "cards">("list");
  const [selectedSport, setSelectedSport] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [authModalVisible, setAuthModalVisible] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<"login" | "signup">("login");
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

  const guestMatches = useMemo(() => {
    const getPriority = (status?: string) => {
      const s = status?.toLowerCase();
      if (s === "ongoing" || s === "live") return 0;
      if (s === "scheduled" || s === "upcoming") return 1;
      return 2;
    };

    const sorted = [...matches].sort((a, b) => {
      const pDiff = getPriority(a.status) - getPriority(b.status);
      if (pDiff !== 0) return pDiff;
      const tA = new Date(a.scheduled_at || a.created_at || 0).getTime();
      const tB = new Date(b.scheduled_at || b.created_at || 0).getTime();
      return tB - tA;
    });

    const seenTournaments = new Set<string>();
    const picked: any[] = [];
    for (const m of sorted) {
      if (m.tournament_id) {
        if (seenTournaments.has(m.tournament_id)) continue;
        seenTournaments.add(m.tournament_id);
      }
      picked.push(m);
      if (picked.length >= 6) break;
    }
    return picked;
  }, [matches]);

  const openAuthModal = (mode: "login" | "signup" = "login") => {
    setAuthModalMode(mode);
    setAuthModalVisible(true);
  };

  const handleDeleteMatch = useCallback(
    (matchId: string) => {
      Alert.alert(
        t("match.deleteMatch"),
        t("match.deleteMatchConfirm"),
        [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("common.delete"),
            style: "destructive",
            onPress: async () => {
              try {
                const { error } = await supabase
                  .from("matches")
                  .delete()
                  .eq("id", matchId);
                if (error) throw error;
                setMatches((prev) => prev.filter((m) => m.id !== matchId));
              } catch (e: any) {
                Alert.alert(
                  locale === "pt" ? "Erro" : "Error",
                  e?.message || (locale === "pt" ? "Erro ao eliminar jogo." : "Failed to delete match.")
                );
              }
            },
          },
        ]
      );
    },
    [t, locale]
  );

  const renderEmpty = () => {
    if (loading) {
      return <MatchListSkeleton />;
    }

    if (!user) {
      return (
        <View style={styles.guestEmptyCard}>
          <View style={styles.guestEmptyIconBox}>
            <Ionicons name="trophy-outline" size={24} color={ScoreBoardTheme.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>
            {t("home.noMatchesFound") || "No matches found"}
          </Text>
          <Text style={styles.emptySubtitle}>
            {locale === "pt"
              ? "Ainda não existem jogos em direto ou recentes disponíveis."
              : "No live or recent matches are available right now."}
          </Text>
          <View style={styles.guestEmptyActions}>
            <TouchableOpacity
              style={styles.clearBtn}
              onPress={() => router.push("/(tabs)/tournaments" as any)}
            >
              <Text style={styles.clearBtnText}>
                {t("nav.tournaments") || "Tournaments"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.clearBtn} onPress={clearFilters}>
              <Text style={styles.clearBtnText}>
                {t("common.clearFilters") || "Clear Filters"}
              </Text>
            </TouchableOpacity>
          </View>
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

      {/* Persistent Filters & Search (Authenticated only) */}
      {user && (
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
          onPrimaryAction={() => setCreateModalVisible(true)}
        />
      )}

      {/* Matches Feed List */}
      <FlatList
        ref={flatListRef}
        data={
          !user
            ? guestMatches
            : viewMode === "list"
            ? paginatedData.length > 0
              ? [{ id: "__grouped__" }]
              : []
            : paginatedData
        }
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          !user ? (
            <>
              <GuestLandingHero
                onGetStarted={() => openAuthModal("signup")}
                onWatchLiveFeeds={() =>
                  flatListRef.current?.scrollToOffset({
                    offset: feedDividerYRef.current,
                    animated: true,
                  })
                }
              />
              <View
                onLayout={(e) => {
                  feedDividerYRef.current = e.nativeEvent.layout.y;
                }}
              >
                <SectionDivider
                  label={
                    locale === "pt"
                      ? "JOGOS EM DIRETO E RECENTES"
                      : "LIVE & RECENT MATCHES"
                  }
                />
              </View>
            </>
          ) : undefined
        }
        renderItem={({ item }) =>
          !user ? (
            <MatchListItem
              match={item}
              showFavorite={false}
              onAuthRequired={() => openAuthModal("login")}
            />
          ) : viewMode === "list" ? (
            <GroupedMatchList
              matches={paginatedData}
              onAuthRequired={() => openAuthModal("login")}
            />
          ) : (
            <MatchCard
              match={item}
              onAuthRequired={() => openAuthModal("login")}
              canDelete={Boolean(user?.id && item.organizer_id === user.id)}
              onDelete={handleDeleteMatch}
            />
          )
        }
        ListFooterComponent={
          !user ? (
            <TechnicalCapabilitiesSection />
          ) : filteredMatches.length > 0 ? (
            <Pagination
              currentPage={safePage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          ) : undefined
        }
        ListEmptyComponent={renderEmpty()}
        contentContainerStyle={styles.listContent}
        overScrollMode="never"
        {...scrollHandlers}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            enabled={refreshEnabled}
            tintColor={ScoreBoardTheme.onSurfaceVariant}
            colors={[ScoreBoardTheme.onSurfaceVariant]}
          />
        }
      />

      <AuthModal
        visible={authModalVisible}
        initialMode={authModalMode}
        onClose={() => setAuthModalVisible(false)}
      />
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
  guestEmptyCard: {
    backgroundColor: "#11141c",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(238, 240, 245, 0.08)",
    paddingVertical: 32,
    paddingHorizontal: 20,
    alignItems: "center",
    marginVertical: 8,
  },
  guestEmptyIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#161a24",
    borderWidth: 1,
    borderColor: "rgba(238, 240, 245, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  guestEmptyActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
});
