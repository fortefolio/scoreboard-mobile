import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { TopBar } from "@/components/TopBar";
import { useAuth } from "@/components/AuthProvider";
import { useLanguage } from "@/lib/i18n";
import { supabase } from "@/lib/supabase/client";

export default function TournamentTeamsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { locale } = useLanguage();
  const isPt = locale === "pt";

  const [tournament, setTournament] = useState<any | null>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [submittingTeam, setSubmittingTeam] = useState(false);

  const tournamentId = (Array.isArray(id) ? id[0] : id) || "";

  const fetchTeams = useCallback(async () => {
    if (!tournamentId) return;
    try {
      const [tourRes, partRes] = await Promise.all([
        supabase
          .from("tournaments")
          .select("name, sport_type, organizer_id")
          .eq("id", tournamentId)
          .single(),
        supabase
          .from("tournament_participants")
          .select("id, tournament_id, team_id, name, seed, created_at")
          .eq("tournament_id", tournamentId)
          .order("seed", { ascending: true, nullsFirst: false }),
      ]);

      if (tourRes.data) setTournament(tourRes.data);
      if (partRes.data) setParticipants(partRes.data);
    } catch (e) {
      console.warn("Teams load error:", e);
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  const isOrganizer = Boolean(user && tournament && user.id === tournament.organizer_id);

  const handleAddTeam = async () => {
    const trimmed = newTeamName.trim();
    if (!trimmed) {
      Alert.alert(
        isPt ? "Campo Obrigatório" : "Required Field",
        isPt ? "Por favor insira o nome da equipa." : "Please enter the team name."
      );
      return;
    }

    setSubmittingTeam(true);
    try {
      const { error } = await supabase
        .from("tournament_participants")
        .insert({
          tournament_id: tournamentId,
          name: trimmed,
        });

      if (error) throw error;

      setNewTeamName("");
      setAddModalVisible(false);
      fetchTeams();
    } catch (err: any) {
      Alert.alert(
        isPt ? "Erro ao Adicionar" : "Error Adding Team",
        err?.message || (isPt ? "Não foi possível adicionar a equipa." : "Could not add team.")
      );
    } finally {
      setSubmittingTeam(false);
    }
  };

  const handleRemoveTeam = (participantId: string, teamName: string) => {
    Alert.alert(
      isPt ? "Remover Equipa" : "Remove Team",
      isPt
        ? `Tem a certeza que deseja remover "${teamName}" do torneio?`
        : `Are you sure you want to remove "${teamName}" from the tournament?`,
      [
        { text: isPt ? "Cancelar" : "Cancel", style: "cancel" },
        {
          text: isPt ? "Remover" : "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from("tournament_participants")
                .delete()
                .eq("id", participantId);

              if (error) throw error;
              fetchTeams();
            } catch (err: any) {
              Alert.alert(
                isPt ? "Erro ao Remover" : "Error Removing",
                err?.message || (isPt ? "Não foi possível remover." : "Could not remove.")
              );
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#4f46e5" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      {/* Main Global TopBar */}
      <TopBar />

      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#f8fafc" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {isPt ? "Equipas Inscritas" : "Registered Teams"}
        </Text>
        {isOrganizer ? (
          <TouchableOpacity
            style={styles.addTeamBtn}
            onPress={() => setAddModalVisible(true)}
            testID="header-add-team-btn"
          >
            <Ionicons name="add" size={18} color="#ffffff" />
            <Text style={styles.addTeamBtnText}>{isPt ? "Adicionar" : "Add"}</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 32 }} />
        )}
      </View>

      <View style={styles.subHeader}>
        <Text style={styles.tournamentName}>{tournament?.name}</Text>
        <Text style={styles.participantCount}>
          {participants.length} {isPt ? "equipas confirmadas" : "teams confirmed"}
        </Text>
      </View>

      <FlatList
        data={participants}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item, index }) => (
          <View style={styles.teamCard}>
            <View style={styles.seedBadge}>
              <Text style={styles.seedText}>{item.seed ?? index + 1}</Text>
            </View>

            <View style={styles.teamInfo}>
              <Text style={styles.teamName}>{item.name}</Text>
              {item.contact_email && (
                <Text style={styles.contactEmail}>{item.contact_email}</Text>
              )}
            </View>

            {isOrganizer ? (
              <TouchableOpacity
                onPress={() => handleRemoveTeam(item.id, item.name)}
                style={styles.removeBtn}
                testID={`remove-team-btn-${item.id}`}
              >
                <Ionicons name="trash-outline" size={18} color="#ef4444" />
              </TouchableOpacity>
            ) : (
              <Ionicons name="checkmark-circle" size={20} color="#4edea3" />
            )}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Ionicons name="people-outline" size={48} color="#475569" />
            <Text style={styles.emptyTitle}>
              {isPt ? "Nenhuma equipa inscrita" : "No teams registered"}
            </Text>
            <Text style={styles.emptySubtitle}>
              {isPt
                ? "As inscrições ainda não têm participantes confirmados."
                : "There are no confirmed participants yet."}
            </Text>
            {isOrganizer && (
              <TouchableOpacity
                style={styles.emptyAddBtn}
                onPress={() => setAddModalVisible(true)}
                testID="empty-add-team-btn"
              >
                <Ionicons name="add-circle-outline" size={18} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.emptyAddBtnText}>
                  {isPt ? "Adicionar Primeira Equipa" : "Add First Team"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      {/* Add Team Modal */}
      <Modal
        visible={addModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setAddModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.addModalContent}>
            <Text style={styles.addModalTitle}>
              {isPt ? "Adicionar Equipa Manualmente" : "Add Team Manually"}
            </Text>
            <Text style={styles.addModalSubtitle}>
              {isPt ? "Insira o nome da equipa ou jogador" : "Enter team or player name"}
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder={isPt ? "Ex: Dupla Silva / Santos" : "e.g., Silva / Santos"}
              placeholderTextColor="#64748b"
              value={newTeamName}
              onChangeText={setNewTeamName}
              autoFocus={true}
              testID="new-team-name-input"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => {
                  setNewTeamName("");
                  setAddModalVisible(false);
                }}
                disabled={submittingTeam}
              >
                <Text style={styles.modalCancelText}>
                  {isPt ? "Cancelar" : "Cancel"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSubmitBtn, submittingTeam && { opacity: 0.6 }]}
                onPress={handleAddTeam}
                disabled={submittingTeam}
                testID="submit-add-team-btn"
              >
                {submittingTeam ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.modalSubmitText}>
                    {isPt ? "Adicionar" : "Add"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0c1324",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  header: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#f8fafc",
  },
  iconBtn: {
    padding: 4,
  },
  addTeamBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4f46e5",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 4,
  },
  addTeamBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  subHeader: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
    backgroundColor: "#111827",
  },
  tournamentName: {
    fontSize: 18,
    fontWeight: "800",
    color: "#f8fafc",
    marginBottom: 4,
  },
  participantCount: {
    fontSize: 13,
    color: "#94a3b8",
  },
  list: {
    padding: 16,
    paddingBottom: 40,
    gap: 10,
  },
  teamCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#151b2d",
    borderWidth: 1,
    borderColor: "#232d4b",
    borderRadius: 14,
    padding: 14,
  },
  seedBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#1e293b",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  seedText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#a5b4fc",
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#f8fafc",
  },
  contactEmail: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  removeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#f8fafc",
    marginTop: 14,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 18,
  },
  emptyAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4f46e5",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    marginTop: 14,
  },
  emptyAddBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  addModalContent: {
    backgroundColor: "#0f172a",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1e293b",
    width: "100%",
    maxWidth: 400,
    padding: 20,
  },
  addModalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#f8fafc",
  },
  addModalSubtitle: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 2,
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#f8fafc",
    fontSize: 14,
    marginBottom: 18,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  modalCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#1e293b",
  },
  modalCancelText: {
    color: "#cbd5e1",
    fontSize: 13,
    fontWeight: "600",
  },
  modalSubmitBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: "#4f46e5",
  },
  modalSubmitText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
});
