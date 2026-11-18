import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, usePathname, useSegments } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/components/AuthProvider";
import { useTranslation } from "@/lib/i18n";
import { supabase } from "@/lib/supabase/client";
import { ScoreBoardTheme } from "@/constants/theme";

export function BottomTabBar() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const [unreadNotifications, setUnreadNotifications] = useState<number>(0);

  useEffect(() => {
    if (!user) {
      setUnreadNotifications(0);
      return;
    }

    const checkUnread = async () => {
      try {
        const { count } = await supabase
          .from("notifications")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .is("read_at", null);
        setUnreadNotifications(count || 0);
      } catch {
        // Ignore network errors
      }
    };

    checkUnread();

    const channelId = `bottom-tab-notifications-${user.id}-${Math.random().toString(36).slice(2, 9)}`;
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
          checkUnread();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const segs = segments as string[];
  const isTournaments =
    pathname === "/tournaments" || segs.includes("tournaments");
  const isFollowing =
    pathname === "/following" || segs.includes("following");
  const isNotifications =
    pathname === "/notifications" || segs.includes("notifications");
  const isProfile =
    pathname === "/profile" || segs.includes("profile");
  const isMatches =
    pathname === "/" ||
    pathname === "/index" ||
    (segs.includes("(tabs)") &&
      !isTournaments &&
      !isFollowing &&
      !isNotifications &&
      !isProfile &&
      !segs.includes("my-matches") &&
      !segs.includes("my-tournaments") &&
      !segs.includes("umpiring"));

  if (!user && isMatches) {
    return null;
  }

  const items = [
    {
      key: "matches",
      label: t("nav.matches") || "Matches",
      route: "/(tabs)",
      activeIcon: "tennisball" as const,
      inactiveIcon: "tennisball-outline" as const,
      active: isMatches,
      badge: 0,
    },
    {
      key: "tournaments",
      label: t("nav.tournaments") || "Tournaments",
      route: "/(tabs)/tournaments",
      activeIcon: "trophy" as const,
      inactiveIcon: "trophy-outline" as const,
      active: isTournaments,
      badge: 0,
    },
    {
      key: "following",
      label: t("common.following") || "Following",
      route: "/(tabs)/following",
      activeIcon: "star" as const,
      inactiveIcon: "star-outline" as const,
      active: isFollowing,
      badge: 0,
    },
    {
      key: "notifications",
      label: t("nav.notifications") || "Notifications",
      route: "/(tabs)/notifications",
      activeIcon: "notifications" as const,
      inactiveIcon: "notifications-outline" as const,
      active: isNotifications,
      badge: unreadNotifications,
    },
    {
      key: "profile",
      label: t("nav.settings") || "Settings",
      route: "/(tabs)/profile",
      activeIcon: "person" as const,
      inactiveIcon: "person-outline" as const,
      active: isProfile,
      badge: 0,
    },
  ];

  const bottomPad = Math.max(insets.bottom, Platform.OS === "ios" ? 20 : 6);

  return (
    <View style={[styles.container, { paddingBottom: bottomPad }]}>
      {items.map((item) => (
        <TouchableOpacity
          key={item.key}
          style={styles.tabItem}
          onPress={() => router.push(item.route as any)}
          activeOpacity={0.75}
          accessibilityLabel={item.label}
        >
          <View style={styles.iconWrap}>
            <Ionicons
              name={item.active ? item.activeIcon : item.inactiveIcon}
              size={20}
              color={item.active ? ScoreBoardTheme.onSurface : ScoreBoardTheme.textMuted}
            />
            {item.badge > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {item.badge > 9 ? "9+" : item.badge}
                </Text>
              </View>
            )}
          </View>
          <Text
            style={[
              styles.label,
              { color: item.active ? ScoreBoardTheme.onSurface : ScoreBoardTheme.textMuted },
            ]}
            numberOfLines={1}
          >
            {item.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: ScoreBoardTheme.background,
    borderTopWidth: 1,
    borderTopColor: ScoreBoardTheme.borderSubtle,
    paddingTop: 6,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  iconWrap: {
    position: "relative",
    width: 28,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: -3,
    right: -6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: ScoreBoardTheme.error,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#ffffff",
  },
  label: {
    fontSize: 10,
    fontWeight: "500",
  },
});
