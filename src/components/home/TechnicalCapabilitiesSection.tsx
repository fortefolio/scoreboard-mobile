import React from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SportIcon } from "@/components/SportIcon";
import { useTranslation } from "@/lib/i18n";

export function SectionDivider({ label }: { label: string }) {
  return (
    <View style={styles.dividerRow}>
      <View style={styles.dividerLine} />
      <Text style={styles.dividerText}>{label}</Text>
      <View style={styles.dividerLine} />
    </View>
  );
}

export function TechnicalCapabilitiesSection() {
  const { locale } = useTranslation();
  const isPt = locale === "pt";

  return (
    <View style={styles.container}>
      <SectionDivider
        label={isPt ? "CAPACIDADES TÉCNICAS" : "TECHNICAL CAPABILITIES"}
      />

      {/* Card 1: Umpire-to-Crowd Instant Sync */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderText}>
            <Text style={styles.cardTitle}>
              {isPt
                ? "Sincronização Instantânea"
                : "Umpire-to-Crowd Instant Sync"}
            </Text>
            <Text style={styles.cardSubtitle}>
              {isPt
                ? "Consola compacta à beira do campo com atualizações em direto para todos os espetadores."
                : "Compact courtside scorer console with instant live updates to every viewer."}
            </Text>
          </View>
          <Ionicons name="radio-outline" size={18} color="#7a8296" />
        </View>

        <View style={styles.previewBox}>
          <View style={styles.miniTopBar}>
            <View style={styles.miniTopLeft}>
              <View style={styles.miniSportIcon}>
                <SportIcon sport="Tennis" size={11} color="#eef0f5" />
              </View>
              <Text style={styles.miniTopText}>Tennis • Set 1</Text>
            </View>
            <View style={styles.miniLivePill}>
              <View style={styles.crimsonDot} />
              <Text style={styles.miniLiveText}>{isPt ? "Direto" : "Live"}</Text>
            </View>
          </View>

          <View style={styles.miniScoreboardGrid}>
            <View style={styles.miniRail}>
              <View style={styles.miniBtnPrimary}>
                <Text style={styles.miniBtnPrimaryText}>+Pt</Text>
              </View>
              <View style={styles.miniBtnSecondary}>
                <Text style={styles.miniBtnSecondaryText}>-1</Text>
              </View>
            </View>

            <View style={styles.miniTeamCol}>
              <Text style={styles.miniTeamName}>Braga</Text>
              <View style={styles.miniServingPill}>
                <View style={styles.servingDot} />
                <Text style={styles.miniServingText}>
                  {isPt ? "A Servir" : "Serving"}
                </Text>
              </View>
              <Text style={styles.miniDigitalScore}>15</Text>
            </View>

            <View style={styles.miniCenterCol}>
              <Text style={styles.miniGamesLabel}>
                {isPt ? "Jogos" : "Games"}
              </Text>
              <View style={styles.miniGamesBox}>
                <Text style={styles.miniGamesMono}>4 - 3</Text>
              </View>
            </View>

            <View style={styles.miniTeamCol}>
              <Text style={styles.miniTeamName}>Évora</Text>
              <Text style={styles.miniReceiverText}>
                {isPt ? "Recetor" : "Receiver"}
              </Text>
              <Text style={styles.miniDigitalScore}>40</Text>
            </View>

            <View style={styles.miniRail}>
              <View style={styles.miniBtnPrimary}>
                <Text style={styles.miniBtnPrimaryText}>+Pt</Text>
              </View>
              <View style={styles.miniBtnSecondary}>
                <Text style={styles.miniBtnSecondaryText}>-1</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Card 2: Automated Tournament Engine */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderText}>
            <Text style={styles.cardTitle}>
              {isPt
                ? "Motor de Torneios Automático"
                : "Automated Tournament Engine"}
            </Text>
            <Text style={styles.cardSubtitle}>
              {isPt
                ? "Fases de grupos, quadros eliminatórios simples ou duplos com avanço automático."
                : "Group stages, single or double elimination brackets with automatic advancement."}
            </Text>
          </View>
          <Ionicons name="git-network-outline" size={18} color="#7a8296" />
        </View>

        <View style={styles.previewBox}>
          <View style={styles.bracketRow}>
            <View style={styles.bracketCol}>
              <View style={styles.bracketMatch}>
                <View style={styles.bracketLineRow}>
                  <Text style={styles.bracketTeamWin}>Porto FC</Text>
                  <Text style={styles.bracketScoreMono}>2</Text>
                </View>
                <View style={styles.bracketLineRow}>
                  <Text style={styles.bracketTeamLose}>Braga</Text>
                  <Text style={styles.bracketScoreMuted}>0</Text>
                </View>
                <View style={styles.bracketFooter}>
                  <Text style={styles.bracketMeta}>QF 1</Text>
                  <Text style={styles.bracketMeta}>Final</Text>
                </View>
              </View>

              <View style={styles.bracketMatch}>
                <View style={styles.bracketLineRow}>
                  <Text style={styles.bracketTeamWin}>Lisboa</Text>
                  <Text style={styles.bracketScoreMono}>1</Text>
                </View>
                <View style={styles.bracketLineRow}>
                  <Text style={styles.bracketTeamWin}>Coimbra</Text>
                  <Text style={styles.bracketScoreMono}>1</Text>
                </View>
                <View style={styles.bracketFooter}>
                  <Text style={styles.bracketMeta}>QF 2</Text>
                  <View style={styles.inlineLive}>
                    <View style={styles.crimsonDot} />
                    <Text style={styles.inlineLiveText}>
                      {isPt ? "Direto" : "Live"}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.connectorWrap}>
              <View style={styles.connectorArm} />
              <View style={styles.connectorStem} />
            </View>

            <View style={styles.bracketCol}>
              <View style={styles.bracketMatch}>
                <View style={styles.bracketLineRow}>
                  <Text style={styles.bracketTeamWin}>Porto FC</Text>
                  <Text style={styles.bracketScoreMuted}>-</Text>
                </View>
                <View style={styles.bracketLineRow}>
                  <Text style={styles.bracketTeamTbd}>Winner QF 2</Text>
                  <Text style={styles.bracketScoreMuted}>-</Text>
                </View>
                <View style={styles.bracketFooter}>
                  <Text style={styles.bracketMeta}>SF 1</Text>
                  <Text style={styles.bracketMeta}>Scheduled</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Card 3: Broadcast Overlays (OBS / vMix) */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderText}>
            <Text style={styles.cardTitle}>
              {isPt
                ? "Overlays de Transmissão (OBS / vMix)"
                : "Broadcast Overlays (OBS / vMix)"}
            </Text>
            <Text style={styles.cardSubtitle}>
              {isPt
                ? "Score bug inferior transparente pronto para browser sources no OBS ou vMix."
                : "Transparent lower-third score bug ready for live OBS or vMix browser sources."}
            </Text>
          </View>
          <Ionicons name="radio-outline" size={18} color="#7a8296" />
        </View>

        <View style={[styles.previewBox, styles.overlayPreviewBox]}>
          <View style={styles.lowerThirdCard}>
            <View style={styles.lowerThirdTop}>
              <Text style={styles.lowerThirdBrand}>SCORE:BOARD</Text>
              <View style={styles.inlineLive}>
                <View style={styles.crimsonDot} />
                <Text style={styles.lowerThirdClock}>72:14</Text>
              </View>
            </View>
            <View style={styles.lowerThirdBody}>
              <Text style={styles.lowerThirdTeam}>MCI</Text>
              <View style={styles.lowerThirdScoreBox}>
                <Text style={styles.lowerThirdScoreMono}>2 - 1</Text>
              </View>
              <Text style={styles.lowerThirdTeam}>RMA</Text>
            </View>
          </View>
          <Text style={styles.overlayPathText}>
            /match/[id]/overlay?pos=bottom
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 28,
    paddingBottom: 24,
    gap: 14,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(238, 240, 245, 0.10)",
  },
  dividerText: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.6,
    color: "#7a8296",
  },
  card: {
    backgroundColor: "#11141c",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(238, 240, 245, 0.08)",
    padding: 16,
    gap: 14,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  cardHeaderText: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#eef0f5",
  },
  cardSubtitle: {
    fontSize: 12,
    lineHeight: 17,
    color: "#7a8296",
  },
  previewBox: {
    backgroundColor: "#0b0d14",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(238, 240, 245, 0.08)",
    padding: 10,
    gap: 10,
  },
  miniTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(238, 240, 245, 0.06)",
  },
  miniTopLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  miniSportIcon: {
    width: 20,
    height: 20,
    borderRadius: 5,
    backgroundColor: "#161a24",
    alignItems: "center",
    justifyContent: "center",
  },
  miniTopText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#a3a9b8",
  },
  miniLivePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(244, 63, 94, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(244, 63, 94, 0.25)",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  },
  crimsonDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#f43f5e",
  },
  miniLiveText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#eef0f5",
  },
  miniScoreboardGrid: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  miniRail: {
    gap: 4,
  },
  miniBtnPrimary: {
    width: 30,
    height: 26,
    borderRadius: 6,
    backgroundColor: "#eef0f5",
    alignItems: "center",
    justifyContent: "center",
  },
  miniBtnPrimaryText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#07080d",
  },
  miniBtnSecondary: {
    width: 30,
    height: 26,
    borderRadius: 6,
    backgroundColor: "#161a24",
    borderWidth: 1,
    borderColor: "rgba(238, 240, 245, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  miniBtnSecondaryText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#7a8296",
  },
  miniTeamCol: {
    flex: 1,
    alignItems: "center",
    gap: 3,
  },
  miniTeamName: {
    fontSize: 11,
    fontWeight: "600",
    color: "#eef0f5",
  },
  miniServingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#161a24",
    borderWidth: 1,
    borderColor: "rgba(238, 240, 245, 0.08)",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 999,
  },
  servingDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#eef0f5",
  },
  miniServingText: {
    fontSize: 9,
    fontWeight: "600",
    color: "#eef0f5",
  },
  miniReceiverText: {
    fontSize: 9,
    color: "#7a8296",
  },
  miniDigitalScore: {
    fontFamily: "Digital7Mono",
    fontSize: 26,
    lineHeight: 30,
    color: "#eef0f5",
    fontVariant: ["tabular-nums"],
  },
  miniCenterCol: {
    alignItems: "center",
    gap: 4,
  },
  miniGamesLabel: {
    fontSize: 9,
    color: "#7a8296",
    fontWeight: "500",
  },
  miniGamesBox: {
    backgroundColor: "#161a24",
    borderWidth: 1,
    borderColor: "rgba(238, 240, 245, 0.08)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  miniGamesMono: {
    fontFamily: "Digital7Mono",
    fontSize: 14,
    color: "#eef0f5",
    fontVariant: ["tabular-nums"],
  },
  bracketRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  bracketCol: {
    flex: 1,
    gap: 8,
  },
  bracketMatch: {
    backgroundColor: "#11141c",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(238, 240, 245, 0.08)",
    padding: 8,
    gap: 4,
  },
  bracketLineRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bracketTeamWin: {
    fontSize: 11,
    fontWeight: "600",
    color: "#eef0f5",
  },
  bracketTeamLose: {
    fontSize: 11,
    color: "#7a8296",
  },
  bracketTeamTbd: {
    fontSize: 10,
    fontStyle: "italic",
    color: "#7a8296",
  },
  bracketScoreMono: {
    fontFamily: "Digital7Mono",
    fontSize: 12,
    color: "#eef0f5",
  },
  bracketScoreMuted: {
    fontFamily: "Digital7Mono",
    fontSize: 12,
    color: "#7a8296",
  },
  bracketFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 2,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: "rgba(238, 240, 245, 0.06)",
  },
  bracketMeta: {
    fontSize: 9,
    color: "#7a8296",
  },
  inlineLive: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  inlineLiveText: {
    fontSize: 9,
    fontWeight: "600",
    color: "#eef0f5",
  },
  connectorWrap: {
    width: 18,
    flexDirection: "row",
    alignItems: "center",
  },
  connectorArm: {
    width: 9,
    height: 70,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "rgba(238, 240, 245, 0.16)",
  },
  connectorStem: {
    width: 9,
    height: 1,
    backgroundColor: "rgba(238, 240, 245, 0.16)",
  },
  overlayPreviewBox: {
    padding: 16,
    alignItems: "center",
    gap: 10,
  },
  lowerThirdCard: {
    width: "100%",
    backgroundColor: "#11141c",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(238, 240, 245, 0.10)",
    padding: 10,
    gap: 8,
  },
  lowerThirdTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  lowerThirdBrand: {
    fontFamily: "Digital7",
    fontSize: 11,
    color: "#7a8296",
  },
  lowerThirdClock: {
    fontFamily: "Digital7Mono",
    fontSize: 12,
    color: "#eef0f5",
  },
  lowerThirdBody: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  lowerThirdTeam: {
    fontSize: 13,
    fontWeight: "700",
    color: "#eef0f5",
  },
  lowerThirdScoreBox: {
    backgroundColor: "#161a24",
    borderWidth: 1,
    borderColor: "rgba(238, 240, 245, 0.08)",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  lowerThirdScoreMono: {
    fontFamily: "Digital7Mono",
    fontSize: 18,
    color: "#eef0f5",
  },
  overlayPathText: {
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
    fontSize: 10,
    color: "#7a8296",
  },
});
