import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { MatchCard } from "@/components/MatchCard";
import { GroupedMatchList } from "@/components/GroupedMatchList";
import { TournamentCard } from "@/components/TournamentCard";
import { TopBar } from "@/components/TopBar";
import { FeedHeader } from "@/components/FeedHeader";
import { Pagination } from "@/components/Pagination";
import { MatchAtmosphereBackground } from "@/components/match/MatchAtmosphereBackground";
import { ScoreBoardTheme } from "@/constants/theme";
import { useLanguage } from "@/lib/i18n";
import { supabase } from "@/lib/supabase/client";

const ITEMS_PER_PAGE = 10;

export default function PublicUserProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const router = useRouter();
  const { t, locale } = useLanguage();
  const isPt = locale === "pt";

  const [profileUser, setProfileUser] = useState<any | null>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"matches" | "tournaments">("matches");

  const [selectedSport, setSelectedSport] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [viewMode, setViewMode] = useState<"list" | "cards">("list");
  const [currentPage, setCurrentPage] = useState<number>(1);

  const usernameStr = (Array.isArray(username) ? username[0] : username) || "";

  useEffect(() => {
    if (!usernameStr) return;

    const fetchUserProfile = async () => {
      try {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          usernameStr
        );

        let query = supabase
          .from("users")
          .select("id, username, subscription_tier, created_at");
        if (isUuid) {
          query = query.or(`id.eq.${usernameStr},username.ilike.${usernameStr}`);
        } else {
          query = query.ilike("username", usernameStr);
        }

        const { data: uData } = await query.maybeSingle();

        if (uData) {
          setProfileUser(uData);

          const [mRes, tRes] = await Promise.all([
            supabase
              .from("matches")
              .select("id, tournament_id, organizer_id, umpire_id, sport_type, status, participants, scores, scheduled_at, created_at, tournaments(name)")
              .eq("organizer_id", uData.id)
              .order("created_at", { ascending: false })
              .limit(100),
            supabase
              .from("tournaments")
              .select("id, name, sport_type, status, visibility, start_date, end_date, organizer_id, created_at")
              .eq("organizer_id", uData.id)
              .order("created_at", { ascending: false })
              .limit(100),
          ]);

          if (mRes.data) setMatches(mRes.data);
          if (tRes.data) setTournaments(tRes.data);
        }
      } catch (e) {
        console.warn("Public profile load error:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [usernameStr]);

  const filteredItems = useMemo(() => {
    const source = activeTab === "matches" ? matches : tournaments;
    const filtered = source.filter((item) => {
      if (
        selectedSport !== "all" &&
        item.sport_type?.toLowerCase() !== selectedSport.toLowerCase()
      ) {
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
        const sport = item.sport_type?.toLowerCase() || "";
        if (
          !p1.includes(q) &&
          !p2.includes(q) &&
          !name.includes(q) &&
          !tName.includes(q) &&
          !sport.includes(q)
        ) {
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
  }, [activeTab, matches, tournaments, selectedSport, statusFilter, searchQuery, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedItems = useMemo(() => {
    const start = (safePage - 1) * ITEMS_PER_PAGE;
    return filteredItems.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredItems, safePage]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <MatchAtmosphereBackground sportType="random" mode="spectator" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={ScoreBoardTheme.onSurfaceVariant} />
        </View>
      </SafeAreaView>
    );
  }

  if (!profileUser) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <MatchAtmosphereBackground sportType="random" mode="spectator" />
        <View style={styles.centered}>
          <Ionicons name="person-remove-outline" size={48} color="#ef4444" />
          <Text style={styles.emptyTitle}>
            {isPt ? "Utilizador não encontrado" : "User not found"}
          </Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>{t("common.back") || "Back"}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const displayUsername =
    profileUser.username || profileUser.email?.split("@")[0] || "user";
  const memberSince = profileUser.created_at
    ? new Date(profileUser.created_at).toLocaleDateString(
        isPt ? "pt-PT" : "en-US",
        { month: "short", year: "numeric" }
      )
    : null;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <MatchAtmosphereBackground sportType="random" mode="spectator" />
      <TopBar />

      {/* Top Bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={18} color={ScoreBoardTheme.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {isPt ? "Perfil Público" : "Public Profile"}
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Compact User Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileTopRow}>
            <View style={styles.usernamePill}>
              <Ionicons name="person-outline" size={13} color={ScoreBoardTheme.textMuted} />
              <Text style={styles.usernamePillText} numberOfLines={1}>
                @{displayUsername}
              </Text>
            </View>

            <View style={styles.tierBadge}>
              <Text style={styles.tierText}>
                {profileUser.subscription_tier === "pro"
                  ? "PRO"
                  : isPt
                  ? "ORGANIZADOR"
                  : "ORGANIZER"}
              </Text>
            </View>
          </View>

          {memberSince && (
            <View style={styles.memberSinceRow}>
              <Ionicons name="calendar-outline" size={12} color={ScoreBoardTheme.textMuted} />
              <Text style={styles.memberSinceText}>
                {isPt ? `Membro desde ${memberSince}` : `Member since ${memberSince}`}
              </Text>
            </View>
          )}
        </View>

        {/* Tab Switcher with Counts */}
        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === "matches" && styles.tabBtnActive]}
            onPress={() => {
              setActiveTab("matches");
              setCurrentPage(1);
            }}
          >
            <Text style={[styles.tabText, activeTab === "matches" && styles.tabTextActive]}>
              {isPt ? `Jogos (${matches.length})` : `Matches (${matches.length})`}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === "tournaments" && styles.tabBtnActive]}
            onPress={() => {
              setActiveTab("tournaments");
              setCurrentPage(1);
            }}
          >
            <Text style={[styles.tabText, activeTab === "tournaments" && styles.tabTextActive]}>
              {isPt ? `Torneios (${tournaments.length})` : `Tournaments (${tournaments.length})`}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Unified FeedHeader */}
        <View style={{ marginHorizontal: -16, marginBottom: 4 }}>
          <FeedHeader
            selectedSport={selectedSport}
            onSportChange={(s) => {
              setSelectedSport(s);
              setCurrentPage(1);
            }}
            searchQuery={searchQuery}
            onSearchChange={(q) => {
              setSearchQuery(q);
              setCurrentPage(1);
            }}
            statusFilter={statusFilter}
            onStatusChange={(st) => {
              setStatusFilter(st);
              setCurrentPage(1);
            }}
            displayCount={filteredItems.length}
            countLabel={activeTab}
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
            currentTab={activeTab}
          />
        </View>

        {/* Filtered & Paginated Content */}
        {paginatedItems.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyCardText}>
              {activeTab === "matches"
                ? isPt
                  ? "Nenhum jogo público encontrado."
                  : "No public matches found."
                : isPt
                ? "Nenhum torneio público encontrado."
                : "No public tournaments found."}
            </Text>
          </View>
        ) : activeTab === "matches" ? (
          viewMode === "list" ? (
            <GroupedMatchList matches={paginatedItems} showOrganizer={false} />
          ) : (
            paginatedItems.map((m) => <MatchCard key={m.id} match={m} />)
          )
        ) : (
          paginatedItems.map((tItem) => (
            <TournamentCard
              key={tItem.id}
              tournament={tItem}
              compact={viewMode === "list"}
            />
          ))
        )}

        <Pagination
          currentPage={safePage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: ScoreBoardTheme.background,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  header: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: ScoreBoardTheme.onSurface,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: ScoreBoardTheme.surfaceContainer,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    padding: 16,
    paddingTop: 4,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: ScoreBoardTheme.surfaceContainer,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    gap: 10,
  },
  profileTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  usernamePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: ScoreBoardTheme.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    flexShrink: 1,
  },
  usernamePillText: {
    fontSize: 14,
    fontWeight: "600",
    color: ScoreBoardTheme.onSurface,
  },
  tierBadge: {
    backgroundColor: ScoreBoardTheme.surfaceContainerHighest,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tierText: {
    fontSize: 10,
    fontWeight: "700",
    color: ScoreBoardTheme.onSurfaceVariant,
    letterSpacing: 0.8,
  },
  memberSinceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  memberSinceText: {
    fontSize: 12,
    color: ScoreBoardTheme.textMuted,
  },
  tabsRow: {
    flexDirection: "row",
    backgroundColor: ScoreBoardTheme.surfaceContainer,
    borderRadius: 10,
    padding: 3,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    gap: 3,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 7,
  },
  tabBtnActive: {
    backgroundColor: ScoreBoardTheme.surfaceContainerHighest,
  },
  tabText: {
    fontSize: 12,
    fontWeight: "600",
    color: ScoreBoardTheme.textMuted,
  },
  tabTextActive: {
    color: ScoreBoardTheme.onSurface,
    fontWeight: "700",
  },
  emptyCard: {
    backgroundColor: ScoreBoardTheme.surfaceContainer,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    borderRadius: 14,
    padding: 24,
    alignItems: "center",
  },
  emptyCardText: {
    color: ScoreBoardTheme.textMuted,
    fontSize: 13,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: ScoreBoardTheme.onSurface,
    marginTop: 12,
    marginBottom: 4,
  },
  backBtn: {
    marginTop: 16,
    backgroundColor: ScoreBoardTheme.surfaceContainerHighest,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backBtnText: {
    color: ScoreBoardTheme.onSurface,
    fontWeight: "600",
  },
});
