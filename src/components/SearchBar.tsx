import React from "react";
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLanguage } from "@/lib/i18n";

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
  const { t } = useLanguage();

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
        <Ionicons name="search" size={18} color="#64748b" style={styles.searchIcon} />
        <TextInput
          style={styles.input}
          placeholder={t("common.searchPlaceholder") || "Pesquisar torneios, equipas..."}
          placeholderTextColor="#64748b"
          value={searchQuery}
          onChangeText={onSearchChange}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => onSearchChange("")} style={styles.clearBtn}>
            <Ionicons name="close-circle" size={18} color="#94a3b8" />
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
              {isLive && <View style={styles.livePulse} />}
              <Text
                style={[
                  styles.statusText,
                  isSelected && styles.statusTextActive,
                  isLive && isSelected && styles.statusTextLive,
                ]}
              >
                {t(item.labelKey) || item.key}
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
    paddingTop: 8,
    paddingBottom: 4,
    gap: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#151b2d",
    borderWidth: 1,
    borderColor: "#232d4b",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: "#f8fafc",
    fontSize: 14,
    height: "100%",
  },
  clearBtn: {
    padding: 4,
  },
  statusRow: {
    flexDirection: "row",
    gap: 6,
  },
  statusBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#101626",
    borderWidth: 1,
    borderColor: "#1e293b",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 5,
  },
  statusBtnActive: {
    backgroundColor: "rgba(79, 70, 229, 0.2)",
    borderColor: "#4f46e5",
  },
  statusBtnLive: {
    backgroundColor: "rgba(78, 222, 163, 0.15)",
    borderColor: "#4edea3",
  },
  livePulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#4edea3",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
  },
  statusTextActive: {
    color: "#a5b4fc",
    fontWeight: "700",
  },
  statusTextLive: {
    color: "#4edea3",
  },
});
