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
import { FeedHeader } from "@/components/FeedHeader";
import { TournamentCard } from "@/components/TournamentCard";
import { Pagination } from "@/components/Pagination";
import { AuthModal } from "@/components/AuthModal";
import { useTranslation } from "@/lib/i18n";
import { supabase } from "@/lib/supabase/client";
import { ScoreBoardTheme } from "@/constants/theme";

const TOURNAMENTS_PER_PAGE = 8;

export default function TournamentsFeedScreen() {
  const { t } = useTranslation();
  const flatListRef = useRef<FlatList>(null);

  const [selectedSport, setSelectedSport] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [authModalVisible, setAuthModalVisible] = useState(false);

  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Fetch tournaments
  const fetchTournaments = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("tournaments")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (data) setTournaments(data);
    } catch (e) {
      console.warn("Error loading tournaments:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTournaments();

    const channelId = `realtime-tournaments-feed-${Math.random().toString(36).slice(2, 9)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tournaments" },
        (payload) => {
          if (payload.eventType === "UPDATE") {
            setTournaments((prev) =>
              prev.map((item) => (item.id === payload.new.id ? { ...item, ...payload.new } : item))
            );
          } else if (payload.eventType === "INSERT") {
            setTournaments((prev) => [payload.new, ...prev]);
          } else if (payload.eventType === "DELETE") {
            setTournaments((prev) => prev.filter((item) => item.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTournaments]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTournaments();
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

  // Filter tournaments
  const filteredTournaments = useMemo(() => {
    return tournaments.filter((tItem) => {
      if (selectedSport !== "all" && tItem.sport_type?.toLowerCase() !== selectedSport.toLowerCase()) {
        return false;
      }
      if (statusFilter !== "all" && tItem.status?.toLowerCase() !== statusFilter.toLowerCase()) {
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
  }, [tournaments, selectedSport, statusFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredTournaments.length / TOURNAMENTS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedData = useMemo(() => {
    const start = (safePage - 1) * TOURNAMENTS_PER_PAGE;
    return filteredTournaments.slice(start, start + TOURNAMENTS_PER_PAGE);
  }, [filteredTournaments, safePage]);

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
          {t("home.noTournamentsFound") || "No tournaments found"}
        </Text>
        <Text style={styles.emptySubtitle}>
          {hasActiveFilters
            ? t("home.noMatchesFilterDesc") || "Try adjusting your filters or search term."
            : t("home.noTournamentsFound")}
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

      {/* Persistent Filters & Search (Placed outside FlatList to prevent focus loss) */}
      <FeedHeader
        selectedSport={selectedSport}
        onSportChange={handleSportChange}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        statusFilter={statusFilter}
        onStatusChange={handleStatusChange}
        displayCount={filteredTournaments.length}
        countLabel={t("nav.tournaments") || "Tournaments"}
        showViewToggle={false}
      />

      {/* Tournaments Feed List */}
      <FlatList
        ref={flatListRef}
        data={paginatedData}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <TournamentCard
            tournament={item}
            onAuthRequired={() => setAuthModalVisible(true)}
          />
        )}
        ListFooterComponent={
          filteredTournaments.length > 0 ? (
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
});
