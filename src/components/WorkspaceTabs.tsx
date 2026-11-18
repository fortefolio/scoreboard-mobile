import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useLanguage } from "@/lib/i18n";
import { ScoreBoardTheme } from "@/constants/theme";

export type WorkspaceTabKey = "my-matches" | "my-tournaments" | "umpiring";

interface WorkspaceTabsProps {
  activeTab: WorkspaceTabKey;
}

export function WorkspaceTabs({ activeTab }: WorkspaceTabsProps) {
  const { t, locale } = useLanguage();
  const router = useRouter();
  const isPt = locale === "pt";

  const tabs: { key: WorkspaceTabKey; label: string; route: string }[] = [
    {
      key: "my-matches",
      label: t("nav.myMatches") || (isPt ? "Os Meus Jogos" : "My Matches"),
      route: "/(tabs)/my-matches",
    },
    {
      key: "my-tournaments",
      label: t("nav.myTournaments") || (isPt ? "Os Meus Torneios" : "My Tournaments"),
      route: "/(tabs)/my-tournaments",
    },
    {
      key: "umpiring",
      label: isPt ? "Arbitragem" : "Umpiring",
      route: "/(tabs)/umpiring",
    },
  ];

  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabBtn, isActive && styles.tabBtnActive]}
            onPress={() => {
              if (!isActive) {
                router.replace(tab.route as any);
              }
            }}
            activeOpacity={0.75}
            testID={`workspace-tab-${tab.key}`}
          >
            <Text
              style={[styles.tabText, isActive && styles.tabTextActive]}
              numberOfLines={1}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: ScoreBoardTheme.surfaceContainer,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    padding: 3,
    gap: 3,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  tabBtnActive: {
    backgroundColor: ScoreBoardTheme.surfaceContainerHighest,
  },
  tabText: {
    fontSize: 12,
    fontWeight: "500",
    color: ScoreBoardTheme.textMuted,
  },
  tabTextActive: {
    color: ScoreBoardTheme.onSurface,
    fontWeight: "700",
  },
});
