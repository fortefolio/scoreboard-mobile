import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SportFilterBar } from "@/components/SportFilterBar";
import { SearchBar } from "@/components/SearchBar";
import { useTranslation } from "@/lib/i18n";
import { ScoreBoardTheme } from "@/constants/theme";

export interface FeedHeaderProps {
  selectedSport: string;
  onSportChange: (sport: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  statusFilter: string;
  onStatusChange: (status: string) => void;
  displayCount: number;
  countLabel: string;
  viewMode?: "list" | "cards";
  onViewModeChange?: (mode: "list" | "cards") => void;
  showViewToggle?: boolean;
}

export const FeedHeader = React.memo(function FeedHeader({
  selectedSport,
  onSportChange,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  displayCount,
  countLabel,
  viewMode = "list",
  onViewModeChange,
  showViewToggle = true,
}: FeedHeaderProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.headerContainer}>
      {/* Sport Filter Bar */}
      <SportFilterBar selectedSport={selectedSport} onSelectSport={onSportChange} />

      {/* Search Bar & Status Filter */}
      <SearchBar
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        statusFilter={statusFilter}
        onStatusChange={onStatusChange}
      />

      {/* View Mode & Count Bar */}
      <View style={styles.viewModeBar}>
        <Text style={styles.resultCountText}>
          {displayCount} {countLabel}
        </Text>

        {showViewToggle && onViewModeChange && (
          <View style={styles.viewModeToggle}>
            <TouchableOpacity
              style={[styles.toggleBtn, viewMode === "list" && styles.toggleBtnActive]}
              onPress={() => onViewModeChange("list")}
              activeOpacity={0.7}
            >
              <Ionicons
                name="reorder-four"
                size={16}
                color={viewMode === "list" ? "#ffffff" : "rgba(220, 225, 251, 0.4)"}
              />
              <Text
                style={[
                  styles.toggleBtnText,
                  viewMode === "list" && styles.toggleBtnTextActive,
                ]}
              >
                {t("common.viewList") || "List"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toggleBtn, viewMode === "cards" && styles.toggleBtnActive]}
              onPress={() => onViewModeChange("cards")}
              activeOpacity={0.7}
            >
              <Ionicons
                name="grid-outline"
                size={14}
                color={viewMode === "cards" ? "#ffffff" : "rgba(220, 225, 251, 0.4)"}
              />
              <Text
                style={[
                  styles.toggleBtnText,
                  viewMode === "cards" && styles.toggleBtnTextActive,
                ]}
              >
                {t("common.viewCards") || "Cards"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  headerContainer: {
    paddingTop: 8,
    gap: 8,
  },
  viewModeBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 4,
  },
  resultCountText: {
    fontSize: 10,
    fontWeight: "900",
    color: "rgba(220, 225, 251, 0.5)",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  viewModeToggle: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: ScoreBoardTheme.surfaceContainerLow,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderGhost,
    padding: 2,
    gap: 2,
  },
  toggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  toggleBtnActive: {
    backgroundColor: ScoreBoardTheme.primary,
  },
  toggleBtnText: {
    fontSize: 9,
    fontWeight: "800",
    color: "rgba(220, 225, 251, 0.5)",
    textTransform: "uppercase",
  },
  toggleBtnTextActive: {
    color: "#ffffff",
  },
});
