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
  Share,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/components/AuthProvider";
import { ScoreBoardTheme } from "@/constants/theme";
import { useLanguage } from "@/lib/i18n";
import { mapErrorToUserMessage } from "@/lib/errors/mapError";
import { supabase } from "@/lib/supabase/client";

interface TournamentRosterSectionProps {
  tournamentId: string;
  initialTournament?: any;
  embedded?: boolean;
  onTeamsChanged?: () => void;
}

/**
 * Shared Tournament Roster management section used both inline in the Teams tab
 * and on the standalone `/tournament/[id]/teams` screen.
 */
export function TournamentRosterSection({
  tournamentId,
  initialTournament,
  embedded = false,
  onTeamsChanged,
}: TournamentRosterSectionProps) {
  const { user } = useAuth();
  const { locale } = useLanguage();
  const isPt = locale === "pt";

  const [tournament, setTournament] = useState<any | null>(initialTournament ?? null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [submittingTeam, setSubmittingTeam] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "cards">("list");
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<any | null>(null);

  useEffect(() => {
    if (initialTournament) {
      setTournament(initialTournament);
    }
  }, [initialTournament]);

  const fetchTeams = useCallback(async () => {
    if (!tournamentId) return;
    try {
      let tourData = initialTournament ?? null;
      if (!tourData) {
        const { data } = await supabase
          .from("tournaments")
          .select("id, name, sport_type, organizer_id, settings")
          .eq("id", tournamentId)
          .single();
        tourData = data;
      }

      if (tourData) setTournament(tourData);

      let pData: any[] | null = null;
      if (
        user &&
        tourData?.organizer_id &&
        user.id === tourData.organizer_id &&
        typeof supabase.rpc === "function"
      ) {
        try {
          const { data: adminData, error: rpcError } = await supabase.rpc(
            "get_tournament_participants_admin",
            { p_tournament_id: tournamentId }
          );
          if (!rpcError && Array.isArray(adminData)) {
            pData = adminData;
          }
        } catch {
          // Fallback to public table query
        }
      }

      if (!pData) {
        const { data: publicData, error: partError } = await supabase
          .from("tournament_participants")
          .select("id, tournament_id, name, seed, created_at")
          .eq("tournament_id", tournamentId)
          .order("seed", { ascending: true, nullsFirst: false });

        if (partError) {
          console.warn("Participants query error:", partError);
        } else {
          pData = publicData || [];
        }
      }

      if (pData) setParticipants(pData);
    } catch (e) {
      console.warn("Teams load error:", e);
    } finally {
      setLoading(false);
    }
  }, [tournamentId, user, initialTournament]);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  const isOrganizer = Boolean(
    user?.id && tournament?.organizer_id && user.id === tournament.organizer_id
  );
  const maxTeams = Number(tournament?.settings?.max_teams) || 16;
  const isLimitReached = participants.length >= maxTeams;

  const handleShareSignupLink = async () => {
    if (!isOrganizer) return;
    setMenuVisible(false);
    const url = `https://scoreboard.app/tournament/${tournamentId}/signup`;
    try {
      await Share.share({
        title: tournament?.name || "Tournament Signup",
        message: isPt
          ? `Inscreve-te em ${tournament?.name || "Torneio"}: ${url}`
          : `Sign up for ${tournament?.name || "Tournament"}: ${url}`,
        url,
      });
    } catch (err: any) {
      Alert.alert(isPt ? "Erro ao Partilhar" : "Share Error", err?.message || "Could not open share sheet.");
    }
  };

  const handleExportCsv = async () => {
    if (!isOrganizer) return;
    setMenuVisible(false);
    if (participants.length === 0) {
      Alert.alert(
        isPt ? "Sem Equipas" : "No Teams",
        isPt ? "Não existem equipas para exportar." : "There are no teams to export."
      );
      return;
    }
    const header = isOrganizer ? "Seed,Team,Email" : "Seed,Team";
    const rows = participants.map((p, idx) => {
      const seed = String(p.seed ?? idx + 1).padStart(2, "0");
      const safeName = `"${String(p.name || "").replace(/"/g, '""')}"`;
      if (isOrganizer) {
        const safeEmail = `"${String(p.contact_email || "").replace(/"/g, '""')}"`;
        return `${seed},${safeName},${safeEmail}`;
      }
      return `${seed},${safeName}`;
    });
    const csv = [header, ...rows].join("\n");
    try {
      await Share.share({
        title: `${tournament?.name || "roster"}.csv`,
        message: csv,
      });
    } catch (err: any) {
      Alert.alert(isPt ? "Erro ao Exportar" : "Export Error", err?.message || "Could not export CSV.");
    }
  };

  const handlePrintRoster = async () => {
    if (!isOrganizer) return;
    setMenuVisible(false);
    if (participants.length === 0) {
      Alert.alert(
        isPt ? "Sem Equipas" : "No Teams",
        isPt ? "Não existem equipas para imprimir." : "There are no teams to print."
      );
      return;
    }
    const lines = participants.map((p, idx) => {
      const num = String(p.seed ?? idx + 1).padStart(2, "0");
      const emailPart = isOrganizer && p.contact_email ? ` (${p.contact_email})` : "";
      return `${num}. ${p.name}${emailPart}`;
    });
    const text = `${tournament?.name || "Tournament Roster"} (${participants.length}/${maxTeams})\n\n${lines.join("\n")}`;
    try {
      await Share.share({
        title: tournament?.name || "Tournament Roster",
        message: text,
      });
    } catch (err: any) {
      Alert.alert(isPt ? "Erro ao Imprimir" : "Print Error", err?.message || "Could not open print/share sheet.");
    }
  };

  const handleAddTeam = async () => {
    if (!isOrganizer) return;
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
      await fetchTeams();
      onTeamsChanged?.();
    } catch (err: any) {
      Alert.alert(
        isPt ? "Erro ao Adicionar" : "Error Adding Team",
        mapErrorToUserMessage(
          err,
          isPt ? "pt" : "en",
          isPt ? "Não foi possível adicionar a equipa." : "Could not add team."
        )
      );
    } finally {
      setSubmittingTeam(false);
    }
  };

  const handleRemoveTeam = (participantId: string, teamName: string) => {
    if (!isOrganizer) return;
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
              await fetchTeams();
              onTeamsChanged?.();
            } catch (err: any) {
              Alert.alert(
                isPt ? "Erro ao Remover" : "Error Removing",
                mapErrorToUserMessage(
                  err,
                  isPt ? "pt" : "en",
                  isPt ? "Não foi possível remover." : "Could not remove."
                )
              );
            }
          },
        },
      ]
    );
  };

  const renderTeamRow = (item: any, index: number) => (
    <View
      key={item.id}
      style={[
        styles.teamCard,
        viewMode === "cards" && styles.teamCardExpanded,
      ]}
    >
      <View style={styles.seedBadge}>
        <Text style={styles.seedText}>
          {String(item.seed ?? index + 1).padStart(2, "0")}
        </Text>
      </View>

      <View style={styles.teamInfo}>
        <Text style={styles.teamName} numberOfLines={1}>
          {item.name}
        </Text>
        {isOrganizer && item.contact_email && (
          <Text style={styles.contactEmail} numberOfLines={1}>
            {item.contact_email}
          </Text>
        )}
      </View>

      {isOrganizer && (
        <View style={styles.rowRightActions}>
          <TouchableOpacity
            onPress={() => setSelectedTeam({ ...item, displayNum: item.seed ?? index + 1 })}
            style={styles.eyeBtn}
            testID={`view-team-btn-${item.id}`}
            activeOpacity={0.75}
          >
            <Ionicons
              name="eye-outline"
              size={16}
              color={ScoreBoardTheme.onSurfaceVariant}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleRemoveTeam(item.id, item.name)}
            style={styles.removeBtn}
            testID={`remove-team-btn-${item.id}`}
            activeOpacity={0.75}
          >
            <Ionicons name="trash-outline" size={16} color="#ef4444" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderEmpty = () => (
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
          <Ionicons name="add-circle-outline" size={18} color={ScoreBoardTheme.surfaceContainerLowest} style={{ marginRight: 6 }} />
          <Text style={styles.emptyAddBtnText}>
            {isPt ? "Adicionar Primeira Equipa" : "Add First Team"}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={ScoreBoardTheme.onSurfaceVariant} />
      </View>
    );
  }

  return (
    <View style={embedded ? styles.embeddedCard : styles.container}>
      {/* Roster Toolbar */}
      <View style={[styles.rosterToolbar, embedded && styles.rosterToolbarEmbedded]}>
        <Text style={styles.tournamentName} numberOfLines={1}>
          {embedded ? (isPt ? "Lista de Equipas" : "Tournament Roster") : tournament?.name}
        </Text>
        <Text style={styles.participantCount}>
          {isPt
            ? `Gerir equipas e jogadores (${participants.length} / ${maxTeams}).`
            : `Manage participating teams and players (${participants.length} / ${maxTeams}).`}
        </Text>

        <View style={styles.toolbarActions}>
          {isOrganizer && (
            <TouchableOpacity
              style={[
                styles.addTeamBtn,
                isLimitReached && styles.addTeamBtnDisabled,
              ]}
              onPress={() => setAddModalVisible(true)}
              disabled={isLimitReached}
              testID="header-add-team-btn"
              activeOpacity={0.8}
            >
              <Ionicons
                name="add"
                size={16}
                color={
                  isLimitReached
                    ? ScoreBoardTheme.textMuted
                    : ScoreBoardTheme.surfaceContainerLowest
                }
              />
              <Text
                style={[
                  styles.addTeamBtnText,
                  isLimitReached && styles.addTeamBtnTextDisabled,
                ]}
              >
                {isLimitReached
                  ? isPt
                    ? "Limite Atingido"
                    : "Limit Reached"
                  : isPt
                  ? "Adicionar Equipa"
                  : "Add Team"}
              </Text>
            </TouchableOpacity>
          )}

          <View style={styles.viewToggleGroup}>
            <TouchableOpacity
              style={[
                styles.viewToggleBtn,
                viewMode === "cards" && styles.viewToggleBtnActive,
              ]}
              onPress={() => setViewMode("cards")}
              activeOpacity={0.75}
            >
              <Ionicons
                name="grid-outline"
                size={15}
                color={
                  viewMode === "cards"
                    ? ScoreBoardTheme.onSurface
                    : ScoreBoardTheme.textMuted
                }
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.viewToggleBtn,
                viewMode === "list" && styles.viewToggleBtnActive,
              ]}
              onPress={() => setViewMode("list")}
              activeOpacity={0.75}
            >
              <Ionicons
                name="list-outline"
                size={15}
                color={
                  viewMode === "list"
                    ? ScoreBoardTheme.onSurface
                    : ScoreBoardTheme.textMuted
                }
              />
            </TouchableOpacity>
          </View>

          {isOrganizer && (
            <TouchableOpacity
              style={styles.menuBtn}
              onPress={() => setMenuVisible((prev) => !prev)}
              testID="roster-menu-btn"
              activeOpacity={0.75}
            >
              <Ionicons
                name="ellipsis-vertical"
                size={16}
                color={ScoreBoardTheme.onSurfaceVariant}
              />
            </TouchableOpacity>
          )}
        </View>

        {isOrganizer && menuVisible && (
          <View style={styles.menuDropdown}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleShareSignupLink}
              testID="roster-share-signup-btn"
            >
              <Ionicons
                name="share-social-outline"
                size={16}
                color={ScoreBoardTheme.textMuted}
              />
              <Text style={styles.menuItemText}>
                {isPt ? "Partilhar Link de Inscrição" : "Share Signup Link"}
              </Text>
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleExportCsv}
              testID="roster-export-csv-btn"
            >
              <Ionicons
                name="download-outline"
                size={16}
                color={ScoreBoardTheme.textMuted}
              />
              <Text style={styles.menuItemText}>
                {isPt ? "Exportar CSV" : "Export CSV"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={handlePrintRoster}
              testID="roster-print-btn"
            >
              <Ionicons
                name="print-outline"
                size={16}
                color={ScoreBoardTheme.textMuted}
              />
              <Text style={styles.menuItemText}>
                {isPt ? "Imprimir" : "Print"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {menuVisible && (
        <TouchableOpacity
          style={styles.menuBackdrop}
          activeOpacity={1}
          onPress={() => setMenuVisible(false)}
        />
      )}

      {embedded ? (
        <View style={styles.listEmbedded}>
          {participants.length === 0
            ? renderEmpty()
            : participants.map((item, index) => renderTeamRow(item, index))}
        </View>
      ) : (
        <FlatList
          data={participants}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item, index }) => renderTeamRow(item, index)}
          ListEmptyComponent={renderEmpty}
        />
      )}

      {/* Add Team Modal (Organizer only) */}
      {isOrganizer && (
        <Modal
          visible={addModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setAddModalVisible(false)}
        >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.addModalContent}>
            <Text style={styles.addModalTitle}>
              {isPt ? "Adicionar Equipa" : "Add Team"}
            </Text>
            <Text style={styles.addModalSubtitle}>
              {isPt
                ? "Registe manualmente uma equipa ou jogador no torneio."
                : "Manually register a team or player in the tournament."}
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder={isPt ? "Nome da Equipa / Jogadores" : "Team / Players Name"}
              placeholderTextColor="#64748b"
              value={newTeamName}
              onChangeText={setNewTeamName}
              autoFocus
              testID="new-team-name-input"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => {
                  setNewTeamName("");
                  setAddModalVisible(false);
                }}
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
      )}

      {/* Team Details Modal (Organizer only) */}
      {isOrganizer && (
        <Modal
          visible={!!selectedTeam}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedTeam(null)}
        >
        <View style={styles.modalOverlay}>
          <View style={styles.addModalContent}>
            <View style={styles.detailHeader}>
              <Text style={styles.addModalTitle} numberOfLines={1}>
                {selectedTeam?.name}
              </Text>
              <TouchableOpacity onPress={() => setSelectedTeam(null)}>
                <Ionicons
                  name="close"
                  size={20}
                  color={ScoreBoardTheme.textMuted}
                />
              </TouchableOpacity>
            </View>
            <Text style={styles.addModalSubtitle}>
              #{String(selectedTeam?.displayNum || 1).padStart(2, "0")}
              {isOrganizer && selectedTeam?.contact_email
                ? ` · ${selectedTeam.contact_email}`
                : ""}
            </Text>

            <ScrollView style={{ maxHeight: 240 }} contentContainerStyle={{ gap: 8 }}>
              {selectedTeam?.responses &&
              typeof selectedTeam.responses === "object" &&
              Object.keys(selectedTeam.responses).length > 0 ? (
                Object.entries(selectedTeam.responses).map(([key, val]) => (
                  <View key={key} style={styles.responseRow}>
                    <Text style={styles.responseKey}>{key}</Text>
                    <Text style={styles.responseVal}>{String(val)}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptySubtitle}>
                  {isPt
                    ? "Sem respostas adicionais no formulário."
                    : "No additional registration responses."}
                </Text>
              )}
            </ScrollView>
          </View>
        </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  embeddedCard: {
    backgroundColor: ScoreBoardTheme.surfaceContainer,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    overflow: "visible",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  addTeamBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ScoreBoardTheme.onSurface,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    gap: 6,
  },
  addTeamBtnDisabled: {
    backgroundColor: ScoreBoardTheme.surfaceContainerHighest,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
  },
  addTeamBtnText: {
    color: ScoreBoardTheme.surfaceContainerLowest,
    fontSize: 13,
    fontWeight: "700",
  },
  addTeamBtnTextDisabled: {
    color: ScoreBoardTheme.textMuted,
  },
  rosterToolbar: {
    position: "relative",
    zIndex: 50,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: ScoreBoardTheme.borderSubtle,
    backgroundColor: ScoreBoardTheme.surfaceContainer,
  },
  rosterToolbarEmbedded: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  toolbarActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  viewToggleGroup: {
    height: 38,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: ScoreBoardTheme.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    borderRadius: 10,
    padding: 3,
    gap: 2,
  },
  viewToggleBtn: {
    width: 30,
    height: 30,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  viewToggleBtnActive: {
    backgroundColor: ScoreBoardTheme.surfaceContainerHighest,
  },
  menuBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: ScoreBoardTheme.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  tournamentName: {
    fontSize: 18,
    fontWeight: "800",
    color: ScoreBoardTheme.onSurface,
    marginBottom: 4,
  },
  participantCount: {
    fontSize: 13,
    color: ScoreBoardTheme.onSurfaceVariant,
  },
  list: {
    padding: 16,
    paddingBottom: 40,
    gap: 10,
  },
  listEmbedded: {
    padding: 14,
    gap: 8,
  },
  teamCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: ScoreBoardTheme.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    borderRadius: 14,
    padding: 14,
  },
  teamCardExpanded: {
    paddingVertical: 18,
  },
  seedBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: ScoreBoardTheme.surfaceContainerHighest,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  seedText: {
    fontSize: 12,
    fontWeight: "700",
    color: ScoreBoardTheme.onSurfaceVariant,
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
  rowRightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginLeft: 8,
  },
  eyeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: ScoreBoardTheme.surfaceContainerHighest,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
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
    backgroundColor: ScoreBoardTheme.onSurface,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    marginTop: 14,
  },
  emptyAddBtnText: {
    color: ScoreBoardTheme.surfaceContainerLowest,
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
    backgroundColor: ScoreBoardTheme.surfaceContainer,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    width: "100%",
    maxWidth: 400,
    padding: 20,
  },
  addModalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: ScoreBoardTheme.onSurface,
  },
  addModalSubtitle: {
    fontSize: 12,
    color: ScoreBoardTheme.onSurfaceVariant,
    marginTop: 2,
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: ScoreBoardTheme.surfaceContainerHighest,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: ScoreBoardTheme.onSurface,
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
    backgroundColor: ScoreBoardTheme.surfaceContainerHighest,
  },
  modalCancelText: {
    color: ScoreBoardTheme.onSurfaceVariant,
    fontSize: 13,
    fontWeight: "600",
  },
  modalSubmitBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: ScoreBoardTheme.onSurface,
  },
  modalSubmitText: {
    color: ScoreBoardTheme.surfaceContainerLowest,
    fontSize: 13,
    fontWeight: "700",
  },
  menuBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 40,
  },
  menuDropdown: {
    position: "absolute",
    top: "100%",
    right: 16,
    marginTop: 6,
    width: 210,
    backgroundColor: ScoreBoardTheme.surfaceContainerHighest,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    paddingVertical: 6,
    zIndex: 60,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 12,
  },
  menuDivider: {
    height: 1,
    backgroundColor: ScoreBoardTheme.borderSubtle,
    marginVertical: 4,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  menuItemText: {
    fontSize: 13,
    fontWeight: "600",
    color: ScoreBoardTheme.onSurface,
  },
  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  responseRow: {
    backgroundColor: ScoreBoardTheme.surfaceContainerHighest,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
  },
  responseKey: {
    fontSize: 11,
    fontWeight: "600",
    color: ScoreBoardTheme.textMuted,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  responseVal: {
    fontSize: 14,
    color: ScoreBoardTheme.onSurface,
    fontWeight: "500",
  },
});
