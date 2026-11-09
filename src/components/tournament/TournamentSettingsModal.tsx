import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLanguage } from "@/lib/i18n";
import { supabase } from "@/lib/supabase/client";

export interface TournamentSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  tournament: any;
  onUpdateSuccess: () => void;
  onDeleteSuccess: () => void;
}

const VISIBILITY_OPTIONS: Array<{
  key: "public" | "unlisted" | "private";
  labelPt: string;
  labelEn: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { key: "public", labelPt: "Público", labelEn: "Public", icon: "globe-outline" },
  { key: "unlisted", labelPt: "Não Listado", labelEn: "Unlisted", icon: "link-outline" },
  { key: "private", labelPt: "Privado", labelEn: "Private", icon: "lock-closed-outline" },
];

export function TournamentSettingsModal({
  visible,
  onClose,
  tournament,
  onUpdateSuccess,
  onDeleteSuccess,
}: TournamentSettingsModalProps) {
  const { locale } = useLanguage();
  const isPt = locale === "pt";

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [visibility, setVisibility] = useState<"public" | "unlisted" | "private">("public");
  const [maxTeams, setMaxTeams] = useState<string>("16");
  const [courts, setCourts] = useState<string>("1");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (tournament) {
      if (tournament.start_date) {
        setStartDate(new Date(tournament.start_date).toISOString().split("T")[0]);
      } else {
        setStartDate("");
      }

      if (tournament.end_date) {
        setEndDate(new Date(tournament.end_date).toISOString().split("T")[0]);
      } else {
        setEndDate("");
      }

      if (tournament.visibility) {
        setVisibility(tournament.visibility);
      }

      if (tournament.settings?.max_teams) {
        setMaxTeams(String(tournament.settings.max_teams));
      }

      if (tournament.settings?.number_of_courts) {
        setCourts(String(tournament.settings.number_of_courts));
      }
    }
  }, [tournament, visible]);

  const handleSave = async () => {
    const trimmedStart = startDate.trim();
    const trimmedEnd = endDate.trim();

    if (trimmedStart && isNaN(Date.parse(trimmedStart))) {
      Alert.alert(
        isPt ? "Data Inválida" : "Invalid Date",
        isPt ? "Data de início inválida (use AAAA-MM-DD)." : "Invalid start date (use YYYY-MM-DD)."
      );
      return;
    }

    if (trimmedEnd && isNaN(Date.parse(trimmedEnd))) {
      Alert.alert(
        isPt ? "Data Inválida" : "Invalid Date",
        isPt ? "Data de fim inválida (use AAAA-MM-DD)." : "Invalid end date (use YYYY-MM-DD)."
      );
      return;
    }

    if (trimmedStart && trimmedEnd && new Date(trimmedStart) > new Date(trimmedEnd)) {
      Alert.alert(
        isPt ? "Data Inválida" : "Invalid Date",
        isPt ? "Data de início não pode ser posterior à de fim." : "Start date cannot be after end date."
      );
      return;
    }

    setSaving(true);
    try {
      const parsedMaxTeams = parseInt(maxTeams, 10) || 16;
      const parsedCourts = parseInt(courts, 10) || 1;

      const newSettings = {
        ...(tournament.settings || {}),
        max_teams: parsedMaxTeams,
        number_of_courts: parsedCourts,
      };

      const { error } = await supabase
        .from("tournaments")
        .update({
          settings: newSettings,
          start_date: trimmedStart || null,
          end_date: trimmedEnd || null,
          visibility: visibility,
        })
        .eq("id", tournament.id);

      if (error) throw error;

      Alert.alert(
        isPt ? "Sucesso" : "Success",
        isPt ? "Definições do torneio atualizadas." : "Tournament settings updated."
      );
      onUpdateSuccess();
      onClose();
    } catch (err: any) {
      Alert.alert(
        isPt ? "Erro ao Guardar" : "Error Saving",
        err?.message || (isPt ? "Erro ao atualizar definições." : "Failed to update settings.")
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      isPt ? "Eliminar Torneio" : "Delete Tournament",
      isPt
        ? "Tem a certeza que deseja eliminar este torneio? Esta ação é irreversível."
        : "Are you sure you want to delete this tournament? This action cannot be undone.",
      [
        { text: isPt ? "Cancelar" : "Cancel", style: "cancel" },
        {
          text: isPt ? "Eliminar" : "Delete",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              const { error } = await supabase
                .from("tournaments")
                .delete()
                .eq("id", tournament.id);

              if (error) throw error;

              Alert.alert(
                isPt ? "Sucesso" : "Success",
                isPt ? "Torneio eliminado com sucesso." : "Tournament deleted successfully."
              );
              onDeleteSuccess();
            } catch (err: any) {
              Alert.alert(
                isPt ? "Erro ao Eliminar" : "Error Deleting",
                err?.message || (isPt ? "Erro ao eliminar torneio." : "Failed to delete tournament.")
              );
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.overlay}
      >
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.headerIconContainer}>
                <Ionicons name="settings" size={20} color="#818cf8" />
              </View>
              <View>
                <Text style={styles.headerTitle}>
                  {isPt ? "Definições do Torneio" : "Tournament Settings"}
                </Text>
                <Text style={styles.headerSubtitle}>
                  {isPt ? "Gestão e configuração geral" : "Management & configuration"}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              testID="close-tournament-settings-modal"
              disabled={saving || deleting}
            >
              <Ionicons name="close" size={22} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Visibility */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>
                {isPt ? "Visibilidade" : "Visibility"}
              </Text>
              <View style={styles.visibilityRow}>
                {VISIBILITY_OPTIONS.map((v) => {
                  const isSelected = visibility === v.key;
                  return (
                    <TouchableOpacity
                      key={v.key}
                      style={[styles.visibilityPill, isSelected && styles.visibilityPillActive]}
                      onPress={() => setVisibility(v.key)}
                      disabled={saving || deleting}
                      testID={`settings-visibility-${v.key}`}
                    >
                      <Ionicons
                        name={v.icon}
                        size={15}
                        color={isSelected ? "#ffffff" : "#94a3b8"}
                        style={{ marginRight: 6 }}
                      />
                      <Text
                        style={[
                          styles.visibilityPillText,
                          isSelected && styles.visibilityPillTextActive,
                        ]}
                      >
                        {isPt ? v.labelPt : v.labelEn}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Dates */}
            <View style={styles.row}>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={styles.label}>
                  {isPt ? "Data de Início" : "Start Date"}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#64748b"
                  value={startDate}
                  onChangeText={setStartDate}
                  editable={!saving && !deleting}
                  testID="settings-start-date-input"
                />
              </View>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={styles.label}>
                  {isPt ? "Data de Fim" : "End Date"}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#64748b"
                  value={endDate}
                  onChangeText={setEndDate}
                  editable={!saving && !deleting}
                  testID="settings-end-date-input"
                />
              </View>
            </View>

            {/* Limits: Max Teams & Courts */}
            <View style={styles.row}>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={styles.label}>
                  {isPt ? "Lotação Máx. (Equipas)" : "Max Teams"}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="16"
                  placeholderTextColor="#64748b"
                  value={maxTeams}
                  onChangeText={setMaxTeams}
                  keyboardType="numeric"
                  editable={!saving && !deleting}
                  testID="settings-max-teams-input"
                />
              </View>

              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={styles.label}>
                  {isPt ? "Nº de Campos / Courts" : "Courts"}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="1"
                  placeholderTextColor="#64748b"
                  value={courts}
                  onChangeText={setCourts}
                  keyboardType="numeric"
                  editable={!saving && !deleting}
                  testID="settings-courts-input"
                />
              </View>
            </View>

            {/* Danger Zone */}
            <View style={styles.dangerZone}>
              <Text style={styles.dangerTitle}>
                {isPt ? "Zona de Perigo" : "Danger Zone"}
              </Text>
              <Text style={styles.dangerDesc}>
                {isPt
                  ? "A eliminação do torneio é definitiva e removerá todos os jogos e registos."
                  : "Deleting this tournament is permanent and removes all associated matches and records."}
              </Text>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={handleDelete}
                disabled={saving || deleting}
                testID="settings-delete-tournament-btn"
              >
                {deleting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="trash-outline" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                    <Text style={styles.deleteBtnText}>
                      {isPt ? "Eliminar Torneio" : "Delete Tournament"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              disabled={saving || deleting}
              testID="settings-cancel-btn"
            >
              <Text style={styles.cancelBtnText}>
                {isPt ? "Fechar" : "Close"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={saving || deleting}
              testID="settings-save-btn"
            >
              {saving ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={18} color="#ffffff" style={{ marginRight: 6 }} />
                  <Text style={styles.saveBtnText}>
                    {isPt ? "Guardar Alterações" : "Save Changes"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#0f172a",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: "#1e293b",
    maxHeight: "90%",
    paddingTop: 16,
    paddingBottom: Platform.OS === "ios" ? 36 : 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "rgba(99, 102, 241, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#f8fafc",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
  },
  body: {
    maxHeight: 520,
  },
  bodyContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  fieldGroup: {
    marginBottom: 18,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#cbd5e1",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#f8fafc",
    fontSize: 14,
  },
  visibilityRow: {
    flexDirection: "row",
    gap: 8,
  },
  visibilityPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  visibilityPillActive: {
    backgroundColor: "#4f46e5",
    borderColor: "#6366f1",
  },
  visibilityPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94a3b8",
  },
  visibilityPillTextActive: {
    color: "#ffffff",
    fontWeight: "700",
  },
  dangerZone: {
    backgroundColor: "rgba(239, 68, 68, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    borderRadius: 14,
    padding: 16,
    marginTop: 10,
    marginBottom: 10,
  },
  dangerTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#ef4444",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  dangerDesc: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 4,
    marginBottom: 12,
    lineHeight: 16,
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#dc2626",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  deleteBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  footer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#1e293b",
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: "#1e293b",
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: {
    color: "#cbd5e1",
    fontSize: 14,
    fontWeight: "600",
  },
  saveBtn: {
    flex: 1.6,
    backgroundColor: "#4f46e5",
    borderRadius: 10,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
});
