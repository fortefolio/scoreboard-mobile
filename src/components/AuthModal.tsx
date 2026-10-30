import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "./AuthProvider";
import { useLanguage } from "@/lib/i18n";
import { Colors, Spacing } from "@/constants/theme";

interface AuthModalProps {
  visible: boolean;
  onClose: () => void;
  initialMode?: "login" | "signup";
}

export function AuthModal({ visible, onClose, initialMode = "login" }: AuthModalProps) {
  const { t } = useLanguage();
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setErrorMsg(null);
    if (!email.trim() || !password.trim()) {
      setErrorMsg("Por favor preencha todos os campos.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await signIn(email.trim(), password);
        if (error) {
          setErrorMsg(error.message);
        } else {
          onClose();
        }
      } else {
        const { error } = await signUp(email.trim(), password, displayName.trim());
        if (error) {
          setErrorMsg(error.message);
        } else {
          onClose();
        }
      }
    } catch (e: any) {
      setErrorMsg(e.message || "Ocorreu um erro");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalContent}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.digitalTitle}>SCORE:BOARD</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.title}>
              {mode === "login" ? t("auth.signInTitle") || "Iniciar Sessão" : t("auth.signUpTitle") || "Criar Conta"}
            </Text>

            {/* Error Message */}
            {errorMsg ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color="#ef4444" />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            ) : null}

            {/* Form Fields */}
            {mode === "signup" && (
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>{t("auth.nameLabel") || "Nome"}</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Seu nome ou alcunha"
                  placeholderTextColor="#64748b"
                  value={displayName}
                  onChangeText={setDisplayName}
                  autoCapitalize="words"
                />
              </View>
            )}

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>{t("auth.emailLabel") || "Email"}</Text>
              <TextInput
                style={styles.input}
                placeholder="seu.email@exemplo.com"
                placeholderTextColor="#64748b"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>{t("auth.passwordLabel") || "Palavra-passe"}</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="#64748b"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.submitBtnText}>
                  {mode === "login"
                    ? t("nav.signIn") || "Entrar"
                    : t("nav.signUp") || "Registar"}
                </Text>
              )}
            </TouchableOpacity>

            {/* Toggle Mode Footer */}
            <TouchableOpacity
              style={styles.switchModeBtn}
              onPress={() => {
                setErrorMsg(null);
                setMode(mode === "login" ? "signup" : "login");
              }}
            >
              <Text style={styles.switchModeText}>
                {mode === "login"
                  ? `${t("auth.noAccount") || "Ainda não tem conta?"} `
                  : `${t("auth.hasAccount") || "Já tem conta?"} `}
                <Text style={styles.switchModeAccent}>
                  {mode === "login"
                    ? t("auth.signUpLink") || "Criar conta"
                    : t("auth.signInLink") || "Entrar"}
                </Text>
              </Text>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.four,
  },
  modalContent: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#151b2d",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#232d4b",
    padding: Spacing.four,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.two,
  },
  digitalTitle: {
    fontFamily: "Digital7",
    fontSize: 28,
    color: "#ffffff",
    letterSpacing: -0.5,
  },
  closeBtn: {
    padding: 6,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#f8fafc",
    marginBottom: Spacing.four,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderColor: "rgba(239, 68, 68, 0.3)",
    borderWidth: 1,
    padding: 12,
    borderRadius: 8,
    marginBottom: Spacing.three,
  },
  errorText: {
    color: "#ef4444",
    fontSize: 13,
    flex: 1,
  },
  fieldGroup: {
    marginBottom: Spacing.three,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94a3b8",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: "#0b0f19",
    borderWidth: 1,
    borderColor: "#232d4b",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#f8fafc",
    fontSize: 15,
  },
  submitBtn: {
    backgroundColor: "#4f46e5",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: Spacing.two,
  },
  submitBtnText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  switchModeBtn: {
    alignItems: "center",
    marginTop: Spacing.three,
    paddingVertical: 8,
  },
  switchModeText: {
    color: "#94a3b8",
    fontSize: 13,
  },
  switchModeAccent: {
    color: "#4f46e5",
    fontWeight: "700",
  },
});
