import React, { useState, useEffect, useCallback } from "react";
import { View, Text, FlatList, RefreshControl, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { TopBar } from "@/components/TopBar";
import { useAuth } from "@/components/AuthProvider";
import { useLanguage } from "@/lib/i18n";
import { supabase } from "@/lib/supabase/client";
import { ScoreBoardTheme } from "@/constants/theme";

export default function NotificationsScreen() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();

  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setNotifications(data || []);
    } catch (e) {
      console.warn("Error loading notifications:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();

    if (!user) return;

    const channelId = `notifications-tab-${user.id}-${Math.random().toString(36).slice(2, 9)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchNotifications, user]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const markAllAsRead = async () => {
    if (!user) return;
    try {
      await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .is("read_at", null);
      fetchNotifications();
    } catch (e) {
      console.warn("Failed to mark all as read:", e);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
      );
    } catch (e) {
      console.warn("Failed to mark as read:", e);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <TopBar />

      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Notificações</Text>
          <Text style={styles.headerSubtitle}>Alertas de jogos e torneios em tempo real</Text>
        </View>

        {user && notifications.some((n) => !n.read_at) && (
          <TouchableOpacity style={styles.markAllBtn} onPress={markAllAsRead}>
            <Text style={styles.markAllText}>Marcar todas lidas</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={ScoreBoardTheme.onSurfaceVariant} />
        </View>
      ) : !user ? (
        <View style={styles.centered}>
          <Ionicons name="lock-closed-outline" size={48} color="#475569" />
          <Text style={styles.emptyTitle}>Inicie Sessão</Text>
          <Text style={styles.emptySubtitle}>
            Precisa de iniciar sessão para receber notificações personalizadas.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ScoreBoardTheme.onSurfaceVariant} />
          }
          renderItem={({ item }) => {
            const isUnread = !item.read_at;
            const data = item.data || {};
            const isInvitation =
              typeof data.type === "string" &&
              data.type.includes("umpire") &&
              (data.type.includes("invitation") || data.type.includes("assignment"));
            const matchId = data.match_id || data.matchId;

            return (
              <TouchableOpacity
                style={[styles.itemCard, isUnread && styles.itemCardUnread]}
                onPress={() => {
                  if (isUnread) markAsRead(item.id);
                  if (matchId) {
                    router.push(`/match/${matchId}` as any);
                  }
                }}
                activeOpacity={0.8}
              >
                <View style={styles.itemMetaRow}>
                  <View style={styles.itemMetaLeft}>
                    <Ionicons
                      name={isInvitation ? "shield-checkmark-outline" : "notifications-outline"}
                      size={14}
                      color={ScoreBoardTheme.onSurfaceVariant}
                    />
                    <Text style={styles.itemDate}>
                      {new Date(item.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  </View>
                  {isUnread && <View style={styles.unreadDot} />}
                </View>

                <Text
                  style={[styles.itemTitle, isUnread && styles.itemTitleUnread]}
                  numberOfLines={2}
                >
                  {item.title}
                </Text>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Ionicons name="notifications-off-outline" size={48} color="#334155" />
              <Text style={styles.emptyTitle}>Sem notificações</Text>
              <Text style={styles.emptySubtitle}>
                Não tem nenhuma notificação pendente de momento.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: ScoreBoardTheme.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: ScoreBoardTheme.borderSubtle,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: ScoreBoardTheme.onSurface,
  },
  headerSubtitle: {
    fontSize: 12,
    color: ScoreBoardTheme.textMuted,
    marginTop: 2,
  },
  markAllBtn: {
    backgroundColor: ScoreBoardTheme.surfaceContainerHigh,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
  },
  markAllText: {
    color: ScoreBoardTheme.onSurface,
    fontSize: 11,
    fontWeight: "600",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: ScoreBoardTheme.onSurface,
    marginTop: 14,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 12,
    color: ScoreBoardTheme.textMuted,
    textAlign: "center",
    lineHeight: 18,
  },
  itemCard: {
    backgroundColor: ScoreBoardTheme.surfaceContainer,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  itemCardUnread: {
    borderColor: ScoreBoardTheme.onSurfaceVariant,
    backgroundColor: ScoreBoardTheme.surfaceContainerHigh,
  },
  itemMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  itemMetaLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: "500",
    color: ScoreBoardTheme.onSurfaceVariant,
    lineHeight: 18,
  },
  itemTitleUnread: {
    color: ScoreBoardTheme.onSurface,
    fontWeight: "600",
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: ScoreBoardTheme.liveCrimson,
  },
  itemDate: {
    fontSize: 11,
    color: ScoreBoardTheme.textMuted,
    fontVariant: ["tabular-nums"],
  },
});
