import React, { useState } from "react";
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
import { useLanguage, getSportTranslation } from "@/lib/i18n";
import { SportIcon } from "@/components/SportIcon";
import { supabase } from "@/lib/supabase/client";

export interface CreateTournamentModalProps {
  visible: boolean;
  onClose: () => void;
  onCreateSuccess: (tournamentId: string) => void;
  userId: string;
}

const SPORTS = [
  "Tennis",
  "Padel",
  "Volleyball",
  "Beach Volleyball",
  "Football",
  "Basketball",
];

const STAGE_TYPES: Array<{
  key: "bracket" | "groups" | "double_elimination";
  labelPt: string;
  labelEn: string;
  descPt: string;
  descEn: string;
}> = [
  {
    key: "bracket",
    labelPt: "Eliminatória",
    labelEn: "Single Elimination",
    descPt: "Quem perde é eliminado da prova",
    descEn: "Standard knockout bracket",
  },
  {
    key: "groups",
    labelPt: "Fase de Grupos",
    labelEn: "Group Stage",
    descPt: "Todos contra todos no grupo",
    descEn: "Round robin group matches",
  },
  {
    key: "double_elimination",
    labelPt: "Dupla Eliminatória",
    labelEn: "Double Elimination",
    descPt: "Quadro com repescagem de derrotados",
    descEn: "Winners & losers brackets",
  },
];

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

const PRESET_TEAMS = [4, 8, 16, 32];

