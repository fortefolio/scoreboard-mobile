import React from "react";
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "@/lib/i18n";
import { ScoreBoardTheme } from "@/constants/theme";

interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: string;
  onStatusChange: (status: string) => void;
}

export function SearchBar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
}: SearchBarProps) {
  const { t } = useTranslation();

  const statuses = [
    { key: "all", labelKey: "status.all" },
    { key: "ongoing", labelKey: "status.live" },
    { key: "scheduled", labelKey: "status.scheduled" },
    { key: "completed", labelKey: "status.completed" },
  ];

  return (
    <View style={styles.container}>
      {/* Search Input */}
      <View style={styles.inputWrapper}>
        <Ionicons name="search" size={17} color="rgba(220, 225, 251, 0.4)" style={styles.searchIcon} />
        <TextInput
          style={styles.input}
          placeholder={t("common.searchPlaceholder")}
          placeholderTextColor="rgba(220, 225, 251, 0.4)"
          value={searchQuery}
          onChangeText={onSearchChange}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => onSearchChange("")} style={styles.clearBtn}>
            <Ionicons name="close-circle" size={17} color="rgba(220, 225, 251, 0.5)" />
          </TouchableOpacity>
        )}
      </View>

      {/* Status Filter Row */}
      <View style={styles.statusRow}>
        {statuses.map((item) => {
          const isSelected = statusFilter === item.key;
          const isLive = item.key === "ongoing";
          return (
            <TouchableOpacity
              key={item.key}
              style={[
                styles.statusBtn,
                isSelected && styles.statusBtnActive,
                isLive && isSelected && styles.statusBtnLive,
              ]}
              onPress={() => onStatusChange(item.key)}
              activeOpacity={0.7}
            >
              {isLive && (
                <View
                  style={[
                    styles.statusDot,
                    isSelected ? styles.statusDotLiveActive : styles.statusDotLive,
                  ]}
                />
              )}
              <Text
                style={[
                  styles.statusText,
                  isSelected && styles.statusTextActive,
                  isLive && isSelected && styles.statusTextLiveActive,
                ]}
              >
                {t(item.labelKey)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginVertical: 4,
    gap: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: ScoreBoardTheme.surfaceContainerLow,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderGhost,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: "100%",
    fontSize: 13,
    color: ScoreBoardTheme.onSurface,
    fontWeight: "500",
  },
  clearBtn: {
    padding: 4,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 7,
    backgroundColor: ScoreBoardTheme.surfaceContainerLow,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderGhost,
  },
  statusBtnActive: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  statusBtnLive: {
    backgroundColor: "rgba(78, 222, 163, 0.12)",
    borderColor: "rgba(78, 222, 163, 0.35)",
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  statusDotLive: {
    backgroundColor: "rgba(78, 222, 163, 0.6)",
  },
  statusDotLiveActive: {
    backgroundColor: "#4edea3",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(220, 225, 251, 0.5)",
  },
  statusTextActive: {
    color: ScoreBoardTheme.onSurface,
    fontWeight: "800",
  },
  statusTextLiveActive: {
    color: "#4edea3",
    fontWeight: "800",
  },
});
