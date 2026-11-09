import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export interface FeedbackModalProps {
  visible: boolean;
  type?: "success" | "error" | "info";
  title: string;
  message: string;
  confirmText?: string;
  onConfirm: () => void;
  testID?: string;
}

export function FeedbackModal({
  visible,
  type = "success",
  title,
  message,
  confirmText = "OK",
  onConfirm,
  testID = "feedback-modal-confirm-btn",
}: FeedbackModalProps) {
  const isSuccess = type === "success";
  const isError = type === "error";

  const iconName = isSuccess
    ? "checkmark-circle"
    : isError
    ? "alert-circle"
    : "information-circle";

  const iconColor = isSuccess ? "#22c55e" : isError ? "#ef4444" : "#6366f1";
  const iconBg = isSuccess
    ? "rgba(34, 197, 94, 0.15)"
    : isError
    ? "rgba(239, 68, 68, 0.15)"
    : "rgba(99, 102, 241, 0.15)";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onConfirm}
    >
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
    </Modal>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: "#0f172a",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1e293b",
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
    color: "#f8fafc",
    marginBottom: 8,
    textAlign: "center",
  },
  message: {
    fontSize: 14,
    color: "#94a3b8",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  confirmBtn: {
    width: "100%",
    height: 48,
    backgroundColor: "#4f46e5",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#ffffff",
  },
});
