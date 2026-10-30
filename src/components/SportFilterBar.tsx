import React from "react";
import { ScrollView, TouchableOpacity, Text, StyleSheet } from "react-native";
import { useLanguage } from "@/lib/i18n";

export interface SportOption {
  key: string;
  labelKey: string;
  icon: string;
}

const SPORTS: SportOption[] = [
  { key: "all", labelKey: "sports.all", icon: "🏆" },
  { key: "Basketball", labelKey: "sports.basketball", icon: "🏀" },
  { key: "Volleyball", labelKey: "sports.volleyball", icon: "🏐" },
  { key: "Beach Volleyball", labelKey: "sports.beachVolleyball", icon: "🏖️" },
  { key: "Football", labelKey: "sports.football", icon: "⚽" },
  { key: "Tennis", labelKey: "sports.tennis", icon: "🎾" },
  { key: "Padel", labelKey: "sports.padel", icon: "🎾" },
];

interface SportFilterBarProps {
  selectedSport: string;
  onSelectSport: (sport: string) => void;
}

export function SportFilterBar({ selectedSport, onSelectSport }: SportFilterBarProps) {
  const { t } = useLanguage();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      style={styles.container}
    >
      {SPORTS.map((s) => {
        const isSelected = selectedSport === s.key;
        return (
          <TouchableOpacity
            key={s.key}
            style={[styles.pill, isSelected && styles.pillActive]}
            onPress={() => onSelectSport(s.key)}
            activeOpacity={0.7}
          >
            <Text style={styles.pillIcon}>{s.icon}</Text>
            <Text style={[styles.pillText, isSelected && styles.pillTextActive]}>
              {t(s.labelKey) || s.key}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    maxHeight: 52,
    marginVertical: 4,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 8,
    alignItems: "center",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#151b2d",
    borderWidth: 1,
    borderColor: "#232d4b",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 6,
  },
  pillActive: {
    backgroundColor: "#4f46e5",
    borderColor: "#6366f1",
  },
  pillIcon: {
    fontSize: 14,
  },
  pillText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#94a3b8",
  },
  pillTextActive: {
    color: "#ffffff",
    fontWeight: "700",
  },
});
