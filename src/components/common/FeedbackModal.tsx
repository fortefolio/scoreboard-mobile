import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ScoreBoardTheme } from "@/constants/theme";

export interface FeedbackModalProps {
  visible: boolean;
  type?: "success" | "error" | "info";
  title: string;
  message: string;
  confirmText?: string;
  onConfirm: () => void;
  testID?: string;
  /** Render as an inline overlay View instead of a native Modal (avoids iOS nested-Modal presentation failures). */
  inline?: boolean;
}

export function FeedbackModal({
  visible,
  type = "success",
  title,
  message,
  confirmText = "OK",
  onConfirm,
  testID = "feedback-modal-confirm-btn",
  inline = false,
}: FeedbackModalProps) {
  const isSuccess = type === "success";
  const isError = type === "error";

  const iconName = isSuccess
    ? "checkmark-circle"
    : isError
    ? "alert-circle"
    : "information-circle";

  const iconColor = isSuccess ? "#22c55e" : isError ? "#ef4444" : ScoreBoardTheme.onSurface;
  const iconBg = isSuccess
    ? "rgba(34, 197, 94, 0.15)"
    : isError
    ? "rgba(239, 68, 68, 0.15)"
    : ScoreBoardTheme.surfaceContainerHighest;

  const content = (
    <View style={styles.overlay}>
      <View style={styles.dialogCard}>
        <View style={[styles.iconWrapper, { backgroundColor: iconBg }]}>
          <Ionicons name={iconName} size={36} color={iconColor} />
        </View>

        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>

        <TouchableOpacity
          style={styles.confirmBtn}
          onPress={onConfirm}
          activeOpacity={0.8}
          testID={testID}
        >
          <Text style={styles.confirmBtnText}>{confirmText}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (inline) {
    if (!visible) return null;
    return <View style={styles.inlineHost}>{content}</View>;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onConfirm}
    >
      {content}
    </Modal>
  );
}

const styles = StyleSheet.create({
  inlineHost: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 50,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  dialogCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: ScoreBoardTheme.surfaceContainer,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: ScoreBoardTheme.onSurface,
    marginBottom: 8,
    textAlign: "center",
  },
  message: {
    fontSize: 14,
    color: ScoreBoardTheme.onSurfaceVariant,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  confirmBtn: {
    width: "100%",
    height: 48,
    backgroundColor: ScoreBoardTheme.onSurface,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: ScoreBoardTheme.surfaceContainerLowest,
  },
});
