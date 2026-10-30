import React from "react";
import { ScrollView, TouchableOpacity, Text, StyleSheet } from "react-native";
import { useTranslation, getSportTranslation } from "@/lib/i18n";
import { SportIcon } from "@/components/SportIcon";
import { ScoreBoardTheme } from "@/constants/theme";

export interface SportOption {
  key: string;
  labelKey: string;
  sportType?: string;
}

const SPORTS: SportOption[] = [
  { key: "all", labelKey: "sports.all" },
  { key: "Tennis", labelKey: "sports.tennis", sportType: "Tennis" },
  { key: "Padel", labelKey: "sports.padel", sportType: "Padel" },
  { key: "Volleyball", labelKey: "sports.volleyball", sportType: "Volleyball" },
  { key: "Beach Volleyball", labelKey: "sports.beachVolleyball", sportType: "Beach Volleyball" },
  { key: "Football", labelKey: "sports.football", sportType: "Football" },
  { key: "Basketball", labelKey: "sports.basketball", sportType: "Basketball" },
];

interface SportFilterBarProps {
  selectedSport: string;
  onSelectSport: (sport: string) => void;
}

export function SportFilterBar({ selectedSport, onSelectSport }: SportFilterBarProps) {
  const { t } = useTranslation();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      style={styles.container}
    >
      {SPORTS.map((s) => {
        const isSelected = selectedSport.toLowerCase() === s.key.toLowerCase();
        return (
          <TouchableOpacity
            key={s.key}
            style={[styles.pill, isSelected && styles.pillActive]}
            onPress={() => onSelectSport(s.key)}
            activeOpacity={0.75}
          >
            {s.sportType ? (
              <SportIcon
                sport={s.sportType}
                size={14}
                color={isSelected ? "#ffffff" : "rgba(195, 192, 255, 0.7)"}
              />
            ) : null}
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
    maxHeight: 46,
    marginVertical: 6,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: "center",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: ScoreBoardTheme.surfaceContainerLow,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderGhost,
  },
  pillActive: {
    backgroundColor: ScoreBoardTheme.primaryContainer,
    borderColor: "rgba(195, 192, 255, 0.4)",
  },
  pillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(220, 225, 251, 0.65)",
  },
  pillTextActive: {
    color: "#ffffff",
    fontWeight: "800",
  },
});
