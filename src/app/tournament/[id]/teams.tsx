import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { TopBar } from "@/components/TopBar";
import { supabase } from "@/lib/supabase/client";

export default function TournamentTeamsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [tournament, setTournament] = useState<any | null>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const tournamentId = (Array.isArray(id) ? id[0] : id) || "";

  useEffect(() => {
    if (!tournamentId) return;

    const fetchTeams = async () => {
      try {
        const [tourRes, partRes] = await Promise.all([
          supabase.from("tournaments").select("name, sport_type").eq("id", tournamentId).single(),
          supabase
            .from("tournament_participants")
            .select("*")
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
    };

    fetchTeams();
  }, [tournamentId]);

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
          Equipas Inscritas
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={styles.subHeader}>
        <Text style={styles.tournamentName}>{tournament?.name}</Text>
        <Text style={styles.participantCount}>{participants.length} equipas confirmadas</Text>
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

            <Ionicons name="checkmark-circle" size={20} color="#4edea3" />
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Ionicons name="people-outline" size={48} color="#475569" />
            <Text style={styles.emptyTitle}>Nenhuma equipa inscrita</Text>
            <Text style={styles.emptySubtitle}>
              As inscrições ainda não têm participantes confirmados.
            </Text>
          </View>
        }
      />
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
  subHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#151b2d",
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
  },
  tournamentName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#f8fafc",
  },
  participantCount: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 2,
  },
  list: {
    padding: 16,
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
    gap: 12,
  },
  seedBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#101626",
    borderWidth: 1,
    borderColor: "#232d4b",
    alignItems: "center",
    justifyContent: "center",
  },
  seedText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#a5b4fc",
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#f8fafc",
  },
  contactEmail: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#f8fafc",
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#64748b",
    textAlign: "center",
  },
});
