import React, { useEffect, useState } from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Platform } from "react-native";
import { useAuth } from "@/components/AuthProvider";
import { useTranslation } from "@/lib/i18n";
import { supabase } from "@/lib/supabase/client";
import { ScoreBoardTheme } from "@/constants/theme";

export default function TabLayout() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [unreadNotifications, setUnreadNotifications] = useState<number>(0);

  useEffect(() => {
    if (!user) {
      setUnreadNotifications(0);
      return;
    }

    const checkUnread = async () => {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("read_at", null);
      setUnreadNotifications(count || 0);
    };

    checkUnread();

    const channelId = `tab-notifications-badge-${user.id}-${Math.random().toString(36).slice(2, 9)}`;
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

  return (
    <Tabs
      tabBar={() => null}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("nav.matches") || "Matches",
          tabBarIcon: ({ size, focused }) => (
            <Ionicons
              name={focused ? "tennisball" : "tennisball-outline"}
              size={20}
              color={focused ? ScoreBoardTheme.onSurface : ScoreBoardTheme.textMuted}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="tournaments"
        options={{
          title: t("nav.tournaments") || "Tournaments",
          tabBarIcon: ({ size, focused }) => (
            <Ionicons
              name={focused ? "trophy" : "trophy-outline"}
              size={20}
              color={focused ? ScoreBoardTheme.onSurface : ScoreBoardTheme.textMuted}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="following"
        options={{
          title: t("common.following") || "Following",
          tabBarIcon: ({ size, focused }) => (
            <Ionicons
              name={focused ? "star" : "star-outline"}
              size={20}
              color={focused ? ScoreBoardTheme.onSurface : ScoreBoardTheme.textMuted}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="notifications"
        options={{
          title: t("nav.notifications") || "Notifications",
          tabBarBadge: unreadNotifications > 0 ? unreadNotifications : undefined,
          tabBarBadgeStyle: {
            backgroundColor: ScoreBoardTheme.error,
            color: "#ffffff",
            fontSize: 10,
            fontWeight: "600",
          },
          tabBarIcon: ({ size, focused }) => (
            <Ionicons
              name={focused ? "notifications" : "notifications-outline"}
              size={20}
              color={focused ? ScoreBoardTheme.onSurface : ScoreBoardTheme.textMuted}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: t("nav.settings") || "Perfil",
          tabBarIcon: ({ size, focused }) => (
            <Ionicons
              name={focused ? "person" : "person-outline"}
              size={20}
              color={focused ? ScoreBoardTheme.onSurface : ScoreBoardTheme.textMuted}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="my-matches"
        options={{
          tabBarButton: () => null,
          tabBarItemStyle: { display: "none" },
        }}
      />

      <Tabs.Screen
        name="my-tournaments"
        options={{
          tabBarButton: () => null,
          tabBarItemStyle: { display: "none" },
        }}
      />

      <Tabs.Screen
        name="umpiring"
        options={{
          tabBarButton: () => null,
          tabBarItemStyle: { display: "none" },
        }}
      />
    </Tabs>
  );
}
