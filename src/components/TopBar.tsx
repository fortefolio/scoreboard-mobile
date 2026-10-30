import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "./AuthProvider";
import { useLanguage, Locale } from "@/lib/i18n";
import { AuthModal } from "./AuthModal";
import { supabase } from "@/lib/supabase/client";
import { Colors, Spacing } from "@/constants/theme";

interface TopBarProps {
  onSearchPress?: () => void;
}

export function TopBar({ onSearchPress }: TopBarProps) {
  const { locale, setLocale, t } = useLanguage();
  const { user, signOut } = useAuth();
  const router = useRouter();

  const [langModalVisible, setLangModalVisible] = useState(false);
  const [authModalVisible, setAuthModalVisible] = useState(false);
  const [userMenuVisible, setUserMenuVisible] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // Fetch unread notifications
  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    const fetchUnread = async () => {
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("read_at", null);
      setUnreadCount(count || 0);
    };

    fetchUnread();

    // Realtime listener for incoming notifications
    const channel = supabase
      .channel("user-notifications-count")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchUnread();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return (
    <>
      <View style={styles.container}>
        {/* Brand Logo in Digital Font */}
        <TouchableOpacity
          style={styles.logoBtn}
          onPress={() => router.push("/(tabs)")}
          activeOpacity={0.8}
        >
          <Text style={styles.digitalLogo}>SCORE:BOARD</Text>
        </TouchableOpacity>

        {/* Right Action Icons */}
        <View style={styles.actionsRow}>
          {/* Language Selector Button */}
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => setLangModalVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.langBadge}>{locale === "pt" ? "🇵🇹 PT" : "🇬🇧 EN"}</Text>
          </TouchableOpacity>

          {/* Notifications Bell */}
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => {
              if (user) {
                router.push("/(tabs)/notifications");
              } else {
                setAuthModalVisible(true);
              }
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="notifications-outline" size={20} color="#cbd5e1" />
            {unreadCount > 0 && (
              <View style={styles.badgeDot}>
                <Text style={styles.badgeText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* User Status / Avatar */}
          {user ? (
            <TouchableOpacity
              style={styles.avatarBtn}
              onPress={() => setUserMenuVisible(true)}
              activeOpacity={0.8}
            >
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarInitial}>
                  {(user.email?.[0] || "U").toUpperCase()}
                </Text>
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.signInBtn}
              onPress={() => setAuthModalVisible(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.signInBtnText}>{t("nav.signIn") || "Entrar"}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Language Modal */}
      <Modal
        visible={langModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLangModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setLangModalVisible(false)}
        >
          <View style={styles.langModalCard}>
            <Text style={styles.modalTitle}>Escolher Idioma / Language</Text>
            <TouchableOpacity
              style={[styles.langOption, locale === "pt" && styles.langOptionActive]}
              onPress={async () => {
                await setLocale("pt");
                setLangModalVisible(false);
              }}
            >
              <Text style={styles.langOptionEmoji}>🇵🇹</Text>
              <Text style={styles.langOptionLabel}>Português</Text>
              {locale === "pt" && <Ionicons name="checkmark-sharp" size={20} color="#4edea3" />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.langOption, locale === "en" && styles.langOptionActive]}
              onPress={async () => {
                await setLocale("en");
                setLangModalVisible(false);
              }}
            >
              <Text style={styles.langOptionEmoji}>🇬🇧</Text>
              <Text style={styles.langOptionLabel}>English</Text>
              {locale === "en" && <Ionicons name="checkmark-sharp" size={20} color="#4edea3" />}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* User Quick Menu Modal */}
      <Modal
        visible={userMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setUserMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setUserMenuVisible(false)}
        >
          <View style={styles.userMenuCard}>
            <View style={styles.userMenuHeader}>
              <View style={styles.avatarCircleLarge}>
                <Text style={styles.avatarInitialLarge}>
                  {(user?.email?.[0] || "U").toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.userMenuEmail} numberOfLines={1}>
                  {user?.email}
                </Text>
                <Text style={styles.userMenuRole}>Membro ScoreBoard</Text>
              </View>
            </View>

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setUserMenuVisible(false);
                router.push("/(tabs)/profile");
              }}
            >
              <Ionicons name="person-outline" size={18} color="#cbd5e1" />
              <Text style={styles.menuItemText}>{t("nav.settings") || "Perfil & Definições"}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setUserMenuVisible(false);
                router.push("/(tabs)/my-matches");
              }}
            >
              <Ionicons name="trophy-outline" size={18} color="#cbd5e1" />
              <Text style={styles.menuItemText}>{t("nav.myMatches") || "Os Meus Jogos"}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setUserMenuVisible(false);
                router.push("/(tabs)/my-tournaments");
              }}
            >
              <Ionicons name="ribbon-outline" size={18} color="#cbd5e1" />
              <Text style={styles.menuItemText}>{t("nav.myTournaments") || "Os Meus Torneios"}</Text>
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={[styles.menuItem, { marginTop: 4 }]}
              onPress={async () => {
                setUserMenuVisible(false);
                await signOut();
              }}
            >
              <Ionicons name="log-out-outline" size={18} color="#ef4444" />
              <Text style={[styles.menuItemText, { color: "#ef4444" }]}>
                {t("nav.signOut") || "Terminar Sessão"}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Auth Modal */}
      <AuthModal visible={authModalVisible} onClose={() => setAuthModalVisible(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.four,
    backgroundColor: "#0b0f19",
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
  },
  logoBtn: {
    paddingVertical: 4,
  },
  digitalLogo: {
    fontFamily: "Digital7",
    fontSize: 26,
    color: "#ffffff",
    letterSpacing: -0.5,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  actionBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: "#151b2d",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#232d4b",
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  langBadge: {
    fontSize: 12,
    fontWeight: "700",
    color: "#cbd5e1",
  },
  badgeDot: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#ef4444",
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: {
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "800",
  },
  signInBtn: {
    backgroundColor: "#4f46e5",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  signInBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  avatarBtn: {
    padding: 2,
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#4f46e5",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#6366f1",
  },
  avatarInitial: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.four,
  },
  langModalCard: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: "#151b2d",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#232d4b",
    padding: Spacing.four,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#f8fafc",
    marginBottom: Spacing.three,
    textAlign: "center",
  },
  langOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: "#0b0f19",
    borderWidth: 1,
    borderColor: "#232d4b",
    marginBottom: 8,
  },
  langOptionActive: {
    borderColor: "#4f46e5",
    backgroundColor: "rgba(79, 70, 229, 0.12)",
  },
  langOptionEmoji: {
    fontSize: 20,
    marginRight: 10,
  },
  langOptionLabel: {
    fontSize: 14,
    color: "#f8fafc",
    fontWeight: "600",
    flex: 1,
  },
  userMenuCard: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: "#151b2d",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#232d4b",
    padding: Spacing.four,
  },
  userMenuHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.three,
  },
  avatarCircleLarge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#4f46e5",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitialLarge: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
  },
  userMenuEmail: {
    fontSize: 14,
    fontWeight: "700",
    color: "#f8fafc",
  },
  userMenuRole: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 2,
  },
  menuDivider: {
    height: 1,
    backgroundColor: "#1e293b",
    marginVertical: Spacing.two,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 12,
  },
  menuItemText: {
    color: "#cbd5e1",
    fontSize: 14,
    fontWeight: "500",
  },
});
