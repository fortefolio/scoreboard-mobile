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
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "./AuthProvider";
import { useLanguage } from "@/lib/i18n";
import { validatePassword } from "@/lib/auth/passwordValidation";
import { Colors, Spacing } from "@/constants/theme";

interface AuthModalProps {
  visible: boolean;
  onClose: () => void;
  initialMode?: "login" | "signup" | "forgot";
}

export function AuthModal({ visible, onClose, initialMode = "login" }: AuthModalProps) {
  const { t } = useLanguage();
  const { signIn, signUp, resetPasswordForEmail } = useAuth();
  const [mode, setMode] = useState<"login" | "signup" | "forgot">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  // Reset success state when modal visibility or initialMode changes
  React.useEffect(() => {
    if (visible) {
      setMode(initialMode);
      setErrorMsg(null);
      setSignupSuccess(false);
      setResetEmailSent(false);
    }
  }, [visible, initialMode]);

  const handleSubmit = async () => {
    setErrorMsg(null);

    if (mode === "forgot") {
      if (!email.trim()) {
        setErrorMsg(t("auth.fillAllFields"));
        return;
      }
      setLoading(true);
      try {
        const { error } = await resetPasswordForEmail(email.trim());
        if (error) {
          setErrorMsg(error.message);
        } else {
          setResetEmailSent(true);
        }
      } catch (e: any) {
        setErrorMsg(e.message || t("common.error"));
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!email.trim() || !password.trim()) {
      setErrorMsg(t("auth.fillAllFields"));
      return;
    }

    if (mode === "signup") {
      const validation = validatePassword(password);
      if (!validation.isValid) {
        setErrorMsg(t("auth.passwordRequirements"));
        return;
      }
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
          setSignupSuccess(true);
        }
      }
    } catch (e: any) {
      setErrorMsg(e.message || t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.modalContent}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.digitalTitle}>SCORE:BOARD</Text>
              <TouchableOpacity testID="auth-close-btn" onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.scrollContent}
            >

            {signupSuccess ? (
              <View style={styles.successContainer}>
                <View style={styles.successIconCircle}>
                  <Ionicons name="mail-unread-outline" size={44} color="#22c55e" />
                </View>
                <Text style={styles.successTitle}>{t("auth.checkEmailTitle")}</Text>
                <Text style={styles.successMessage}>
                  {t("auth.checkEmailMessage").replace("{email}", email.trim())}
                </Text>
                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={() => {
                    setSignupSuccess(false);
                    onClose();
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.submitBtnText}>{t("auth.gotIt")}</Text>
                </TouchableOpacity>
              </View>
            ) : resetEmailSent ? (
              <View style={styles.successContainer}>
                <View style={styles.successIconCircle}>
                  <Ionicons name="mail-unread-outline" size={44} color="#22c55e" />
                </View>
                <Text style={styles.successTitle}>{t("auth.resetEmailSentTitle")}</Text>
                <Text style={styles.successMessage}>
                  {t("auth.resetEmailSentMessage")}
                </Text>
                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={() => {
                    setResetEmailSent(false);
                    setMode("login");
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.submitBtnText}>{t("auth.backToSignIn")}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={styles.title}>
                  {mode === "login"
                    ? t("auth.welcomeBack")
                    : mode === "forgot"
                    ? t("auth.forgotPasswordTitle")
                    : t("auth.createAccount")}
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
                    <Text style={styles.label}>{t("auth.name")}</Text>
                    <TextInput
                      style={styles.input}
                      placeholder={t("auth.namePlaceholder")}
                      placeholderTextColor="#64748b"
                      value={displayName}
                      onChangeText={setDisplayName}
                      autoCapitalize="words"
                    />
                  </View>
                )}

                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>{t("auth.email")}</Text>
                  <TextInput
                    testID="auth-email-input"
                    style={styles.input}
                    placeholder={t("auth.emailPlaceholder")}
                    placeholderTextColor="#64748b"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                {mode !== "forgot" && (
                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>{t("auth.password")}</Text>
                    <TextInput
                      testID="auth-password-input"
                      style={styles.input}
                      placeholder={t("auth.passwordPlaceholder")}
                      placeholderTextColor="#64748b"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                      returnKeyType="done"
                      onSubmitEditing={handleSubmit}
                    />
                    {mode === "login" && (
                      <TouchableOpacity
                        testID="auth-forgot-password-btn"
                        onPress={() => {
                          setErrorMsg(null);
                          setMode("forgot");
                        }}
                        style={{ alignSelf: "flex-end", marginTop: 6 }}
                      >
                        <Text style={{ color: "#4edea3", fontSize: 12, fontWeight: "600" }}>
                          {t("auth.forgotPassword")}
                        </Text>
                      </TouchableOpacity>
                    )}
                    {mode === "signup" && (
                      <Text style={styles.helpText}>
                        {t("auth.passwordRequirements")}
                      </Text>
                    )}
                  </View>
                )}

                {/* Submit Button */}
                <TouchableOpacity
                  testID="auth-submit-btn"
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
                        ? t("auth.signInBtn")
                        : mode === "forgot"
                        ? t("auth.sendResetLink")
                        : t("auth.signUpBtn")}
                    </Text>
                  )}
                </TouchableOpacity>

                {/* Toggle Mode Footer */}
                {mode === "forgot" ? (
                  <TouchableOpacity
                    testID="auth-switch-mode-btn"
                    style={styles.switchModeBtn}
                    onPress={() => {
                      setErrorMsg(null);
                      setMode("login");
                    }}
                  >
                    <Text style={styles.switchModeAccent}>
                      {t("auth.backToSignIn")}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    testID="auth-switch-mode-btn"
                    style={styles.switchModeBtn}
                    onPress={() => {
                      setErrorMsg(null);
                      setMode(mode === "login" ? "signup" : "login");
                    }}
                  >
                    <Text style={styles.switchModeText}>
                      {mode === "login"
                        ? `${t("auth.dontHaveAccount")} `
                        : `${t("auth.alreadyHaveAccount")} `}
                      <Text style={styles.switchModeAccent}>
                        {mode === "login" ? t("auth.signUpBtn") : t("auth.signInBtn")}
                      </Text>
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}
            </ScrollView>
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
    maxHeight: "85%",
  },
  scrollContent: {
    flexGrow: 1,
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
    backgroundColor: "#0c1324",
    borderWidth: 1,
    borderColor: "#232d4b",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#f8fafc",
    fontSize: 15,
  },
  helpText: {
    fontSize: 11,
    color: "#94a3b8",
    marginTop: 6,
    lineHeight: 15,
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
  successContainer: {
    alignItems: "center",
    paddingVertical: Spacing.four,
  },
  successIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(34, 197, 94, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.three,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#f8fafc",
    marginBottom: Spacing.two,
    textAlign: "center",
  },
  successMessage: {
    fontSize: 14,
    color: "#94a3b8",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: Spacing.four,
    paddingHorizontal: Spacing.two,
  },
});
