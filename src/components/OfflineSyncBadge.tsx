import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { subscribeQueueChanges, flushOfflineQueue } from "@/lib/offline/offlineQueue";
import { supabase } from "@/lib/supabase/client";

export function OfflineSyncBadge({ matchId }: { matchId?: string }) {
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const unsub = subscribeQueueChanges((count) => {
      setPendingCount(count);
    });
    return unsub;
  }, []);

  if (pendingCount === 0) return null;

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      await flushOfflineQueue(supabase, matchId);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handleManualSync}
      style={styles.badgeContainer}
      accessibilityRole="button"
      accessibilityLabel="Sincronizar eventos offline"
    >
      {syncing ? (
        <ActivityIndicator size="small" color="#f59e0b" style={{ marginRight: 6 }} />
      ) : (
        <Ionicons name="cloud-offline-outline" size={16} color="#f59e0b" style={{ marginRight: 6 }} />
      )}
      <Text style={styles.badgeText}>
        {syncing
          ? "A sincronizar..."
          : `${pendingCount} ${pendingCount === 1 ? "ponto pendente" : "pontos pendentes"}`}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  badgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    borderColor: "rgba(245, 158, 11, 0.4)",
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  badgeText: {
    color: "#f59e0b",
    fontSize: 12,
    fontWeight: "700",
  },
});