export function CreateTournamentModal({
  visible,
  onClose,
  onCreateSuccess,
  userId,
}: CreateTournamentModalProps) {
  const { t, locale } = useLanguage();
  const isPt = locale === "pt";

  const [name, setName] = useState("");
  const [sport, setSport] = useState("Tennis");
  const [stage1Type, setStage1Type] = useState<"bracket" | "groups" | "double_elimination">("bracket");
  const [maxTeams, setMaxTeams] = useState<number | "">(16);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [visibility, setVisibility] = useState<"public" | "unlisted" | "private">("public");
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setName("");
    setSport("Tennis");
    setStage1Type("bracket");
    setMaxTeams(16);
    setStartDate("");
    setEndDate("");
    setVisibility("public");
    setSubmitting(false);
  };

  const handleClose = () => {
    if (!submitting) {
      resetForm();
      onClose();
    }
  };

  const handleSubmit = async () => {
    if (!userId) {
      Alert.alert(
        isPt ? "Autenticação Necessária" : "Authentication Required",
        isPt ? "Precisa de ter sessão iniciada." : "Please sign in to create an event."
      );
      return;
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert(
        isPt ? "Campo Obrigatório" : "Required Field",
        isPt ? "Por favor introduza o nome do torneio." : "Please enter a tournament name."
      );
      return;
    }

    const trimmedStart = startDate.trim();
    const trimmedEnd = endDate.trim();

    if (trimmedStart && isNaN(Date.parse(trimmedStart))) {
      Alert.alert(
        isPt ? "Data Inválida" : "Invalid Date",
        isPt
          ? "A data de início deve estar no formato AAAA-MM-DD."
          : "Start date must be in YYYY-MM-DD format."
      );
      return;
    }

    if (trimmedEnd && isNaN(Date.parse(trimmedEnd))) {
      Alert.alert(
        isPt ? "Data Inválida" : "Invalid Date",
        isPt
          ? "A data de fim deve estar no formato AAAA-MM-DD."
          : "End date must be in YYYY-MM-DD format."
      );
      return;
    }

    if (trimmedStart && trimmedEnd && new Date(trimmedStart) > new Date(trimmedEnd)) {
      Alert.alert(
        isPt ? "Data Inválida" : "Invalid Date",
        isPt
          ? "A data de início não pode ser posterior à data de fim."
          : "Tournament Start Date cannot be after the End Date."
      );
      return;
    }

    // Default sport-specific scoring settings (par with web)
    const defaultSettings: Record<string, any> = {};
    if (sport === "Tennis" || sport === "Volleyball" || sport === "Beach Volleyball" || sport === "Padel") {
      defaultSettings.max_sets = 3;
    }
    if (sport === "Padel") {
      defaultSettings.points_per_set = 6;
      defaultSettings.set_type = "tiebreak";
      defaultSettings.no_ad = true;
    }
    if (sport === "Volleyball") {
      defaultSettings.points_per_set = 25;
      defaultSettings.deciding_set_points = 15;
    }
    if (sport === "Beach Volleyball") {
      defaultSettings.points_per_set = 21;
      defaultSettings.deciding_set_points = 15;
    }
    if (sport === "Football") {
      defaultSettings.duration = 90;
      defaultSettings.format = "halves";
    }
    if (sport === "Basketball") {
      defaultSettings.quarter_minutes = 10;
      defaultSettings.shot_clock_seconds = 24;
    }

    const settings = {
      max_teams: typeof maxTeams === "number" ? maxTeams : 16,
      default: defaultSettings,
      stage_1: {
        type: stage1Type,
        ...(stage1Type === "groups" && {
          advance_per_group: 2,
          advance_best_thirds: 0,
        }),
      },
    };

    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("tournaments")
        .insert({
          name: trimmedName,
          sport_type: sport,
          organizer_id: userId,
          status: "pending",
          settings: settings,
          start_date: trimmedStart || null,
          end_date: trimmedEnd || null,
          visibility: visibility,
        })
        .select("id")
        .single();

      if (error) {
        throw error;
      }

      if (data?.id) {
        Alert.alert(
          isPt ? "Sucesso" : "Success",
          isPt ? "Torneio criado com sucesso!" : "Tournament created successfully!"
        );
        resetForm();
        onCreateSuccess(data.id);
      }
    } catch (err: any) {
      Alert.alert(
        isPt ? "Erro ao Criar Torneio" : "Error Creating Tournament",
        err?.message || (isPt ? "Ocorreu um erro inesperado." : "An unexpected error occurred.")
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.overlay}
      >
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.headerIconContainer}>
                <Ionicons name="trophy" size={20} color="#818cf8" />
              </View>
              <View>
                <Text style={styles.headerTitle}>
                  {isPt ? "Criar Novo Torneio" : "Create New Tournament"}
                </Text>
                <Text style={styles.headerSubtitle}>
                  {isPt ? "Configure a sua competição" : "Configure your competition"}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={handleClose}
              style={styles.closeBtn}
              testID="close-create-tournament-modal"
              disabled={submitting}
            >
              <Ionicons name="close" size={22} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Tournament Name */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>
                {isPt ? "Nome do Torneio *" : "Tournament Name *"}
              </Text>
              <TextInput
                style={styles.input}
                placeholder={isPt ? "Ex: Torneio de Padel Primavera 2026" : "e.g., Spring Padel Open 2026"}
                placeholderTextColor="#64748b"
                value={name}
                onChangeText={setName}
                autoFocus={true}
                editable={!submitting}
                testID="tournament-name-input"
              />
            </View>

            {/* Sport Selector */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>
                {isPt ? "Modalidade Desportiva" : "Sport"}
              </Text>
              <View style={styles.sportsGrid}>
                {SPORTS.map((s) => {
                  const isSelected = sport === s;
                  return (
                    <TouchableOpacity
                      key={s}
                      style={[styles.sportCard, isSelected && styles.sportCardActive]}
                      onPress={() => setSport(s)}
                      disabled={submitting}
                      testID={`sport-select-${s.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      <SportIcon sport={s} size={18} />
                      <Text
                        style={[styles.sportCardText, isSelected && styles.sportCardTextActive]}
                        numberOfLines={1}
                      >
                        {getSportTranslation(s, t)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Stage 1 Format */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>
                {isPt ? "Formato da 1ª Fase" : "1st Stage Format"}
              </Text>
              <View style={styles.stageOptionsColumn}>
                {STAGE_TYPES.map((st) => {
                  const isSelected = stage1Type === st.key;
                  return (
                    <TouchableOpacity
                      key={st.key}
                      style={[styles.stageCard, isSelected && styles.stageCardActive]}
                      onPress={() => setStage1Type(st.key)}
                      disabled={submitting}
                      testID={`stage-select-${st.key}`}
                    >
                      <View style={styles.stageCardHeader}>
                        <Ionicons
                          name={
                            st.key === "bracket"
                              ? "git-network-outline"
                              : st.key === "groups"
                              ? "grid-outline"
                              : "repeat-outline"
                          }
                          size={18}
                          color={isSelected ? "#818cf8" : "#94a3b8"}
                        />
                        <Text style={[styles.stageCardTitle, isSelected && styles.stageCardTitleActive]}>
                          {isPt ? st.labelPt : st.labelEn}
                        </Text>
                        <Ionicons
                          name={isSelected ? "radio-button-on" : "radio-button-off"}
                          size={18}
                          color={isSelected ? "#6366f1" : "#475569"}
                          style={{ marginLeft: "auto" }}
                        />
                      </View>
                      <Text style={styles.stageCardDesc}>
                        {isPt ? st.descPt : st.descEn}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Max Teams */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>
                {isPt ? "Número Máximo de Equipas" : "Max Teams"}
              </Text>
              <View style={styles.presetRow}>
                {PRESET_TEAMS.map((num) => {
                  const isSelected = maxTeams === num;
                  return (
                    <TouchableOpacity
                      key={num}
                      style={[styles.presetPill, isSelected && styles.presetPillActive]}
                      onPress={() => setMaxTeams(num)}
                      disabled={submitting}
                    >
                      <Text
                        style={[
                          styles.presetPillText,
                          isSelected && styles.presetPillTextActive,
                        ]}
                      >
                        {num}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Dates (Start & End) */}
            <View style={styles.datesRow}>
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
                  editable={!submitting}
                  testID="start-date-input"
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
                  editable={!submitting}
                  testID="end-date-input"
                />
              </View>
            </View>

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
                      disabled={submitting}
                      testID={`visibility-select-${v.key}`}
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
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={handleClose}
              disabled={submitting}
              testID="cancel-create-btn"
            >
              <Text style={styles.cancelBtnText}>
                {isPt ? "Cancelar" : "Cancel"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
              testID="submit-create-btn"
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={18} color="#ffffff" style={{ marginRight: 6 }} />
                  <Text style={styles.submitBtnText}>
                    {isPt ? "Criar Torneio" : "Create Tournament"}
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
  sportsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  sportCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
    gap: 8,
  },
  sportCardActive: {
    backgroundColor: "rgba(99, 102, 241, 0.2)",
    borderColor: "#6366f1",
  },
  sportCardText: {
    fontSize: 13,
    color: "#94a3b8",
    fontWeight: "500",
  },
  sportCardTextActive: {
    color: "#e0e7ff",
    fontWeight: "700",
  },
  stageOptionsColumn: {
    gap: 8,
  },
  stageCard: {
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 10,
    padding: 12,
  },
  stageCardActive: {
    backgroundColor: "rgba(99, 102, 241, 0.15)",
    borderColor: "#6366f1",
  },
  stageCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stageCardTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#cbd5e1",
  },
  stageCardTitleActive: {
    color: "#f8fafc",
  },
  stageCardDesc: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 4,
    marginLeft: 26,
  },
  presetRow: {
    flexDirection: "row",
    gap: 10,
  },
  presetPill: {
    flex: 1,
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  presetPillActive: {
    backgroundColor: "#4f46e5",
    borderColor: "#6366f1",
  },
  presetPillText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#94a3b8",
  },
  presetPillTextActive: {
    color: "#ffffff",
    fontWeight: "700",
  },
  datesRow: {
    flexDirection: "row",
    gap: 12,
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
  submitBtn: {
    flex: 1.6,
    backgroundColor: "#4f46e5",
    borderRadius: 10,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
});
