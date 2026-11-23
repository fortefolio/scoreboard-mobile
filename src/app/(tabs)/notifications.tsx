import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { TopBar } from "@/components/TopBar";
import { NotificationListSkeleton } from "@/components/common/Skeleton";
import { useAuth } from "@/components/AuthProvider";
import { useLanguage } from "@/lib/i18n";
import { supabase } from "@/lib/supabase/client";
import { ScoreBoardTheme } from "@/constants/theme";

function getRelativeTime(dateString: string, isPt: boolean): string {
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffInSeconds < 60) return isPt ? "Agora mesmo" : "Just now";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return isPt ? `Há ${diffInMinutes}m` : `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return isPt ? `Há ${diffInHours}h` : `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return isPt ? `Há ${diffInDays}d` : `${diffInDays}d ago`;
  return date.toLocaleDateString();
}

export default function NotificationsScreen() {
  const { locale, t } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();
  const isPt = locale === "pt";

  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [pendingInvitationMatchIds, setPendingInvitationMatchIds] = useState<Set<string>>(new Set());
  const [menuNotification, setMenuNotification] = useState<any | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setPendingInvitationMatchIds(new Set());
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
      const list = data || [];
      setNotifications(list);

      const inviteMatchIds = Array.from(
        new Set(
          list
            .filter((n: any) => {
              const type = n.data?.type || "";
              return (
                typeof type === "string" &&
                type.includes("umpire") &&
                (type.includes("invitation") || type.includes("assignment"))
              );
            })
            .map((n: any) => n.data?.match_id || n.data?.matchId)
            .filter(Boolean)
        )
      ) as string[];

      if (inviteMatchIds.length > 0) {
        const { data: matchRows } = await supabase
          .from("matches")
          .select("id, umpire_id, umpire_invite_status")
          .in("id", inviteMatchIds);
        if (matchRows) {
          setPendingInvitationMatchIds(
            new Set(
              matchRows
                .filter((m: any) => m.umpire_id === user.id && m.umpire_invite_status === "pending")
                .map((m: any) => m.id)
            )
          );
        }
      } else {
        setPendingInvitationMatchIds(new Set());
      }
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
      const now = new Date().toISOString();
      await supabase
        .from("notifications")
        .update({ read_at: now })
        .eq("id", id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read_at: now } : n))
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
      setPendingInvitationMatchIds(new Set());
    } catch (e) {
      console.warn("Failed to clear notifications:", e);
    }
  };

  const handleUmpireResponse = async (
    notifId: string,
    matchId: string,
    action: "accept" | "refuse"
  ) => {
    try {
      const rpcName = action === "accept" ? "accept_umpire_invitation" : "refuse_umpire_invitation";
      const { error } = await supabase.rpc(rpcName, {
        p_match_id: matchId,
        p_notification_id: notifId,
      });

      if (error) {
        // Fallback if RPC isn't available in older local schema
        const status = action === "accept" ? "accepted" : "declined";
        await supabase
          .from("matches")
          .update({ umpire_invite_status: status })
          .eq("id", matchId);
      }

      await markAsRead(notifId);
      setPendingInvitationMatchIds((prev) => {
        const next = new Set(prev);
        next.delete(matchId);
        return next;
      });
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notifId
            ? { ...n, data: { ...(n.data || {}), response_status: action === "accept" ? "accepted" : "declined" } }
            : n
        )
      );
    } catch (e) {
      console.warn("Failed to respond to umpire invite:", e);
    }
  };

  const menuData = menuNotification?.data || {};
  const menuMatchId = menuData.match_id || menuData.matchId;
  const menuType = typeof menuData.type === "string" ? menuData.type : "";
  const menuIsInvitation =
    menuType.includes("umpire") &&
    (menuType.includes("invitation") || menuType.includes("assignment"));

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <TopBar />

      <View style={styles.header}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={styles.headerTitle}>{t("notifications.title") || "Notifications"}</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {t("notifications.subtitle") || "Your activity stream"}
          </Text>
        </View>

        {user && notifications.length > 0 && (
          <View style={styles.headerActions}>
            {notifications.some((n) => !n.read_at) && (
              <TouchableOpacity style={styles.markAllBtn} onPress={markAllAsRead} activeOpacity={0.75}>
                <Ionicons name="checkmark-done-outline" size={13} color={ScoreBoardTheme.onSurface} />
                <Text style={styles.markAllText}>
                  {isPt ? "Marcar lidas" : "Mark read"}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.clearAllBtn} onPress={clearAll} activeOpacity={0.75}>
              <Ionicons name="trash-outline" size={13} color={ScoreBoardTheme.textMuted} />
              <Text style={styles.clearAllText}>
                {t("notifications.clearAll") || "Clear all"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {loading ? (
        <NotificationListSkeleton />
      ) : !user ? (
        <View style={styles.centered}>
          <Ionicons name="lock-closed-outline" size={48} color="#475569" />
          <Text style={styles.emptyTitle}>{t("auth.welcomeBack") || "Welcome Back"}</Text>
          <Text style={styles.emptySubtitle}>
            {t("auth.manageSubtitle") || "Sign in to manage your events"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={ScoreBoardTheme.onSurfaceVariant}
            />
          }
          renderItem={({ item }) => {
            const isUnread = !item.read_at;
            const data = item.data || {};
            const type = typeof data.type === "string" ? data.type : "";
            const isInvitation =
              type.includes("umpire") &&
              (type.includes("invitation") || type.includes("assignment"));
            const matchId = data.match_id || data.matchId;
            const matchDetails = data.match_details || {};
            const bodyText = item.body || item.message;
            const showInlineInviteActions =
              isInvitation &&
              matchId &&
              !data.response_status &&
              (pendingInvitationMatchIds.size === 0 || pendingInvitationMatchIds.has(matchId));

            return (
              <TouchableOpacity
                style={[styles.itemCard, !isUnread && styles.itemCardRead]}
                onPress={() => {
                  if (isUnread) markAsRead(item.id);
                  if (matchId) {
                    router.push(`/match/${matchId}` as any);
                  }
                }}
                activeOpacity={0.8}
              >
                {/* Left Icon Box */}
                <View style={styles.leftIconBox}>
                  <Ionicons
                    name={isInvitation ? "shield-checkmark-outline" : "notifications-outline"}
                    size={18}
                    color={ScoreBoardTheme.textMuted}
                  />
                </View>

                {/* Content Column */}
                <View style={styles.cardBodyCol}>
                  <View style={styles.metaLine}>
                    <View style={styles.typeBadge}>
                      <Text style={styles.typeBadgeText}>
                        {isInvitation
                          ? t("notifications.umpireInvitation") || "Umpire Invitation"
                          : t("notifications.matchUpdate") || "Match Update"}
                      </Text>
                    </View>
                    <Text style={styles.itemDate}>
                      {getRelativeTime(item.created_at, isPt)}
                    </Text>
                    {matchDetails.tournament ? (
                      <Text style={styles.tournamentMeta} numberOfLines={1}>
                        • {matchDetails.tournament}
                      </Text>
                    ) : null}
                  </View>

                  <Text
                    style={[styles.itemTitle, isUnread && styles.itemTitleUnread]}
                    numberOfLines={1}
                  >
                    {isInvitation && matchDetails.teams ? matchDetails.teams : item.title}
                  </Text>

                  {bodyText ? (
                    <Text style={styles.itemBody} numberOfLines={2}>
                      {bodyText}
                    </Text>
                  ) : null}
                </View>

                {/* Right Side: Inline Accept/Decline OR Unread Dot + 3-Dot Menu */}
                <View style={styles.rightActions}>
                  {showInlineInviteActions ? (
                    <>
                      <TouchableOpacity
                        style={styles.inlineIconBtn}
                        onPress={() => handleUmpireResponse(item.id, matchId, "accept")}
                        accessibilityLabel={t("notifications.accept") || "Accept"}
                        testID={`notif-accept-${item.id}`}
                      >
                        <Ionicons name="checkmark" size={15} color={ScoreBoardTheme.onSurfaceVariant} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.inlineIconBtn}
                        onPress={() => handleUmpireResponse(item.id, matchId, "refuse")}
                        accessibilityLabel={t("notifications.decline") || "Decline"}
                        testID={`notif-decline-${item.id}`}
                      >
                        <Ionicons name="close" size={15} color={ScoreBoardTheme.textMuted} />
                      </TouchableOpacity>
                    </>
                  ) : isUnread ? (
                    <View style={styles.unreadDot} />
                  ) : null}

                  <TouchableOpacity
                    style={styles.menuBtn}
                    onPress={() => setMenuNotification(item)}
                    accessibilityLabel="Actions"
                    testID={`notif-menu-${item.id}`}
                  >
                    <Ionicons name="ellipsis-vertical" size={16} color={ScoreBoardTheme.textMuted} />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Ionicons name="notifications-off-outline" size={48} color="#334155" />
              <Text style={styles.emptyTitle}>
                {t("notifications.quietTitle") || "No notifications"}
              </Text>
              <Text style={styles.emptySubtitle}>
                {t("notifications.quietDesc") || "No activity detected at the moment."}
              </Text>
            </View>
          }
        />
      )}

      {/* 3-Dot Action Menu Modal */}
      <Modal
        visible={Boolean(menuNotification)}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuNotification(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setMenuNotification(null)}>
          <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
            {menuMatchId ? (
              <TouchableOpacity
                style={styles.modalItem}
                onPress={() => {
                  if (menuNotification && !menuNotification.read_at) {
                    markAsRead(menuNotification.id);
                  }
                  setMenuNotification(null);
                  router.push(`/match/${menuMatchId}` as any);
                }}
              >
                <Ionicons
                  name={menuIsInvitation ? "eye-outline" : "arrow-forward-outline"}
                  size={16}
                  color={ScoreBoardTheme.onSurfaceVariant}
                />
                <Text style={styles.modalItemText}>
                  {menuIsInvitation
                    ? t("notifications.details") || "Details"
                    : t("notifications.liveFeed") || "Live Feed"}
                </Text>
              </TouchableOpacity>
            ) : null}

            {menuNotification && !menuNotification.read_at ? (
              <TouchableOpacity
                style={[styles.modalItem, menuMatchId ? styles.modalItemDivider : null]}
                onPress={() => {
                  const id = menuNotification.id;
                  setMenuNotification(null);
                  markAsRead(id);
                }}
              >
                <Ionicons name="checkmark-done-outline" size={16} color={ScoreBoardTheme.onSurfaceVariant} />
                <Text style={styles.modalItemText}>
                  {t("notifications.markAsRead") || "Mark as read"}
                </Text>
              </TouchableOpacity>
            ) : null}

            {menuNotification ? (
              <TouchableOpacity
                style={[styles.modalItem, styles.modalItemDivider]}
                onPress={() => {
                  const id = menuNotification.id;
                  setMenuNotification(null);
                  deleteNotification(id);
                }}
              >
                <Ionicons name="trash-outline" size={16} color="#f87171" />
                <Text style={[styles.modalItemText, { color: "#f87171" }]}>
                  {t("notifications.deleteNotif") || "Delete notification"}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </Pressable>
      </Modal>
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
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  markAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: ScoreBoardTheme.surfaceContainerHigh,
    paddingHorizontal: 9,
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
  clearAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "transparent",
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
  },
  clearAllText: {
    color: ScoreBoardTheme.textMuted,
    fontSize: 11,
    fontWeight: "500",
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
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: ScoreBoardTheme.surfaceContainer,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  itemCardRead: {
    opacity: 0.78,
  },
  leftIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: ScoreBoardTheme.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cardBodyCol: {
    flex: 1,
    minWidth: 0,
  },
  metaLine: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 4,
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: ScoreBoardTheme.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: "500",
    color: ScoreBoardTheme.onSurfaceVariant,
  },
  itemDate: {
    fontSize: 11,
    color: ScoreBoardTheme.textMuted,
    fontVariant: ["tabular-nums"],
  },
  tournamentMeta: {
    fontSize: 11,
    color: ScoreBoardTheme.textMuted,
    maxWidth: 130,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: ScoreBoardTheme.onSurfaceVariant,
    lineHeight: 18,
  },
  itemTitleUnread: {
    color: ScoreBoardTheme.onSurface,
  },
  itemBody: {
    fontSize: 12,
    color: ScoreBoardTheme.textMuted,
    lineHeight: 17,
    marginTop: 2,
  },
  rightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  inlineIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: ScoreBoardTheme.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: ScoreBoardTheme.onSurfaceVariant,
  },
  menuBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 260,
    backgroundColor: ScoreBoardTheme.surfaceContainerHigh,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    overflow: "hidden",
  },
  modalItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  modalItemDivider: {
    borderTopWidth: 1,
    borderTopColor: ScoreBoardTheme.borderSubtle,
  },
  modalItemText: {
    fontSize: 14,
    fontWeight: "500",
    color: ScoreBoardTheme.onSurface,
  },
});
