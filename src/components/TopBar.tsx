import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "./AuthProvider";
import { useTranslation } from "@/lib/i18n";
import { supabase } from "@/lib/supabase/client";
import { AuthModal } from "./AuthModal";
import { ScoreBoardTheme } from "@/constants/theme";

interface TopBarProps {
  onSearchPress?: () => void;
}

export function TopBar({ onSearchPress }: TopBarProps) {
  const { locale, setLocale, t } = useTranslation();
  const { user, signOut } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [langModalVisible, setLangModalVisible] = useState(false);
  const [authModalVisible, setAuthModalVisible] = useState(false);
  const [userMenuVisible, setUserMenuVisible] = useState(false);
  const [subscriptionTier, setSubscriptionTier] = useState<string>("free");

  useEffect(() => {
    let active = true;
    if (!user?.id) {
      setSubscriptionTier("free");
      return;
    }
    (async () => {
      try {
        const { data } = await supabase
          .from("users")
          .select("subscription_tier")
          .eq("id", user.id)
          .maybeSingle();
        if (active && data?.subscription_tier) {
          setSubscriptionTier(data.subscription_tier);
        }
      } catch {
        // Ignore tier fetch errors in offline/test environments
      }
    })();
    return () => {
      active = false;
    };
  }, [user?.id]);

  const isPro = subscriptionTier === "pro";

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

          {/* Hamburger Menu or Sign In Button */}
          {user ? (
            <TouchableOpacity
              testID="topbar-avatar-btn"
              style={styles.menuBtn}
              onPress={() => setUserMenuVisible((prev) => !prev)}
              activeOpacity={0.8}
              accessibilityLabel="Menu"
            >
              <Ionicons
                name={userMenuVisible ? "close" : "menu"}
                size={19}
                color={ScoreBoardTheme.onSurface}
              />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              testID="topbar-signin-btn"
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
          style={styles.userMenuOverlay}
          activeOpacity={1}
          onPress={() => setUserMenuVisible(false)}
        >
          <View
            style={[styles.userMenuCard, { top: insets.top + 56 }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.userMenuHeader}>
              <View style={styles.userMenuTopRow}>
                <Text style={styles.userMenuLabel}>
                  {t("nav.signedInAs") || (locale === "pt" ? "Sessão iniciada como" : "Signed in as")}
                </Text>
                <View style={styles.tierBadge}>
                  <Text style={[styles.tierBadgeText, isPro ? styles.tierBadgeTextPro : styles.tierBadgeTextFree]}>
                    {isPro ? "PRO" : "FREE"}
                  </Text>
                </View>
              </View>
              <Text style={styles.userMenuEmail} numberOfLines={1}>
                {user?.email}
              </Text>
            </View>

            <View style={styles.menuItemsGroup}>
              <TouchableOpacity
                testID="menu-settings-btn"
                style={styles.menuItem}
                onPress={() => {
                  setUserMenuVisible(false);
                  setTimeout(() => {
                    router.push("/(tabs)/profile" as any);
                  }, 100);
                }}
              >
                <Ionicons name="settings-outline" size={16} color="#a3a9b8" />
                <Text style={styles.menuItemText}>{t("nav.settings")}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                testID="menu-my-matches-btn"
                style={styles.menuItem}
                onPress={() => {
                  setUserMenuVisible(false);
                  setTimeout(() => {
                    router.push("/(tabs)/my-matches" as any);
                  }, 100);
                }}
              >
                <Ionicons name="grid-outline" size={16} color="#a3a9b8" />
                <Text style={styles.menuItemText}>
                  {locale === "pt" ? "Os Meus Eventos" : "My Events"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                testID="menu-logout-btn"
                style={styles.menuItem}
                onPress={async () => {
                  setUserMenuVisible(false);
                  await signOut();
                }}
              >
                <Ionicons name="log-out-outline" size={16} color="#e5484d" />
                <Text style={[styles.menuItemText, { color: "#e5484d" }]}>
                  {t("nav.signOut")}
                </Text>
              </TouchableOpacity>
            </View>
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
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    backgroundColor: ScoreBoardTheme.background,
    borderBottomWidth: 1,
    borderBottomColor: ScoreBoardTheme.borderSubtle,
  },
  logoBtn: {
    paddingVertical: 4,
  },
  digitalLogo: {
    fontFamily: "Digital7",
    fontSize: 26,
    color: ScoreBoardTheme.onSurface,
    letterSpacing: -0.5,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  langBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: ScoreBoardTheme.surfaceContainer,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
  },
  langBadge: {
    fontSize: 11,
    fontWeight: "500",
    color: ScoreBoardTheme.onSurfaceVariant,
  },
  menuBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: ScoreBoardTheme.surfaceContainer,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    justifyContent: "center",
    alignItems: "center",
  },
  signInBtn: {
    backgroundColor: ScoreBoardTheme.onSurface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  signInBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: ScoreBoardTheme.surfaceContainerLowest,
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
    backgroundColor: ScoreBoardTheme.surfaceContainerHighest,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.onSurfaceVariant,
  },
  langOptionCode: {
    fontSize: 11,
    fontWeight: "900",
    color: ScoreBoardTheme.textMuted,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: ScoreBoardTheme.surfaceContainer,
    borderRadius: 6,
  },
  langOptionCodeActive: {
    color: ScoreBoardTheme.surfaceContainerLowest,
    backgroundColor: ScoreBoardTheme.onSurface,
  },
  langOptionLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: ScoreBoardTheme.onSurface,
    flex: 1,
  },
  userMenuOverlay: {
    flex: 1,
    backgroundColor: "transparent",
  },
  userMenuCard: {
    width: 208,
    backgroundColor: "#11141c",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(238, 240, 245, 0.10)",
    overflow: "hidden",
    position: "absolute",
    right: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  userMenuHeader: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(238, 240, 245, 0.08)",
    backgroundColor: "rgba(22, 26, 36, 0.4)",
  },
  userMenuTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
    gap: 8,
  },
  userMenuLabel: {
    fontSize: 12,
    color: ScoreBoardTheme.textMuted,
  },
  tierBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(238, 240, 245, 0.12)",
    backgroundColor: "rgba(22, 26, 36, 0.7)",
  },
  tierBadgeText: {
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
    fontSize: 10,
    fontWeight: "600",
  },
  tierBadgeTextPro: {
    color: "#eef0f5",
  },
  tierBadgeTextFree: {
    color: "#7a8296",
  },
  userMenuEmail: {
    fontSize: 12,
    fontWeight: "500",
    color: "#eef0f5",
  },
  menuItemsGroup: {
    padding: 6,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  menuItemText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#a3a9b8",
  },
});
