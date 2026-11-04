import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import * as ScreenOrientation from "expo-screen-orientation";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/components/AuthProvider";
import { useLanguage } from "@/lib/i18n";
import { supabase } from "@/lib/supabase/client";
import { OfflineSyncBadge } from "@/components/OfflineSyncBadge";
import { initOfflineNetworkSync } from "@/lib/offline/offlineQueue";

import { TennisScoreboard } from "@/components/scoreboards/TennisScoreboard";
import { VolleyballScoreboard } from "@/components/scoreboards/VolleyballScoreboard";
import { FootballScoreboard } from "@/components/scoreboards/FootballScoreboard";
import { BasketballScoreboard } from "@/components/scoreboards/BasketballScoreboard";

export default function RefereeScoreboardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useLanguage();
  const { user } = useAuth();

  const [match, setMatch] = useState<any | null>(null);
  const [rules, setRules] = useState<any>({});
  const [loading, setLoading] = useState(true);

  const matchIdStr = (Array.isArray(id) ? id[0] : id) || "";

  // Screen keep awake management & Force Landscape on Scoreboard
  useEffect(() => {
    activateKeepAwakeAsync();
    async function lockLandscape() {
      try {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
      } catch (e) {
        console.warn("Could not lock orientation to landscape:", e);
      }
    }
    lockLandscape();

    return () => {
      deactivateKeepAwake();
      ScreenOrientation.unlockAsync().catch(() => {});
    };
  }, []);

  // Fetch match details and subscribe
  useEffect(() => {
    if (!matchIdStr) return;

    const unsubSync = initOfflineNetworkSync(supabase);

    const fetchMatch = async () => {
      try {
        const { data, error } = await supabase
          .from("matches")
          .select("*, tournaments(*)")
          .eq("id", matchIdStr)
          .single();

        if (error) throw error;
        setMatch(data);

        // Resolve rules
        const isVolleyball = data.sport_type === "Volleyball";
        const baseDefaults = {
          max_sets: isVolleyball ? 3 : 3,
          points_per_set: isVolleyball ? 25 : 21,
          point_cap: null,
        };

        if (data.tournament_id && data.tournaments?.settings) {
          const tSettings = data.tournaments.settings;
          const overrides = tSettings.overrides?.[data.round_number] || {};
          setRules({ ...baseDefaults, ...tSettings.default, ...overrides });
        } else {
          setRules({ ...baseDefaults, ...(data.settings || {}) });
        }
      } catch (e) {
        console.warn("Failed to load match for scoreboard:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchMatch();

    const channel = supabase
      .channel(`match:${matchIdStr}`)
      .on("broadcast", { event: "score_update" }, (response: any) => {
        const payload = response?.payload;
        if (payload?.match_id === matchIdStr && payload.scores) {
          setMatch((prev: any) => ({
            ...prev,
            scores: payload.scores ?? prev?.scores,
            status: payload.status ?? prev?.status,
          }));
        }
      })
      .on("broadcast", { event: "SCORE_UPDATED" }, (response: any) => {
        const payload = response?.payload;
        if (payload?.match_id === matchIdStr && payload.scores) {
          setMatch((prev: any) => ({
            ...prev,
            scores: payload.scores ?? prev?.scores,
            status: payload.status ?? prev?.status,
          }));
        }
      })
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "matches", filter: `id=eq.${matchIdStr}` },
        (payload) => {
          if (payload.new) {
            setMatch((prev: any) => ({ ...prev, ...payload.new }));
          }
        }
      )
      .subscribe();

    return () => {
      unsubSync();
      supabase.removeChannel(channel);
    };
  }, [matchIdStr]);

  const isOrganizer = Boolean(user && match?.organizer_id === user.id);
  const isUmpire = Boolean(
    user && match?.umpire_id === user.id && match?.umpire_invite_status === "accepted"
  );
  const canEdit = Boolean(isOrganizer || isUmpire);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#4edea3" />
          <Text style={styles.loadingText}>{t("scoreboard.preparingConsole") || "A preparar consola de arbitragem..."}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!match) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
          <Text style={styles.errorTitle}>{t("match.notFound") || "Jogo não encontrado"}</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>{t("common.back") || "Voltar"}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Render sport-specific console
  const renderScoreboard = () => {
    switch (match.sport_type) {
      case "Tennis":
      case "Padel":
        return <TennisScoreboard matchData={match} rules={rules} canEdit={canEdit} />;
      case "Volleyball":
      case "Beach Volleyball":
        return <VolleyballScoreboard matchData={match} rules={rules} canEdit={canEdit} />;
      case "Football":
        return <FootballScoreboard matchData={match} rules={rules} canEdit={canEdit} />;
      case "Basketball":
        return <BasketballScoreboard matchData={match} rules={rules} canEdit={canEdit} />;
      default:
        return <TennisScoreboard matchData={match} rules={rules} canEdit={canEdit} />;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      {/* Top Referee Bar */}
      <View style={styles.refereeHeader}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#f8fafc" />
        </TouchableOpacity>

        <View style={styles.headerTitleBox}>
          <Text style={styles.refereeTitle}>{t("scoreboard.refereeConsole") || "CONSOLA DE ÁRBITRO"}</Text>
          <Text style={styles.headerSport} numberOfLines={1}>
            {match.sport_type} • {match.court || t("scoreboard.mainCourt") || "Campo Principal"}
          </Text>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <OfflineSyncBadge matchId={match.id} />
          <View style={styles.wakeLockBadge}>
            <Ionicons name="flash" size={14} color="#4edea3" />
            <Text style={styles.wakeLockText}>{t("scoreboard.screenActive") || "ECRÃ ATIVO"}</Text>
          </View>
        </View>
      </View>

      {!canEdit && (
        <View style={styles.spectatorBanner}>
          <Ionicons name="eye-outline" size={18} color="#fbbf24" />
          <Text style={styles.spectatorBannerText}>
            {t("scoreboard.spectatorModeNotice") || "Modo Visualização: Apenas o árbitro designado ou o organizador podem registar pontos."}
          </Text>
        </View>
      )}

      {renderScoreboard()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#080c14",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loadingText: {
    marginTop: 14,
    color: "#94a3b8",
    fontSize: 14,
  },
  errorTitle: {
    fontSize: 16,
    color: "#f8fafc",
    fontWeight: "700",
    marginTop: 12,
    marginBottom: 16,
  },
  backBtn: {
    backgroundColor: "#1e293b",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backBtnText: {
    color: "#f8fafc",
    fontWeight: "600",
  },
  refereeHeader: {
    height: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
    backgroundColor: "#0d1322",
  },
  iconBtn: {
    padding: 4,
  },
  headerTitleBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  refereeTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#4edea3",
    letterSpacing: 1.2,
  },
  headerSport: {
    fontSize: 11,
    color: "#94a3b8",
  },
  wakeLockBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(78, 222, 163, 0.12)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  wakeLockText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#4edea3",
  },
  spectatorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(251, 191, 36, 0.12)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(251, 191, 36, 0.3)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  spectatorBannerText: {
    color: "#fbbf24",
    fontSize: 11,
    fontWeight: "600",
    flex: 1,
  },
});
