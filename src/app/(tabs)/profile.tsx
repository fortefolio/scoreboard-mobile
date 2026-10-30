import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { TopBar } from "@/components/TopBar";
import { AuthModal } from "@/components/AuthModal";
import { useAuth } from "@/components/AuthProvider";
import { useTranslation } from "@/lib/i18n";
import { ScoreBoardTheme } from "@/constants/theme";

export default function ProfileScreen() {
  const { t, locale, setLocale } = useTranslation();
  const { user, signOut } = useAuth();
  const [authModalVisible, setAuthModalVisible] = useState(false);

  const handleSignOut = () => {
    Alert.alert(
      t("nav.signOut"),
      locale === "pt"
        ? "Tem a certeza de que pretende sair da sua conta?"
        : "Are you sure you want to sign out?",
      [
        { text: t("common.cancel"), style: "cancel" },
        { text: t("nav.signOut"), style: "destructive", onPress: () => signOut() },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <TopBar />

      <ScrollView contentContainerStyle={styles.content}>
        {/* User Card */}
        <View style={styles.userCard}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarText}>
              {(user?.email?.[0] || "U").toUpperCase()}
            </Text>
          </View>

          <View style={styles.userInfo}>
            <Text style={styles.userEmail} numberOfLines={1}>
              {user ? user.email : locale === "pt" ? "Utilizador Convidado" : "Guest User"}
            </Text>
            <Text style={styles.userRole}>
              {user
                ? locale === "pt" ? "Conta ScoreBoard Ativa" : "Active ScoreBoard Account"
                : locale === "pt" ? "Modo Visitante" : "Guest Mode"}
            </Text>
          </View>

          {!user && (
            <TouchableOpacity
              style={styles.loginCardBtn}
              onPress={() => setAuthModalVisible(true)}
            >
              <Text style={styles.loginCardBtnText}>{t("nav.signIn")}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Section: Idioma / Language */}
        <Text style={styles.sectionHeader}>
          {locale === "pt" ? "Idioma & Região" : "Language & Region"}
        </Text>
        <View style={styles.sectionCard}>
          <TouchableOpacity
            style={[styles.rowItem, locale === "pt" && styles.rowItemActive]}
            onPress={() => setLocale("pt")}
          >
            <Text style={styles.rowLabel}>Português</Text>
            <Text style={[styles.codeBadge, locale === "pt" && styles.codeBadgeActive]}>PT</Text>
          </TouchableOpacity>

          <View style={styles.rowDivider} />

          <TouchableOpacity
            style={[styles.rowItem, locale === "en" && styles.rowItemActive]}
            onPress={() => setLocale("en")}
          >
            <Text style={styles.rowLabel}>English</Text>
            <Text style={[styles.codeBadge, locale === "en" && styles.codeBadgeActive]}>EN</Text>
          </TouchableOpacity>
        </View>

        {/* Section: Sistema & Aplicação */}
        <Text style={styles.sectionHeader}>
          {locale === "pt" ? "Aplicação & Sistema" : "Application & System"}
        </Text>
        <View style={styles.sectionCard}>
          <View style={styles.rowItem}>
            <View style={styles.rowLeft}>
              <Ionicons name="moon-outline" size={20} color="#94a3b8" />
              <Text style={styles.rowLabel}>
                {locale === "pt" ? "Tema" : "Theme"}
              </Text>
            </View>
            <Text style={styles.rowValue}>ScoreBoard Dark</Text>
          </View>

          <View style={styles.rowDivider} />

          <View style={styles.rowItem}>
            <View style={styles.rowLeft}>
              <Ionicons name="information-circle-outline" size={20} color="#94a3b8" />
              <Text style={styles.rowLabel}>
                {locale === "pt" ? "Versão" : "Version"}
              </Text>
            </View>
            <Text style={styles.rowValue}>1.0.0 (Expo SDK 58)</Text>
          </View>
        </View>

        {/* Section: Terminar Sessão */}
        {user && (
          <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={20} color="#ffb4ab" />
            <Text style={styles.signOutText}>{t("nav.signOut")}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <AuthModal visible={authModalVisible} onClose={() => setAuthModalVisible(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: ScoreBoardTheme.background,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: ScoreBoardTheme.surfaceContainerLow,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderGhost,
    borderRadius: 20,
    padding: 16,
    marginBottom: 24,
  },
  avatarLarge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: ScoreBoardTheme.primaryContainer,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "800",
  },
  userInfo: {
    flex: 1,
    marginLeft: 14,
  },
  userEmail: {
    fontSize: 15,
    fontWeight: "700",
    color: ScoreBoardTheme.onSurface,
  },
  userRole: {
    fontSize: 12,
    color: "rgba(220, 225, 251, 0.55)",
    marginTop: 3,
  },
  loginCardBtn: {
    backgroundColor: ScoreBoardTheme.primaryContainer,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  loginCardBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: "800",
    color: "rgba(220, 225, 251, 0.5)",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionCard: {
    backgroundColor: ScoreBoardTheme.surfaceContainerLow,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderGhost,
    borderRadius: 18,
    marginBottom: 24,
    overflow: "hidden",
  },
  rowItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowItemActive: {
    backgroundColor: "rgba(78, 222, 163, 0.08)",
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  codeBadge: {
    fontSize: 11,
    fontWeight: "900",
    color: "rgba(220, 225, 251, 0.4)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 6,
  },
  codeBadgeActive: {
    color: ScoreBoardTheme.secondary,
    backgroundColor: "rgba(78, 222, 163, 0.15)",
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: ScoreBoardTheme.onSurface,
  },
  rowValue: {
    fontSize: 13,
    color: "rgba(220, 225, 251, 0.6)",
    fontWeight: "500",
  },
  rowDivider: {
    height: 1,
    backgroundColor: ScoreBoardTheme.borderGhost,
    marginHorizontal: 16,
  },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(147, 0, 10, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(255, 180, 171, 0.2)",
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
  },
  signOutText: {
    color: "#ffb4ab",
    fontSize: 14,
    fontWeight: "800",
  },
});
