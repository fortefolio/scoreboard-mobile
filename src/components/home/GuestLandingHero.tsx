import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { SportIcon } from "@/components/SportIcon";
import { useTranslation } from "@/lib/i18n";
import { ScoreBoardTheme } from "@/constants/theme";

interface GuestLandingHeroProps {
  onGetStarted: () => void;
  onWatchLiveFeeds: () => void;
}

export function GuestLandingHero({
  onGetStarted,
  onWatchLiveFeeds,
}: GuestLandingHeroProps) {
  const { locale } = useTranslation();
  const isPt = locale === "pt";

  return (
    <View style={styles.container}>
      <Text style={styles.headline}>
        {isPt
          ? "Não te limites a seguir.\nFaz parte do jogo."
          : "Don't just follow.\nBe part of the game."}
      </Text>

      <Text style={styles.subtitle}>
        {isPt
          ? "Pontuação em tempo real à beira do campo, quadros competitivos automáticos e overlays de transmissão para cada torneio e jogo."
          : "Court-side live scorekeeping, automated tournament brackets, and broadcast-ready overlays for every match and competition."}
      </Text>

      <View style={styles.ctaRow}>
        <TouchableOpacity
          testID="guest-get-started-btn"
          style={styles.primaryCta}
          onPress={onGetStarted}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryCtaText}>
            {isPt ? "Começar Agora" : "Get Started"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          testID="guest-watch-live-btn"
          style={styles.secondaryCta}
          onPress={onWatchLiveFeeds}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryCtaText}>
            {isPt ? "Ver Jogos em Direto" : "Watch Live Feeds"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Court Preview Card */}
      <View style={styles.previewCard}>
        <Image
          source={require("../../../assets/backgrounds/basketball-landscape.webp")}
          contentFit="cover"
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.previewScrim} />

        {/* Top Live Score Bug */}
        <View style={styles.scoreBug}>
          <View style={styles.scoreBugTeamLeft}>
            <View style={styles.sportIconBox}>
              <SportIcon
                sport="Basketball"
                size={14}
                color={ScoreBoardTheme.onSurface}
              />
            </View>
            <Text style={styles.teamAbbr}>SLB</Text>
          </View>

          <View style={styles.scoreBugCenter}>
            <Text style={styles.bugScoreMono}>128</Text>
            <Text style={styles.bugScoreColon}>:</Text>
            <Text style={styles.bugScoreMono}>127</Text>
            <View style={styles.livePill}>
              <View style={styles.liveDot} />
              <Text style={styles.livePillText}>
                {isPt ? "Direto" : "Live"}
              </Text>
            </View>
          </View>

          <View style={styles.scoreBugTeamRight}>
            <Text style={styles.teamAbbr}>FCP</Text>
            <Text style={styles.quarterMono}>Q4</Text>
          </View>
        </View>

        {/* Bottom Telemetry Row */}
        <View style={styles.previewFooter}>
          <View style={styles.telemetryChip}>
            <Ionicons
              name="pulse-outline"
              size={14}
              color={ScoreBoardTheme.onSurfaceVariant}
            />
            <Text style={styles.telemetryChipText}>
              {isPt ? "Sincronização em tempo real" : "Real-time telemetry sync"}
            </Text>
          </View>
          <Text style={styles.watermarkLogo}>SCORE:BOARD</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 20,
    paddingBottom: 24,
  },
  headline: {
    fontSize: 30,
    lineHeight: 35,
    fontWeight: "700",
    color: "#eef0f5",
    letterSpacing: -0.6,
  },
  subtitle: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 20,
    color: "#a3a9b8",
  },
  ctaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 20,
  },
  primaryCta: {
    backgroundColor: "#eef0f5",
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 10,
  },
  primaryCtaText: {
    color: "#07080d",
    fontSize: 13,
    fontWeight: "600",
  },
  secondaryCta: {
    backgroundColor: "#11141c",
    borderWidth: 1,
    borderColor: "rgba(238, 240, 245, 0.14)",
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 10,
  },
  secondaryCtaText: {
    color: "#eef0f5",
    fontSize: 13,
    fontWeight: "500",
  },
  previewCard: {
    marginTop: 24,
    height: 210,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(238, 240, 245, 0.10)",
    backgroundColor: "#0b0d14",
    padding: 14,
    justifyContent: "space-between",
  },
  previewScrim: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(7, 8, 13, 0.56)",
  },
  scoreBug: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(11, 13, 20, 0.88)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(238, 240, 245, 0.10)",
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  scoreBugTeamLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sportIconBox: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: "#161a24",
    borderWidth: 1,
    borderColor: "rgba(238, 240, 245, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  teamAbbr: {
    fontSize: 12,
    fontWeight: "600",
    color: "#eef0f5",
  },
  scoreBugCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  bugScoreMono: {
    fontFamily: "Digital7Mono",
    fontSize: 22,
    color: "#eef0f5",
    fontVariant: ["tabular-nums"],
  },
  bugScoreColon: {
    fontFamily: "Digital7Mono",
    fontSize: 20,
    color: "#7a8296",
  },
  livePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(244, 63, 94, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(244, 63, 94, 0.25)",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    marginLeft: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#f43f5e",
  },
  livePillText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#eef0f5",
  },
  scoreBugTeamRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  quarterMono: {
    fontFamily: "Digital7Mono",
    fontSize: 12,
    color: "#7a8296",
  },
  previewFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  telemetryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(11, 13, 20, 0.85)",
    borderWidth: 1,
    borderColor: "rgba(238, 240, 245, 0.10)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  telemetryChipText: {
    fontSize: 11,
    color: "#a3a9b8",
    fontWeight: "500",
  },
  watermarkLogo: {
    fontFamily: "Digital7",
    fontSize: 14,
    color: "rgba(238, 240, 245, 0.55)",
    letterSpacing: -0.3,
  },
});
