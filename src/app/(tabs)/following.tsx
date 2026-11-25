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
import { MatchAtmosphereBackground } from "@/components/match/MatchAtmosphereBackground";
import { FeedHeader } from "@/components/FeedHeader";
import { MatchCard } from "@/components/MatchCard";
import { MatchListSkeleton } from "@/components/common/Skeleton";
import { GroupedMatchList } from "@/components/GroupedMatchList";
import { TournamentCard } from "@/components/TournamentCard";
import { Pagination } from "@/components/Pagination";
import { AuthModal } from "@/components/AuthModal";
import { useAuth } from "@/components/AuthProvider";
import { useFollow } from "@/lib/hooks/useFollow";
import { useTranslation } from "@/lib/i18n";
import { supabase } from "@/lib/supabase/client";
import { ScoreBoardTheme } from "@/constants/theme";

const ITEMS_PER_PAGE = 10;

export default function FollowingFeedScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { followedMatchIds, followedTournamentIds } = useFollow();
  const flatListRef = useRef<FlatList>(null);

  const [viewMode, setViewMode] = useState<"list" | "cards">("list");
  const [selectedSport, setSelectedSport] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [authModalVisible, setAuthModalVisible] = useState(false);

  const [matches, setMatches] = useState<any[]>([]);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchFollowedData = useCallback(async () => {
    try {
      const matchIds = Array.from(followedMatchIds);
      const tournamentIds = Array.from(followedTournamentIds);

      const [matchesRes, tournamentsRes] = await Promise.all([
        matchIds.length > 0
          ? supabase
              .from("matches")
              .select("id, tournament_id, organizer_id, umpire_id, sport_type, status, participants, scores, round_number, match_order, bracket_type, group_label, court, scheduled_at, created_at, tournaments(name), organizer:users!organizer_id(username)")
              .in("id", matchIds)
              .order("created_at", { ascending: false })
          : Promise.resolve({ data: [] as any[] }),
        tournamentIds.length > 0
          ? supabase
              .from("tournaments")
              .select("id, name, sport_type, status, visibility, start_date, end_date, organizer_id, created_at, organizer:users!organizer_id(username)")
              .in("id", tournamentIds)
              .order("created_at", { ascending: false })
          : Promise.resolve({ data: [] as any[] }),
      ]);

      if (matchesRes.data) setMatches(matchesRes.data);
      if (tournamentsRes.data) setTournaments(tournamentsRes.data);
    } catch (e) {
      console.warn("Error loading following feed:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [followedMatchIds, followedTournamentIds]);

  useEffect(() => {
    fetchFollowedData();
  }, [fetchFollowedData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchFollowedData();
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

  // Filter followed items: union of followed matches and tournaments
  const followedItems = useMemo(() => {
    const followedM = matches
      .filter((m) => followedMatchIds.has(m.id))
      .map((m) => ({ ...m, _type: "match" }));

    const followedT = tournaments
      .filter((tItem) => followedTournamentIds.has(tItem.id))
      .map((tItem) => ({ ...tItem, _type: "tournament" }));

    const combined = [...followedM, ...followedT];

    const filtered = combined.filter((item) => {
      if (selectedSport !== "all" && item.sport_type?.toLowerCase() !== selectedSport.toLowerCase()) {
        return false;
      }
      if (statusFilter !== "all" && item.status?.toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase();
        const p1 = item.participants?.[0]?.name?.toLowerCase() || "";
        const p2 = item.participants?.[1]?.name?.toLowerCase() || "";
        const name = item.name?.toLowerCase() || "";
        const tName = item.tournaments?.name?.toLowerCase() || "";
        if (!p1.includes(q) && !p2.includes(q) && !name.includes(q) && !tName.includes(q)) {
          return false;
        }
      }
      return true;
    });
    return [...filtered].sort((a, b) => {
      const tA = new Date(a.scheduled_at || a.start_date || a.created_at || 0).getTime();
      const tB = new Date(b.scheduled_at || b.start_date || b.created_at || 0).getTime();
      return sortOrder === "desc" ? tB - tA : tA - tB;
    });
  }, [matches, tournaments, followedMatchIds, followedTournamentIds, selectedSport, statusFilter, searchQuery, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(followedItems.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedData = useMemo(() => {
    const start = (safePage - 1) * ITEMS_PER_PAGE;
    return followedItems.slice(start, start + ITEMS_PER_PAGE);
  }, [followedItems, safePage]);

  const renderEmpty = () => {
    if (loading) {
      return <MatchListSkeleton />;
    }

    if (!user) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="lock-closed-outline" size={44} color="rgba(220, 225, 251, 0.3)" />
          <Text style={styles.emptyTitle}>Inicie sessão</Text>
          <Text style={styles.emptySubtitle}>
            Inicie sessão para acompanhar os seus jogos e torneios favoritos em tempo real.
          </Text>
          <TouchableOpacity style={styles.authBtn} onPress={() => setAuthModalVisible(true)}>
            <Text style={styles.authBtnText}>Entrar / Registar</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const hasActiveFilters =
      selectedSport !== "all" || statusFilter !== "all" || searchQuery.trim().length > 0;

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="star-outline" size={44} color="rgba(220, 225, 251, 0.25)" />
        <Text style={styles.emptyTitle}>
          {hasActiveFilters ? "Nenhum favorito encontrado" : "Ainda não segue jogos ou torneios"}
        </Text>
        <Text style={styles.emptySubtitle}>
          {hasActiveFilters
            ? "Tente ajustar os filtros ou termo de pesquisa."
            : "Toque no ícone de estrela nos jogos ou torneios para os acompanhar aqui."}
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

      {/* Persistent Filters & Search (Outside FlatList to prevent focus loss) */}
      <FeedHeader
        selectedSport={selectedSport}
        onSportChange={handleSportChange}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        statusFilter={statusFilter}
        onStatusChange={handleStatusChange}
        displayCount={followedItems.length}
        countLabel={t("common.following") || "Following"}
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
        currentTab="following"
      />

      {/* Following Feed List */}
      <FlatList
        ref={flatListRef}
        data={
          viewMode === "list"
            ? paginatedData.length > 0
              ? [{ id: "__grouped__", _type: "__grouped__" }]
              : []
            : paginatedData
        }
        keyExtractor={(item) => `${item._type}-${item.id}`}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) =>
          viewMode === "list" ? (
            <View style={{ gap: 12 }}>
              {paginatedData
                .filter((x) => x._type === "tournament")
                .map((tItem) => (
                  <TournamentCard
                    key={`tournament-${tItem.id}`}
                    tournament={tItem}
                    compact
                    onAuthRequired={() => setAuthModalVisible(true)}
                  />
                ))}
              {paginatedData.some((x) => x._type !== "tournament") && (
                <GroupedMatchList
                  matches={paginatedData.filter((x) => x._type !== "tournament")}
                  onAuthRequired={() => setAuthModalVisible(true)}
                />
              )}
            </View>
          ) : item._type === "tournament" ? (
            <TournamentCard
              tournament={item}
              compact={false}
              onAuthRequired={() => setAuthModalVisible(true)}
            />
          ) : (
            <MatchCard match={item} onAuthRequired={() => setAuthModalVisible(true)} />
          )
        }
        ListFooterComponent={
          followedItems.length > 0 ? (
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
    fontWeight: "700",
    color: "rgba(220, 225, 251, 0.6)",
    letterSpacing: 0.5,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: ScoreBoardTheme.onSurface,
    marginTop: 12,
    letterSpacing: 0.2,
  },
  emptySubtitle: {
    fontSize: 12,
    fontWeight: "500",
    color: "rgba(220, 225, 251, 0.4)",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },
  clearBtn: {
    marginTop: 18,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  clearBtnText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#ffffff",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  authBtn: {
    marginTop: 18,
    backgroundColor: ScoreBoardTheme.onSurface,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  authBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: ScoreBoardTheme.surfaceContainerLowest,
    letterSpacing: 0.5,
  },
});
