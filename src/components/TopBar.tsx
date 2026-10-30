import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "./AuthProvider";
import { useTranslation, Locale } from "@/lib/i18n";
import { AuthModal } from "./AuthModal";
import { supabase } from "@/lib/supabase/client";
import { ScoreBoardTheme, Spacing } from "@/constants/theme";

interface TopBarProps {
  onSearchPress?: () => void;
}

export function TopBar({ onSearchPress }: TopBarProps) {
  const { locale, setLocale, t } = useTranslation();
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
      try {
        const { count } = await supabase
          .from("notifications")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .is("read_at", null);
        setUnreadCount(count || 0);
      } catch (e) {
        // Silently fail if table or network is unavailable
      }
    };

    fetchUnread();

    const channelId = `user-notifications-count-${user.id}-${Math.random().toString(36).slice(2, 9)}`;
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
            style={styles.langBtn}
            onPress={() => setLangModalVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.langBadge}>{locale === "pt" ? "PT" : "EN"}</Text>
          </TouchableOpacity>

          {/* Notifications Bell */}
          {user && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => router.push("/(tabs)/notifications")}
              activeOpacity={0.7}
            >
              <Ionicons name="notifications-outline" size={19} color="#dce1fb" />
              {unreadCount > 0 && (
                <View style={styles.badgeCircle}>
                  <Text style={styles.badgeText}>
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}

          {/* User Avatar or Sign In Button */}
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
              <Text style={styles.signInBtnText}>{t("nav.signIn") || "Sign In"}</Text>
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
            <Text style={styles.modalTitle}>
              {locale === "pt" ? "Escolher Idioma" : "Select Language"}
            </Text>
            <TouchableOpacity
              style={[styles.langOption, locale === "pt" && styles.langOptionActive]}
              onPress={async () => {
                await setLocale("pt");
                setLangModalVisible(false);
              }}
            >
              <Text style={styles.langOptionLabel}>Português</Text>
              <Text
                style={[
                  styles.langOptionCode,
                  locale === "pt" && styles.langOptionCodeActive,
                ]}
              >
                PT
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.langOption, locale === "en" && styles.langOptionActive]}
              onPress={async () => {
                await setLocale("en");
                setLangModalVisible(false);
              }}
            >
              <Text style={styles.langOptionLabel}>English</Text>
              <Text
                style={[
                  styles.langOptionCode,
                  locale === "en" && styles.langOptionCodeActive,
                ]}
              >
                EN
              </Text>
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
              <Text style={styles.userMenuLabel}>{t("nav.signedInAs")}</Text>
              <Text style={styles.userMenuEmail} numberOfLines={1}>
                {user?.email}
              </Text>
            </View>

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setUserMenuVisible(false);
                router.push("/(tabs)/profile");
              }}
            >
              <Ionicons name="person-outline" size={18} color="#dce1fb" />
              <Text style={styles.menuItemText}>{t("nav.settings")}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setUserMenuVisible(false);
                router.push("/(tabs)/my-matches");
              }}
            >
              <Ionicons name="trophy-outline" size={18} color="#dce1fb" />
              <Text style={styles.menuItemText}>{t("nav.myMatches")}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setUserMenuVisible(false);
                router.push("/(tabs)/my-tournaments");
              }}
            >
              <Ionicons name="ribbon-outline" size={18} color="#dce1fb" />
              <Text style={styles.menuItemText}>{t("nav.myTournaments")}</Text>
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={[styles.menuItem, { marginTop: 4 }]}
              onPress={async () => {
                setUserMenuVisible(false);
                await signOut();
              }}
            >
              <Ionicons name="log-out-outline" size={18} color="#ffb4ab" />
              <Text style={[styles.menuItemText, { color: "#ffb4ab" }]}>
                {t("nav.signOut")}
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
    height: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    backgroundColor: ScoreBoardTheme.background,
    borderBottomWidth: 1,
    borderBottomColor: ScoreBoardTheme.borderGhost,
  },
  logoBtn: {
    paddingVertical: 4,
  },
  digitalLogo: {
    fontFamily: "Digital7",
    fontSize: 28,
    color: "#ffffff",
    letterSpacing: -0.5,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  langBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: ScoreBoardTheme.surfaceContainerLow,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderGhost,
  },
  langBadge: {
    fontSize: 11,
    fontWeight: "800",
    color: ScoreBoardTheme.onSurface,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: ScoreBoardTheme.surfaceContainerLow,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderGhost,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  badgeCircle: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#ef4444",
    borderRadius: 9,
    minWidth: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 3,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "900",
    color: "#ffffff",
  },
  avatarBtn: {
    padding: 2,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(79, 70, 229, 0.2)",
    borderWidth: 1.5,
    borderColor: "rgba(79, 70, 229, 0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitial: {
    fontSize: 14,
    fontWeight: "900",
    color: ScoreBoardTheme.primary,
  },
  signInBtn: {
    backgroundColor: ScoreBoardTheme.primaryContainer,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 12,
  },
  signInBtnText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#ffffff",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  langModalCard: {
    width: "85%",
    maxWidth: 320,
    backgroundColor: ScoreBoardTheme.surfaceContainerHigh,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderGhost,
    padding: 20,
    gap: 12,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: ScoreBoardTheme.onSurface,
    marginBottom: 6,
  },
  langOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: ScoreBoardTheme.surfaceContainerLow,
    padding: 14,
    borderRadius: 12,
  },
  langOptionActive: {
    borderWidth: 1,
    borderColor: "rgba(78, 222, 163, 0.5)",
  },
  langOptionCode: {
    fontSize: 11,
    fontWeight: "900",
    color: "rgba(220, 225, 251, 0.4)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 6,
  },
  langOptionCodeActive: {
    color: ScoreBoardTheme.secondary,
    backgroundColor: "rgba(78, 222, 163, 0.15)",
  },
  langOptionLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: ScoreBoardTheme.onSurface,
    flex: 1,
  },
  userMenuCard: {
    width: 240,
    backgroundColor: ScoreBoardTheme.surfaceContainerHigh,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderGhost,
    padding: 12,
    position: "absolute",
    top: 70,
    right: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  userMenuHeader: {
    padding: 8,
  },
  userMenuLabel: {
    fontSize: 9,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
    color: "rgba(220, 225, 251, 0.5)",
    marginBottom: 2,
  },
  userMenuEmail: {
    fontSize: 12,
    fontWeight: "700",
    color: ScoreBoardTheme.onSurface,
  },
  menuDivider: {
    height: 1,
    backgroundColor: ScoreBoardTheme.borderGhost,
    marginVertical: 4,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  menuItemText: {
    fontSize: 13,
    fontWeight: "600",
    color: ScoreBoardTheme.onSurface,
  },
});
