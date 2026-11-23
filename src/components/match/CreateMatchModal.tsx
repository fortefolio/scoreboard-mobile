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
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLanguage, getSportTranslation } from "@/lib/i18n";
import { SportIcon } from "@/components/SportIcon";
import { ScoreBoardTheme } from "@/constants/theme";
import { supabase } from "@/lib/supabase/client";
import { DropdownSelect } from "@/components/common/DropdownSelect";
import { FeedbackModal } from "@/components/common/FeedbackModal";

export interface CreateMatchModalProps {
  visible: boolean;
  onClose: () => void;
  onCreateSuccess: (matchId?: string) => void;
  userId: string;
}

import { SUPPORTED_SPORT_VALUES } from "@/lib/sports";

const SPORTS = SUPPORTED_SPORT_VALUES;

export function CreateMatchModal({
  visible,
  onClose,
  onCreateSuccess,
  userId,
}: CreateMatchModalProps) {
  const { t, locale } = useLanguage();
  const isPt = locale === "pt";

  const [team1, setTeam1] = useState("");
  const [team2, setTeam2] = useState("");
  const [sport, setSport] = useState("Tennis");
  const [matchDate, setMatchDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [createdMatchId, setCreatedMatchId] = useState<string | null>(null);

  const resetForm = () => {
    setTeam1("");
    setTeam2("");
    setSport("Tennis");
    setMatchDate("");
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
        isPt ? "Precisa de ter sessão iniciada." : "Please sign in to create a match."
      );
      return;
    }

    const trimmedTeam1 = team1.trim();
    const trimmedTeam2 = team2.trim();

    if (!trimmedTeam1 || !trimmedTeam2) {
      Alert.alert(
        isPt ? "Campos Obrigatórios" : "Required Fields",
        isPt
          ? "Por favor introduza o nome de ambas as equipas/jogadores."
          : "Please enter both team/player names."
      );
      return;
    }

    let finalDate = new Date().toISOString();
    const trimmedDate = matchDate.trim();
    if (trimmedDate) {
      const parsedDate = new Date(trimmedDate);
      if (isNaN(parsedDate.getTime())) {
        Alert.alert(
          isPt ? "Data Inválida" : "Invalid Date",
          isPt
            ? "Formato de data inválido. Use AAAA-MM-DD ou AAAA-MM-DD HH:mm."
            : "Invalid date format. Use YYYY-MM-DD or YYYY-MM-DD HH:mm."
        );
        return;
      }
      finalDate = parsedDate.toISOString();
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("matches")
        .insert({
          organizer_id: userId,
          sport_type: sport,
          participants: [{ name: trimmedTeam1 }, { name: trimmedTeam2 }],
          tournament_id: null,
          status: "scheduled",
          scheduled_at: finalDate,
        })
        .select()
        .single();

      if (error) throw error;

      if (data?.id) {
        setCreatedMatchId(data.id);
        setFeedbackModalVisible(true);
      }
    } catch (err: any) {
      Alert.alert(
        isPt ? "Erro ao Criar Jogo" : "Error Creating Match",
        err?.message || (isPt ? "Ocorreu um erro inesperado." : "An unexpected error occurred.")
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        transparent={true}
        onRequestClose={handleClose}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.overlay}
        >
          <View style={styles.modalContainer}>
            {/* Header */}
            <TouchableOpacity
              activeOpacity={1}
              onPress={Keyboard.dismiss}
              style={styles.header}
            >
              <View style={styles.headerTitleRow}>
                <View style={styles.headerIconContainer}>
                  <Ionicons name="tennisball" size={20} color={ScoreBoardTheme.onSurfaceVariant} />
                </View>
                <View>
                  <Text style={styles.headerTitle}>
                    {isPt ? "Criar Novo Jogo" : "Create New Match"}
                  </Text>
                  <Text style={styles.headerSubtitle}>
                    {isPt ? "Agende um jogo individual" : "Schedule a standalone match"}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={handleClose}
                style={styles.closeBtn}
                testID="close-create-match-modal"
                disabled={submitting}
              >
                <Ionicons name="close" size={22} color="#94a3b8" />
              </TouchableOpacity>
            </TouchableOpacity>

            <ScrollView
              style={styles.body}
              contentContainerStyle={styles.bodyContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Team 1 & Team 2 */}
              <View style={styles.teamsRow}>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.label}>
                    {isPt ? "Equipa / Jogador 1 *" : "Team / Player 1 *"}
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder={isPt ? "Ex: Equipa Alfa" : "e.g., Team Alpha"}
                    placeholderTextColor="#64748b"
                    value={team1}
                    onChangeText={setTeam1}
                    autoFocus={true}
                    editable={!submitting}
                    returnKeyType="done"
                    onSubmitEditing={Keyboard.dismiss}
                    testID="match-team1-input"
                  />
                </View>

                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.label}>
                    {isPt ? "Equipa / Jogador 2 *" : "Team / Player 2 *"}
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder={isPt ? "Ex: Equipa Beta" : "e.g., Team Beta"}
                    placeholderTextColor="#64748b"
                    value={team2}
                    onChangeText={setTeam2}
                    editable={!submitting}
                    returnKeyType="done"
                    onSubmitEditing={Keyboard.dismiss}
                    testID="match-team2-input"
                  />
                </View>
              </View>

              {/* Sport Selector Dropdown */}
              <DropdownSelect
                label={isPt ? "Modalidade Desportiva" : "Sport"}
                value={sport}
                options={SPORTS.map((s) => ({
                  value: s,
                  label: getSportTranslation(s, t),
                  icon: <SportIcon sport={s} size={18} />,
                  testID: `match-sport-select-${s.toLowerCase().replace(/\s+/g, "-")}`,
                }))}
                onSelect={setSport}
                testID="match-sport-dropdown"
                disabled={submitting}
              />

            {/* Scheduled Date */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>
                {isPt ? "Data e Hora Agendada" : "Scheduled Date & Time"}
              </Text>
              <TextInput
                style={styles.input}
                placeholder={isPt ? "AAAA-MM-DD HH:mm (opcional)" : "YYYY-MM-DD HH:mm (optional)"}
                placeholderTextColor="#64748b"
                value={matchDate}
                onChangeText={setMatchDate}
                editable={!submitting}
                testID="match-date-input"
              />
              <Text style={styles.fieldHelper}>
                {isPt
                  ? "Se deixar em branco, o jogo será agendado para o momento atual."
                  : "If left blank, match will be scheduled for the current moment."}
              </Text>
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={handleClose}
              disabled={submitting}
              testID="cancel-create-match-btn"
            >
              <Text style={styles.cancelBtnText}>
                {isPt ? "Cancelar" : "Cancel"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
              testID="submit-create-match-btn"
            >
              {submitting ? (
                <ActivityIndicator size="small" color={ScoreBoardTheme.surfaceContainerLowest} />
              ) : (
                <>
                  <Ionicons
                    name="checkmark"
                    size={18}
                    color={ScoreBoardTheme.surfaceContainerLowest}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.submitBtnText}>
                    {isPt ? "Criar Jogo" : "Create Match"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      <FeedbackModal
        inline
        visible={feedbackModalVisible}
        type="success"
        title={isPt ? "Sucesso" : "Success"}
        message={isPt ? "Jogo criado com sucesso!" : "Match created successfully!"}
        confirmText="OK"
        testID="success-modal-confirm-btn"
        onConfirm={() => {
          setFeedbackModalVisible(false);
          const id = createdMatchId;
          resetForm();
          onCreateSuccess(id || undefined);
        }}
      />
    </Modal>
  </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: ScoreBoardTheme.surfaceContainer,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    maxHeight: "90%",
    paddingTop: 16,
    paddingBottom: Platform.OS === "ios" ? 36 : 44,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: ScoreBoardTheme.borderSubtle,
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
    backgroundColor: ScoreBoardTheme.surfaceContainerHighest,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: ScoreBoardTheme.onSurface,
  },
  headerSubtitle: {
    fontSize: 12,
    color: ScoreBoardTheme.onSurfaceVariant,
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
  teamsRow: {
    flexDirection: "row",
    gap: 12,
  },
  fieldGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: ScoreBoardTheme.onSurfaceVariant,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: ScoreBoardTheme.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: ScoreBoardTheme.onSurface,
    fontSize: 14,
  },
  fieldHelper: {
    fontSize: 11,
    color: ScoreBoardTheme.textMuted,
    marginTop: 6,
  },
  sportsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  sportCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: ScoreBoardTheme.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
    gap: 8,
  },
  sportCardActive: {
    backgroundColor: ScoreBoardTheme.surfaceContainerHighest,
    borderColor: ScoreBoardTheme.onSurfaceVariant,
  },
  sportCardText: {
    fontSize: 13,
    color: ScoreBoardTheme.onSurfaceVariant,
    fontWeight: "500",
  },
  sportCardTextActive: {
    color: ScoreBoardTheme.onSurface,
    fontWeight: "700",
  },
  footer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: ScoreBoardTheme.borderSubtle,
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: ScoreBoardTheme.surfaceContainerHighest,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: {
    color: ScoreBoardTheme.onSurfaceVariant,
    fontSize: 14,
    fontWeight: "600",
  },
  submitBtn: {
    flex: 1.6,
    backgroundColor: ScoreBoardTheme.onSurface,
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
    color: ScoreBoardTheme.surfaceContainerLowest,
    fontSize: 14,
    fontWeight: "700",
  },
});
