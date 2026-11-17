import React, { useState, useEffect } from "react";
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
import { TournamentCard } from "@/components/TournamentCard";
import { TopBar } from "@/components/TopBar";
import { ScoreBoardTheme } from "@/constants/theme";
import { useLanguage } from "@/lib/i18n";
import { supabase } from "@/lib/supabase/client";

export default function PublicUserProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const router = useRouter();
  const { t } = useLanguage();

  const [profileUser, setProfileUser] = useState<any | null>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"matches" | "tournaments">("matches");

  const usernameStr = (Array.isArray(username) ? username[0] : username) || "";

  useEffect(() => {
    if (!usernameStr) return;

    const fetchUserProfile = async () => {
      try {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          usernameStr
        );

        let query = supabase.from("users").select("id, username, email, subscription_tier, created_at");
        if (isUuid) {
          query = query.or(`id.eq.${usernameStr},username.ilike.${usernameStr}`);
        } else {
          query = query.ilike("username", usernameStr);
        }

        const { data: uData, error: uErr } = await query.maybeSingle();

        if (uData) {
          setProfileUser(uData);

          const [mRes, tRes] = await Promise.all([
            supabase
              .from("matches")
              .select("*, tournaments(name)")
              .eq("organizer_id", uData.id)
              .order("created_at", { ascending: false })
              .limit(50),
            supabase
              .from("tournaments")
              .select("*")
              .eq("organizer_id", uData.id)
              .order("created_at", { ascending: false })
              .limit(50),
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

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={ScoreBoardTheme.onSurfaceVariant} />
        </View>
      </SafeAreaView>
    );
  }

  if (!profileUser) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <Ionicons name="person-remove-outline" size={48} color="#ef4444" />
          <Text style={styles.emptyTitle}>Utilizador não encontrado</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>{t("common.back") || "Voltar"}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      {/* Main Global TopBar */}
      <TopBar />

      {/* Top Bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#f8fafc" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Perfil Público
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* User Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarText}>
              {(profileUser.username?.[0] || profileUser.email?.[0] || "U").toUpperCase()}
            </Text>
          </View>

          <Text style={styles.usernameText}>
            @{profileUser.username || profileUser.email?.split("@")[0]}
          </Text>

          <View style={styles.tierBadge}>
            <Ionicons name="shield-checkmark" size={14} color="#4edea3" />
            <Text style={styles.tierText}>
              {profileUser.subscription_tier === "pro" ? "PRO ORGANIZER" : "SCOREBOARD MEMBER"}
            </Text>
          </View>

          {/* Quick Stats Grid */}
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{matches.length}</Text>
              <Text style={styles.statLabel}>Jogos</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{tournaments.length}</Text>
              <Text style={styles.statLabel}>Torneios</Text>
            </View>
          </View>
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === "matches" && styles.tabBtnActive]}
            onPress={() => setActiveTab("matches")}
          >
            <Text style={[styles.tabText, activeTab === "matches" && styles.tabTextActive]}>
              Jogos Criados ({matches.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === "tournaments" && styles.tabBtnActive]}
            onPress={() => setActiveTab("tournaments")}
          >
            <Text style={[styles.tabText, activeTab === "tournaments" && styles.tabTextActive]}>
              Torneios ({tournaments.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {activeTab === "matches" ? (
          matches.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyCardText}>Nenhum jogo público criado por este utilizador.</Text>
            </View>
          ) : (
            matches.map((m) => <MatchCard key={m.id} match={m} />)
          )
        ) : tournaments.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyCardText}>Nenhum torneio público organizado.</Text>
          </View>
        ) : (
          tournaments.map((t) => <TournamentCard key={t.id} tournament={t} />)
        )}
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
    borderBottomWidth: 1,
    borderBottomColor: ScoreBoardTheme.borderSubtle,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: ScoreBoardTheme.onSurface,
  },
  iconBtn: {
    padding: 4,
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: ScoreBoardTheme.surfaceContainer,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    marginBottom: 20,
  },
  avatarLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: ScoreBoardTheme.surfaceContainerHighest,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: "800",
    color: ScoreBoardTheme.onSurface,
  },
  usernameText: {
    fontSize: 18,
    fontWeight: "800",
    color: ScoreBoardTheme.onSurface,
    marginBottom: 8,
  },
  tierBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    marginBottom: 20,
  },
  tierText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#10b981",
    letterSpacing: 1,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    borderTopWidth: 1,
    borderTopColor: ScoreBoardTheme.borderSubtle,
    paddingTop: 16,
  },
  statBox: {
    flex: 1,
    alignItems: "center",
  },
  statNum: {
    fontSize: 20,
    fontWeight: "800",
    color: ScoreBoardTheme.onSurface,
  },
  statLabel: {
    fontSize: 11,
    color: ScoreBoardTheme.textMuted,
    marginTop: 2,
    textTransform: "uppercase",
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: ScoreBoardTheme.borderSubtle,
  },
  tabsRow: {
    flexDirection: "row",
    backgroundColor: ScoreBoardTheme.surfaceContainer,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: "center",
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: ScoreBoardTheme.surfaceContainerHighest,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.onSurfaceVariant,
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
