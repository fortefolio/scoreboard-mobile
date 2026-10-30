import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { TopBar } from "@/components/TopBar";
import { AuthModal } from "@/components/AuthModal";
import { useAuth } from "@/components/AuthProvider";
import { useLanguage } from "@/lib/i18n";
import { Colors, Spacing } from "@/constants/theme";

export default function ProfileScreen() {
  const { t, locale, setLocale } = useLanguage();
  const { user, signOut } = useAuth();
  const [authModalVisible, setAuthModalVisible] = useState(false);

  const handleSignOut = () => {
    Alert.alert(
      t("nav.signOut") || "Terminar Sessão",
      "Tem a certeza de que pretende sair da sua conta?",
      [
        { text: t("common.cancel") || "Cancelar", style: "cancel" },
        { text: t("nav.signOut") || "Sair", style: "destructive", onPress: () => signOut() },
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
              {user ? user.email : "Utilizador Convidado"}
            </Text>
            <Text style={styles.userRole}>
              {user ? "Conta ScoreBoard Ativa" : "Modo Visitante"}
            </Text>
          </View>

          {!user && (
            <TouchableOpacity
              style={styles.loginCardBtn}
              onPress={() => setAuthModalVisible(true)}
            >
              <Text style={styles.loginCardBtnText}>{t("nav.signIn") || "Entrar"}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Section: Idioma / Language */}
        <Text style={styles.sectionHeader}>Idioma & Região</Text>
        <View style={styles.sectionCard}>
          <TouchableOpacity
            style={[styles.rowItem, locale === "pt" && styles.rowItemActive]}
            onPress={() => setLocale("pt")}
          >
            <View style={styles.rowLeft}>
              <Text style={styles.emoji}>🇵🇹</Text>
              <Text style={styles.rowLabel}>Português</Text>
            </View>
            {locale === "pt" && <Ionicons name="checkmark-circle" size={20} color="#4edea3" />}
          </TouchableOpacity>

          <View style={styles.rowDivider} />

          <TouchableOpacity
            style={[styles.rowItem, locale === "en" && styles.rowItemActive]}
            onPress={() => setLocale("en")}
          >
            <View style={styles.rowLeft}>
              <Text style={styles.emoji}>🇬🇧</Text>
              <Text style={styles.rowLabel}>English</Text>
            </View>
            {locale === "en" && <Ionicons name="checkmark-circle" size={20} color="#4edea3" />}
          </TouchableOpacity>
        </View>

        {/* Section: Sistema & Aplicação */}
        <Text style={styles.sectionHeader}>Aplicação & Sistema</Text>
        <View style={styles.sectionCard}>
          <View style={styles.rowItem}>
            <View style={styles.rowLeft}>
              <Ionicons name="moon-outline" size={20} color="#94a3b8" />
              <Text style={styles.rowLabel}>Tema Noturno</Text>
            </View>
            <Text style={styles.rowValue}>ScoreBoard Dark</Text>
          </View>

          <View style={styles.rowDivider} />

          <View style={styles.rowItem}>
            <View style={styles.rowLeft}>
              <Ionicons name="information-circle-outline" size={20} color="#94a3b8" />
              <Text style={styles.rowLabel}>Versão</Text>
            </View>
            <Text style={styles.rowValue}>1.0.0 (Phase 2)</Text>
          </View>
        </View>

        {/* Section: Terminar Sessão */}
        {user && (
          <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={20} color="#ef4444" />
            <Text style={styles.signOutText}>{t("nav.signOut") || "Terminar Sessão"}</Text>
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
    backgroundColor: "#0b0f19",
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#151b2d",
    borderWidth: 1,
    borderColor: "#232d4b",
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  avatarLarge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#4f46e5",
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
    fontSize: 16,
    fontWeight: "700",
    color: "#f8fafc",
  },
  userRole: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 3,
  },
  loginCardBtn: {
    backgroundColor: "#4f46e5",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  loginCardBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionCard: {
    backgroundColor: "#151b2d",
    borderWidth: 1,
    borderColor: "#232d4b",
    borderRadius: 16,
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
    backgroundColor: "rgba(79, 70, 229, 0.08)",
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  emoji: {
    fontSize: 20,
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#f8fafc",
  },
  rowValue: {
    fontSize: 13,
    color: "#94a3b8",
  },
  rowDivider: {
    height: 1,
    backgroundColor: "#1e293b",
    marginHorizontal: 16,
  },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    marginTop: 8,
  },
  signOutText: {
    color: "#ef4444",
    fontSize: 15,
    fontWeight: "700",
  },
});
