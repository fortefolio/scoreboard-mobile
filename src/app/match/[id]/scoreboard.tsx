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
import { useKeepAwake } from "expo-keep-awake";
import * as ScreenOrientation from "expo-screen-orientation";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/components/AuthProvider";
import { useLanguage } from "@/lib/i18n";
import { supabase } from "@/lib/supabase/client";
import { OfflineSyncBadge } from "@/components/OfflineSyncBadge";
import { initOfflineNetworkSync } from "@/lib/offline/offlineQueue";

import { ScoreBoardTheme } from "@/constants/theme";
import { MatchAtmosphereBackground } from "@/components/match/MatchAtmosphereBackground";
import { ScoreboardProvider } from "@/components/scoreboards/ScoreboardLayout";
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

  // Prevent screen sleep while in scoreboard
  useKeepAwake();

  // Screen orientation management: Lock Landscape on mount, restore Portrait on exit
  useEffect(() => {
    async function lockLandscape() {
      try {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
      } catch (e) {
        console.warn("Could not lock orientation to landscape:", e);
      }
    }
    lockLandscape();

    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
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

    const channelId = `scoreboard:${matchIdStr}:${Math.random().toString(36).slice(2, 9)}`;
    const channel = supabase
      .channel(channelId)
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
          <ActivityIndicator size="large" color={ScoreBoardTheme.onSurfaceVariant} />
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
    <SafeAreaView testID="scoreboard-screen" style={styles.safeArea} edges={["top", "bottom", "left", "right"]}>
      <MatchAtmosphereBackground
        sportType={match.sport_type}
        mode={canEdit ? "umpire" : "spectator"}
        forcedOrientation="landscape"
      />

      {!canEdit && (
        <View style={styles.spectatorBanner}>
          <Ionicons name="eye-outline" size={16} color="#fbbf24" />
          <Text style={styles.spectatorBannerText} numberOfLines={1}>
            {t("scoreboard.spectatorModeNotice") || "Modo Visualização: Apenas o árbitro designado ou o organizador podem registar pontos."}
          </Text>
        </View>
      )}

      <View style={styles.scoreboardShell}>
        <ScoreboardProvider
          onBack={() => router.back()}
          offlineBadge={<OfflineSyncBadge matchId={match.id} />}
        >
          {renderScoreboard()}
        </ScoreboardProvider>
      </View>
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
  loadingText: {
    marginTop: 14,
    color: ScoreBoardTheme.textMuted,
    fontSize: 14,
  },
  errorTitle: {
    fontSize: 16,
    color: ScoreBoardTheme.onSurface,
    fontWeight: "600",
    marginTop: 12,
    marginBottom: 16,
  },
  backBtn: {
    backgroundColor: ScoreBoardTheme.surfaceContainerHigh,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
  },
  backBtnText: {
    color: ScoreBoardTheme.onSurface,
    fontWeight: "500",
  },
  scoreboardShell: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  spectatorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: ScoreBoardTheme.surfaceContainerHigh,
    borderBottomWidth: 1,
    borderBottomColor: ScoreBoardTheme.borderSubtle,
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 8,
  },
  spectatorBannerText: {
    color: ScoreBoardTheme.tertiary,
    fontSize: 12,
    fontWeight: "500",
    flex: 1,
  },
});
