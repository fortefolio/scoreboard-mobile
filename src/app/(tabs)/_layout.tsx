import React, { useEffect, useState } from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Platform } from "react-native";
import { useAuth } from "@/components/AuthProvider";
import { useLanguage } from "@/lib/i18n";
import { supabase } from "@/lib/supabase/client";

export default function TabLayout() {
  const { t } = useLanguage();
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
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("read_at", null);
      setUnreadNotifications(count || 0);
    };

    checkUnread();

    const channel = supabase
      .channel("tab-notifications-badge")
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
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#4edea3",
        tabBarInactiveTintColor: "#64748b",
        tabBarStyle: {
          backgroundColor: "#0d1322",
          borderTopColor: "#1e293b",
          borderTopWidth: 1,
          height: Platform.OS === "ios" ? 84 : 64,
          paddingTop: 8,
          paddingBottom: Platform.OS === "ios" ? 28 : 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("nav.matches") || "Feed",
          tabBarIcon: ({ size, focused }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              size={22}
              color={focused ? "#4edea3" : "#64748b"}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="my-matches"
        options={{
          title: t("nav.myMatches") || "Os Meus Jogos",
          tabBarIcon: ({ size, focused }) => (
            <Ionicons
              name={focused ? "tennisball" : "tennisball-outline"}
              size={22}
              color={focused ? "#4edea3" : "#64748b"}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="my-tournaments"
        options={{
          title: t("nav.myTournaments") || "Torneios",
          tabBarIcon: ({ size, focused }) => (
            <Ionicons
              name={focused ? "trophy" : "trophy-outline"}
              size={22}
              color={focused ? "#4edea3" : "#64748b"}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="notifications"
        options={{
          title: t("nav.dashboard") || "Alertas",
          tabBarBadge: unreadNotifications > 0 ? unreadNotifications : undefined,
          tabBarBadgeStyle: {
            backgroundColor: "#ef4444",
            color: "#ffffff",
            fontSize: 10,
            fontWeight: "800",
          },
          tabBarIcon: ({ size, focused }) => (
            <Ionicons
              name={focused ? "notifications" : "notifications-outline"}
              size={22}
              color={focused ? "#4edea3" : "#64748b"}
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
              size={22}
              color={focused ? "#4edea3" : "#64748b"}
            />
          ),
        }}
      />
    </Tabs>
  );
}
