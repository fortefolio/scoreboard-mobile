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
import { useLanguage, getSportTranslation } from "@/lib/i18n";
import { SportIcon } from "@/components/SportIcon";
import { supabase } from "@/lib/supabase/client";

export interface CreateMatchModalProps {
  visible: boolean;
  onClose: () => void;
  onCreateSuccess: (matchId?: string) => void;
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
  const [userTournaments, setUserTournaments] = useState<any[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>("");
  const [matchDate, setMatchDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loadingTournaments, setLoadingTournaments] = useState(false);

  useEffect(() => {
    if (visible && userId) {
      loadUserTournaments();
    }
  }, [visible, userId]);

  const loadUserTournaments = async () => {
    try {
      setLoadingTournaments(true);
      const { data, error } = await supabase
        .from("tournaments")
        .select("id, name")
        .eq("organizer_id", userId)
        .order("name", { ascending: true });

      if (!error && data) {
        setUserTournaments(data);
      }
    } catch (e) {
      console.warn("Failed to load tournaments for match creation:", e);
    } finally {
      setLoadingTournaments(false);
    }
  };

  const resetForm = () => {
    setTeam1("");
    setTeam2("");
    setSport("Tennis");
    setSelectedTournamentId("");
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
          tournament_id: selectedTournamentId || null,
          status: "scheduled",
          scheduled_at: finalDate,
        })
        .select()
        .single();

      if (error) throw error;

      Alert.alert(
        isPt ? "Sucesso" : "Success",
        isPt ? "Jogo criado com sucesso!" : "Match created successfully!"
      );
      resetForm();
      onCreateSuccess(data?.id);
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
                <Ionicons name="tennisball" size={20} color="#818cf8" />
              </View>
              <View>
                <Text style={styles.headerTitle}>
                  {isPt ? "Criar Novo Jogo" : "Create New Match"}
                </Text>
                <Text style={styles.headerSubtitle}>
                  {isPt ? "Agende um jogo individual ou de torneio" : "Schedule a standalone or tournament match"}
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
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
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
                  testID="match-team2-input"
                />
              </View>
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
                      testID={`match-sport-select-${s.toLowerCase().replace(/\s+/g, "-")}`}
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

            {/* Associated Tournament (Optional) */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>
                {isPt ? "Torneio Associado (Opcional)" : "Associated Tournament (Optional)"}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tournamentChipsScroll}
              >
                <TouchableOpacity
                  style={[
                    styles.tournamentChip,
                    selectedTournamentId === "" && styles.tournamentChipActive,
                  ]}
                  onPress={() => setSelectedTournamentId("")}
                  disabled={submitting}
                  testID="tournament-chip-none"
                >
                  <Text
                    style={[
                      styles.tournamentChipText,
                      selectedTournamentId === "" && styles.tournamentChipTextActive,
                    ]}
                  >
                    {isPt ? "Nenhum (Jogo Avulso)" : "None (Standalone)"}
                  </Text>
                </TouchableOpacity>

                {userTournaments.map((tr) => {
                  const isSelected = selectedTournamentId === tr.id;
                  return (
                    <TouchableOpacity
                      key={tr.id}
                      style={[
                        styles.tournamentChip,
                        isSelected && styles.tournamentChipActive,
                      ]}
                      onPress={() => setSelectedTournamentId(tr.id)}
                      disabled={submitting}
                      testID={`tournament-chip-${tr.id}`}
                    >
                      <Ionicons
                        name="trophy-outline"
                        size={14}
                        color={isSelected ? "#ffffff" : "#94a3b8"}
                        style={{ marginRight: 6 }}
                      />
                      <Text
                        style={[
                          styles.tournamentChipText,
                          isSelected && styles.tournamentChipTextActive,
                        ]}
                        numberOfLines={1}
                      >
                        {tr.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

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
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={18} color="#ffffff" style={{ marginRight: 6 }} />
                  <Text style={styles.submitBtnText}>
                    {isPt ? "Criar Jogo" : "Create Match"}
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
  fieldHelper: {
    fontSize: 11,
    color: "#64748b",
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
  tournamentChipsScroll: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 2,
  },
  tournamentChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  tournamentChipActive: {
    backgroundColor: "#4f46e5",
    borderColor: "#6366f1",
  },
  tournamentChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94a3b8",
  },
  tournamentChipTextActive: {
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
