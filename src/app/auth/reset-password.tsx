import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { validatePassword } from "@/lib/auth/passwordValidation";
import { Spacing } from "@/constants/theme";

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { t, locale } = useLanguage();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleUpdate = async () => {
    setErrorMsg(null);

    const validation = validatePassword(newPassword);
    if (!validation.isValid) {
      setErrorMsg(t("auth.passwordRequirements"));
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg(t("auth.passwordsDoNotMatch"));
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) {
        setErrorMsg(error.message);
      } else {
        Alert.alert(
          locale === "pt" ? "Sucesso" : "Success",
          t("auth.passwordResetSuccess"),
          [
            {
              text: "OK",
              onPress: () => router.replace("/(tabs)"),
            },
          ]
        );
      }
    } catch (err: any) {
      setErrorMsg(err?.message || (locale === "pt" ? "Erro ao atualizar palavra-passe." : "Error updating password."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <View style={styles.header}>
              <Text style={styles.digitalTitle}>SCORE:BOARD</Text>
            </View>

            <Text style={styles.title}>{t("auth.resetPassword")}</Text>
            <Text style={styles.subtitle}>
              {locale === "pt"
                ? "Introduz a tua nova palavra-passe de acesso."
                : "Enter your new account password below."}
            </Text>

            {errorMsg ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color="#ef4444" />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            ) : null}

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>{t("auth.newPassword")}</Text>
              <TextInput
                testID="reset-new-password-input"
                style={styles.input}
                placeholder={t("auth.newPasswordPlaceholder")}
                placeholderTextColor="#64748b"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
              />
              <Text style={styles.helpText}>{t("auth.passwordRequirements")}</Text>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>{t("auth.confirmPassword")}</Text>
              <TextInput
                testID="reset-confirm-password-input"
                style={styles.input}
                placeholder={t("auth.confirmPasswordPlaceholder")}
                placeholderTextColor="#64748b"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                returnKeyType="done"
                onSubmitEditing={handleUpdate}
              />
            </View>

            <TouchableOpacity
              testID="reset-submit-btn"
              style={styles.submitBtn}
              onPress={handleUpdate}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.submitBtnText}>{t("auth.updatePasswordBtn")}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => router.replace("/(tabs)")}
            >
              <Text style={styles.backBtnText}>{t("auth.backToSignIn")}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#080c14",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.four,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#151b2d",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  header: {
    alignItems: "center",
    marginBottom: 16,
  },
  digitalTitle: {
    fontFamily: "Digital7",
    fontSize: 28,
    color: "#4edea3",
    letterSpacing: 2,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#f8fafc",
    textAlign: "center",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: "#94a3b8",
    textAlign: "center",
    marginBottom: 20,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    borderRadius: 12,
    padding: 10,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    color: "#ef4444",
    fontSize: 12,
    flex: 1,
    fontWeight: "500",
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#94a3b8",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: "#0b101e",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#f8fafc",
  },
  helpText: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 4,
    lineHeight: 15,
  },
  submitBtn: {
    backgroundColor: "#22c55e",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  submitBtnText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  backBtn: {
    marginTop: 16,
    alignItems: "center",
  },
  backBtnText: {
    color: "#4edea3",
    fontSize: 13,
    fontWeight: "600",
  },
});
