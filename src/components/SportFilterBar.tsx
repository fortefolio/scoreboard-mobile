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
                color={isSelected ? ScoreBoardTheme.onSurface : ScoreBoardTheme.textMuted}
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
    maxHeight: 44,
    marginVertical: 6,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 6,
    alignItems: "center",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: ScoreBoardTheme.surfaceContainer,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
  },
  pillActive: {
    backgroundColor: ScoreBoardTheme.surfaceContainerHighest,
    borderColor: ScoreBoardTheme.onSurfaceVariant,
  },
  pillText: {
    fontSize: 12,
    fontWeight: "500",
    color: ScoreBoardTheme.onSurfaceVariant,
  },
  pillTextActive: {
    color: ScoreBoardTheme.onSurface,
    fontWeight: "600",
  },
});
