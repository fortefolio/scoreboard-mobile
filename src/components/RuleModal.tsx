import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLanguage } from "@/lib/i18n";
import { Colors, Spacing } from "@/constants/theme";

interface RuleModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (rules: Record<string, any>, court: string | null) => Promise<void>;
  sportType: string;
  initialRules?: Record<string, any>;
  initialCourt?: string | null;
}

export function RuleModal({
  visible,
  onClose,
  onSave,
  sportType,
  initialRules = {},
  initialCourt,
}: RuleModalProps) {
  const { t } = useLanguage();

  const isBasketball = sportType === "Basketball";
  const isFootball = sportType === "Football";
  const isTennis = sportType === "Tennis";
  const isPadel = sportType === "Padel";
  const isRacketSport = isTennis || isPadel;

  const [court, setCourt] = useState<string>(initialCourt || "");
  const [sets, setSets] = useState<number>(
    initialRules?.max_sets || (sportType === "Volleyball" ? 5 : 3)
  );
  const [points, setPoints] = useState<number>(
    initialRules?.points_per_set || (sportType === "Volleyball" ? 25 : isRacketSport ? 6 : 21)
  );
  const [noAd, setNoAd] = useState<boolean>(initialRules?.no_ad ?? true);

  // Basketball
  const [quarterMinutes, setQuarterMinutes] = useState<number>(
    initialRules?.quarter_minutes || 10
  );
  const [shotClockSeconds, setShotClockSeconds] = useState<number>(
    initialRules?.shot_clock_seconds || 24
  );

  // Football
  const [halfMinutes, setHalfMinutes] = useState<number>(initialRules?.half_minutes || 45);

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const trimmedCourt = court.trim() === "" ? null : court.trim();
      let payload: Record<string, any> = { ...initialRules };

      if (isBasketball) {
        payload = {
          ...payload,
          quarter_minutes: quarterMinutes,
          shot_clock_seconds: shotClockSeconds,
          quarters_count: 4,
        };
      } else if (isFootball) {
        payload = {
          ...payload,
          half_minutes: halfMinutes,
        };
      } else if (isPadel) {
        payload = {
          ...payload,
          max_sets: sets,
          points_per_set: 6,
          no_ad: noAd,
        };
      } else {
        payload = {
          ...payload,
          max_sets: sets,
          points_per_set: points,
        };
      }

      await onSave(payload, trimmedCourt);
      onClose();
    } catch (e) {
      console.warn("Failed to save rules:", e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <View style={styles.header}>
              <View>
                <Text style={styles.title}>{t("match.editRules") || "Regras do Jogo"}</Text>
                <Text style={styles.subtitle}>
                  {sportType} • {court || "Recinto"}
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
              {/* Venue / Court */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>
                  {isFootball
                    ? t("match.venueStadium") || "Estádio / Recinto"
                    : t("match.venueCourt") || "Recinto / Campo"}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Campo Central, Court 1"
                  placeholderTextColor="#64748b"
                  value={court}
                  onChangeText={setCourt}
                />
              </View>

              {/* Basketball Options */}
              {isBasketball && (
                <>
                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Duração do Quarto (minutos)</Text>
                    <View style={styles.pillRow}>
                      {[8, 10, 12].map((mins) => (
                        <TouchableOpacity
                          key={mins}
                          style={[styles.pill, quarterMinutes === mins && styles.pillActive]}
                          onPress={() => setQuarterMinutes(mins)}
                        >
                          <Text
                            style={[
                              styles.pillText,
                              quarterMinutes === mins && styles.pillTextActive,
                            ]}
                          >
                            {mins} min
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Shot Clock (segundos)</Text>
                    <View style={styles.pillRow}>
                      {[14, 24].map((secs) => (
                        <TouchableOpacity
                          key={secs}
                          style={[styles.pill, shotClockSeconds === secs && styles.pillActive]}
                          onPress={() => setShotClockSeconds(secs)}
                        >
                          <Text
                            style={[
                              styles.pillText,
                              shotClockSeconds === secs && styles.pillTextActive,
                            ]}
                          >
                            {secs} seg
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </>
              )}

              {/* Football Options */}
              {isFootball && (
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Duração de cada Parte (minutos)</Text>
                  <View style={styles.pillRow}>
                    {[20, 25, 45].map((mins) => (
                      <TouchableOpacity
                        key={mins}
                        style={[styles.pill, halfMinutes === mins && styles.pillActive]}
                        onPress={() => setHalfMinutes(mins)}
                      >
                        <Text
                          style={[styles.pillText, halfMinutes === mins && styles.pillTextActive]}
                        >
                          {mins} min
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Racket & Sets Options */}
              {!isBasketball && !isFootball && (
                <>
                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Máximo de Sets (À melhor de)</Text>
                    <View style={styles.pillRow}>
                      {[1, 3, 5].map((s) => (
                        <TouchableOpacity
                          key={s}
                          style={[styles.pill, sets === s && styles.pillActive]}
                          onPress={() => setSets(s)}
                        >
                          <Text style={[styles.pillText, sets === s && styles.pillTextActive]}>
                            {s} {s === 1 ? "Set" : "Sets"}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {isPadel && (
                    <View style={styles.fieldGroup}>
                      <Text style={styles.label}>Vantagem / Ponto de Ouro (Golden Point)</Text>
                      <View style={styles.pillRow}>
                        <TouchableOpacity
                          style={[styles.pill, noAd && styles.pillActive]}
                          onPress={() => setNoAd(true)}
                        >
                          <Text style={[styles.pillText, noAd && styles.pillTextActive]}>
                            Golden Point (No-Ad)
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.pill, !noAd && styles.pillActive]}
                          onPress={() => setNoAd(false)}
                        >
                          <Text style={[styles.pillText, !noAd && styles.pillTextActive]}>
                            Vantagens (Ad)
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </>
              )}
            </ScrollView>

            {/* Footer Buttons */}
            <View style={styles.footer}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelText}>{t("common.cancel") || "Cancelar"}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.8}
              >
                <Text style={styles.saveText}>
                  {saving ? t("common.loading") || "A guardar..." : t("match.saveRules") || "Guardar"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.four,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    maxHeight: "85%",
    backgroundColor: "#151b2d",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#232d4b",
    padding: Spacing.four,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.three,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#f8fafc",
  },
  subtitle: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    marginVertical: Spacing.two,
  },
  fieldGroup: {
    marginBottom: Spacing.three,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#0c1324",
    borderWidth: 1,
    borderColor: "#232d4b",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#f8fafc",
    fontSize: 14,
  },
  pillRow: {
    flexDirection: "row",
    gap: 8,
  },
  pill: {
    flex: 1,
    backgroundColor: "#0c1324",
    borderWidth: 1,
    borderColor: "#232d4b",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  pillActive: {
    backgroundColor: "#4f46e5",
    borderColor: "#6366f1",
  },
  pillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94a3b8",
  },
  pillTextActive: {
    color: "#ffffff",
    fontWeight: "700",
  },
  footer: {
    flexDirection: "row",
    gap: 12,
    marginTop: Spacing.three,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: "#1e293b",
    borderRadius: 10,
    alignItems: "center",
  },
  cancelText: {
    color: "#cbd5e1",
    fontSize: 14,
    fontWeight: "600",
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: "#4f46e5",
    borderRadius: 10,
    alignItems: "center",
  },
  saveText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
});
