import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { TopBar } from "@/components/TopBar";
import { useLanguage } from "@/lib/i18n";
import { supabase } from "@/lib/supabase/client";

export default function TournamentSignupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useLanguage();

  const [tournament, setTournament] = useState<any | null>(null);
  const [participantCount, setParticipantCount] = useState<number>(0);
  const [teamName, setTeamName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [formResponses, setFormResponses] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const tournamentId = (Array.isArray(id) ? id[0] : id) || "";

  useEffect(() => {
    if (!tournamentId) return;

    const fetchTournament = async () => {
      try {
        const { data, error } = await supabase
          .from("tournaments")
          .select("id, name, sport_type, status, settings, signup_schema")
          .eq("id", tournamentId)
          .single();

        if (error) throw error;
        setTournament(data);

        // Pre-fill initial form fields
        const initialResponses: Record<string, any> = {};
        (data.signup_schema || []).forEach((field: any) => {
          initialResponses[field.id] = field.type === "checkbox" ? false : "";
        });
        setFormResponses(initialResponses);

        const { count } = await supabase
          .from("tournament_participants")
          .select("id", { count: "exact", head: true })
          .eq("tournament_id", tournamentId);

        setParticipantCount(count || 0);
      } catch (e) {
        console.warn("Tournament signup load error:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchTournament();
  }, [tournamentId]);

  const maxTeams = tournament?.settings?.max_teams ?? 16;
  const isFull = participantCount >= maxTeams;

  const handleSubmit = async () => {
    if (!teamName.trim() || !contactEmail.trim()) {
      Alert.alert("Campos Obrigatórios", "Por favor preencha o nome da equipa e o email de contacto.");
      return;
    }

    if (tournament?.status !== "pending") {
      Alert.alert("Inscrições Encerradas", "As inscrições para este torneio já não se encontram abertas.");
      return;
    }

    if (isFull) {
      Alert.alert("Torneio Completo", "Este torneio atingiu o número máximo de vagas.");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("tournament_participants").insert({
        tournament_id: tournamentId,
        name: teamName.trim(),
        contact_email: contactEmail.trim().toLowerCase(),
        form_responses: formResponses,
      });

      if (error) throw error;
      setSuccess(true);
    } catch (e: any) {
      Alert.alert("Erro na Inscrição", e.message || "Ocorreu um erro ao submeter a inscrição.");
    } finally {
      setSubmitting(false);
    }
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
          Inscrição de Equipa
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {success ? (
          <View style={styles.successCard}>
            <Ionicons name="checkmark-circle" size={56} color="#4edea3" />
            <Text style={styles.successTitle}>Inscrição Confirmada!</Text>
            <Text style={styles.successSubtitle}>
              A equipa <Text style={{ color: "#f8fafc", fontWeight: "700" }}>{teamName}</Text> foi inscrita com sucesso no {tournament?.name}.
            </Text>
            <TouchableOpacity style={styles.backHomeBtn} onPress={() => router.replace(`/tournament/${tournamentId}` as any)}>
              <Text style={styles.backHomeBtnText}>Ver Torneio</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Tournament Info Banner */}
            <View style={styles.banner}>
              <Text style={styles.bannerSport}>{tournament?.sport_type?.toUpperCase()}</Text>
              <Text style={styles.bannerTitle}>{tournament?.name}</Text>
              <View style={styles.slotsRow}>
                <Ionicons name="people-outline" size={16} color="#94a3b8" />
                <Text style={styles.slotsText}>
                  {participantCount} de {maxTeams} vagas preenchidas
                </Text>
              </View>
            </View>

            {/* Core Fields */}
            <View style={styles.formSection}>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Nome da Equipa / Atleta *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: SL Benfica, Team Alpha"
                  placeholderTextColor="#64748b"
                  value={teamName}
                  onChangeText={setTeamName}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Email de Contacto *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="responsavel@exemplo.com"
                  placeholderTextColor="#64748b"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={contactEmail}
                  onChangeText={setContactEmail}
                />
              </View>

              {/* Dynamic Schema Fields */}
              {(tournament?.signup_schema || []).map((field: any) => {
                return (
                  <View key={field.id} style={styles.fieldGroup}>
                    <Text style={styles.label}>
                      {field.label} {field.required ? "*" : ""}
                    </Text>
                    {field.type === "checkbox" ? (
                      <TouchableOpacity
                        style={styles.checkboxRow}
                        onPress={() =>
                          setFormResponses((prev) => ({
                            ...prev,
                            [field.id]: !prev[field.id],
                          }))
                        }
                      >
                        <Ionicons
                          name={formResponses[field.id] ? "checkbox" : "square-outline"}
                          size={22}
                          color={formResponses[field.id] ? "#4edea3" : "#64748b"}
                        />
                        <Text style={styles.checkboxLabel}>Concordo / Confirmado</Text>
                      </TouchableOpacity>
                    ) : (
                      <TextInput
                        style={styles.input}
                        placeholder={field.placeholder || `Introduza ${field.label.toLowerCase()}`}
                        placeholderTextColor="#64748b"
                        value={formResponses[field.id] || ""}
                        onChangeText={(val) =>
                          setFormResponses((prev) => ({ ...prev, [field.id]: val }))
                        }
                      />
                    )}
                  </View>
                );
              })}

              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleSubmit}
                disabled={submitting || isFull}
                activeOpacity={0.85}
              >
                {submitting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.submitBtnText}>
                    {isFull ? "VAGAS ESGOTADAS" : "SUBMETER INSCRIÇÃO"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
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
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  banner: {
    backgroundColor: "#151b2d",
    borderWidth: 1,
    borderColor: "#232d4b",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  bannerSport: {
    fontSize: 11,
    fontWeight: "800",
    color: "#a5b4fc",
    letterSpacing: 1,
    marginBottom: 4,
  },
  bannerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#f8fafc",
    marginBottom: 8,
  },
  slotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  slotsText: {
    fontSize: 13,
    color: "#94a3b8",
  },
  formSection: {
    gap: 16,
  },
  fieldGroup: {},
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#151b2d",
    borderWidth: 1,
    borderColor: "#232d4b",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#f8fafc",
    fontSize: 14,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
  },
  checkboxLabel: {
    fontSize: 13,
    color: "#cbd5e1",
  },
  submitBtn: {
    backgroundColor: "#4f46e5",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  submitBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 1,
  },
  successCard: {
    backgroundColor: "#151b2d",
    borderWidth: 1,
    borderColor: "rgba(78, 222, 163, 0.4)",
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    gap: 12,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#f8fafc",
  },
  successSubtitle: {
    fontSize: 14,
    color: "#94a3b8",
    textAlign: "center",
    lineHeight: 20,
  },
  backHomeBtn: {
    marginTop: 16,
    backgroundColor: "#4f46e5",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  backHomeBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
});
