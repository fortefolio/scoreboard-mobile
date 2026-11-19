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
  const { locale } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();
  const isPt = locale === "pt";

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
        .select("id, user_id, title, body, data, read_at, created_at")
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

  const deleteNotification = async (id: string) => {
    try {
      await supabase.from("notifications").delete().eq("id", id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (e) {
      console.warn("Failed to delete notification:", e);
    }
  };

  const clearAll = async () => {
    if (!user) return;
    try {
      await supabase.from("notifications").delete().eq("user_id", user.id);
      setNotifications([]);
    } catch (e) {
      console.warn("Failed to clear notifications:", e);
    }
  };

  const handleUmpireResponse = async (
    notifId: string,
    matchId: string,
    status: "accepted" | "declined"
  ) => {
    try {
      await supabase
        .from("matches")
        .update({ umpire_invite_status: status })
        .eq("id", matchId);
      await markAsRead(notifId);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notifId
            ? { ...n, data: { ...(n.data || {}), response_status: status } }
            : n
        )
      );
    } catch (e) {
      console.warn("Failed to respond to umpire invite:", e);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <TopBar />

      <View style={styles.header}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={styles.headerTitle}>
            {isPt ? "Notificações" : "Notifications"}
          </Text>
          <Text style={styles.headerSubtitle}>
            {isPt
              ? "Alertas de jogos e torneios em tempo real"
              : "Real-time match and tournament alerts"}
          </Text>
        </View>

        {user && notifications.length > 0 && (
          <View style={styles.headerActions}>
            {notifications.some((n) => !n.read_at) && (
              <TouchableOpacity style={styles.markAllBtn} onPress={markAllAsRead}>
                <Text style={styles.markAllText}>
                  {isPt ? "Marcar lidas" : "Mark read"}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.markAllBtn} onPress={clearAll}>
              <Text style={styles.markAllText}>
                {isPt ? "Limpar" : "Clear all"}
              </Text>
            </TouchableOpacity>
          </View>
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
                  <View style={styles.itemMetaRight}>
                    {isUnread && <View style={styles.unreadDot} />}
                    {isUnread && (
                      <TouchableOpacity
                        onPress={() => markAsRead(item.id)}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        accessibilityLabel="Mark as read"
                      >
                        <Ionicons
                          name="checkmark-done-outline"
                          size={15}
                          color={ScoreBoardTheme.onSurfaceVariant}
                        />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      onPress={() => deleteNotification(item.id)}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      accessibilityLabel="Delete"
                    >
                      <Ionicons
                        name="trash-outline"
                        size={14}
                        color={ScoreBoardTheme.textMuted}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <Text
                  style={[styles.itemTitle, isUnread && styles.itemTitleUnread]}
                  numberOfLines={2}
                >
                  {item.title}
                </Text>

                {isInvitation && matchId && !data.response_status && (
                  <View style={styles.inviteActionsRow}>
                    <TouchableOpacity
                      style={styles.acceptBtn}
                      onPress={() => handleUmpireResponse(item.id, matchId, "accepted")}
                    >
                      <Text style={styles.acceptBtnText}>
                        {isPt ? "Aceitar" : "Accept"}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.declineBtn}
                      onPress={() => handleUmpireResponse(item.id, matchId, "declined")}
                    >
                      <Text style={styles.declineBtnText}>
                        {isPt ? "Recusar" : "Decline"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
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
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  itemMetaRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  inviteActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },
  acceptBtn: {
    backgroundColor: ScoreBoardTheme.onSurface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  acceptBtnText: {
    color: ScoreBoardTheme.surfaceContainerLowest,
    fontSize: 12,
    fontWeight: "600",
  },
  declineBtn: {
    backgroundColor: ScoreBoardTheme.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  declineBtnText: {
    color: ScoreBoardTheme.onSurfaceVariant,
    fontSize: 12,
    fontWeight: "500",
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
