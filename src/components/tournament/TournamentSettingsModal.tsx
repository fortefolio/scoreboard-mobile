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
  Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/components/AuthProvider";
import { useLanguage } from "@/lib/i18n";
import { supabase } from "@/lib/supabase/client";
import { ScoreBoardTheme } from "@/constants/theme";

export interface SignupField {
  id: string;
  label: string;
  type: "select" | "text" | "number" | "checkbox";
  required: boolean;
  options?: string[];
  placeholder?: string;
  min?: string;
  max?: string;
  description?: string;
}

export interface TournamentSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  tournament: any;
  onUpdateSuccess: () => void;
  onDeleteSuccess: () => void;
}

const VISIBILITY_OPTIONS: Array<{
  key: "public" | "unlisted" | "private";
  labelEn: string;
  labelPt: string;
  hintEn: string;
  hintPt: string;
}> = [
  {
    key: "public",
    labelEn: "PUBLIC",
    labelPt: "PÚBLICO",
    hintEn: "Visible to everyone on the landing page",
    hintPt: "Visível para todos na página inicial",
  },
  {
    key: "unlisted",
    labelEn: "UNLISTED",
    labelPt: "NÃO LISTADO",
    hintEn: "Only accessible via direct link",
    hintPt: "Acessível apenas através de link direto",
  },
  {
    key: "private",
    labelEn: "PRIVATE",
    labelPt: "PRIVADO",
    hintEn: "Hidden from public view",
    hintPt: "Oculto da vista pública",
  },
];

const FIELD_TYPES: Array<{
  type: SignupField["type"];
  labelEn: string;
  labelPt: string;
  descEn: string;
  descPt: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  {
    type: "select",
    labelEn: "Select",
    labelPt: "Seleção",
    descEn: "Dropdown Select Field",
    descPt: "Campo de Seleção",
    icon: "list-outline",
  },
  {
    type: "text",
    labelEn: "Text",
    labelPt: "Texto",
    descEn: "Text Input Field",
    descPt: "Campo de Texto",
    icon: "text-outline",
  },
  {
    type: "number",
    labelEn: "Number",
    labelPt: "Número",
    descEn: "Numeric Input Field",
    descPt: "Campo Numérico",
    icon: "calculator-outline",
  },
  {
    type: "checkbox",
    labelEn: "Checkbox",
    labelPt: "Caixa",
    descEn: "Checkbox / Toggle Field",
    descPt: "Campo de Confirmação",
    icon: "checkbox-outline",
  },
];

export function TournamentSettingsModal({
  visible,
  onClose,
  tournament,
  onUpdateSuccess,
  onDeleteSuccess,
}: TournamentSettingsModalProps) {
  const { user } = useAuth();
  const { locale } = useLanguage();
  const isPt = locale === "pt";
  const isOrganizer = Boolean(
    user?.id && tournament?.organizer_id && user.id === tournament.organizer_id
  );

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [visibility, setVisibility] = useState<"public" | "unlisted" | "private">("public");
  const [maxTeams, setMaxTeams] = useState<string>("16");
  const [courts, setCourts] = useState<string>("1");
  const [saving, setSaving] = useState(false);
  const [savingForm, setSavingForm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [formBuilderExpanded, setFormBuilderExpanded] = useState(true);
  const [signupFields, setSignupFields] = useState<SignupField[]>([]);
  const [previewVisible, setPreviewVisible] = useState(false);

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

      setVisibility(tournament.visibility || "public");
      setMaxTeams(String(tournament.settings?.max_teams ?? 16));
      setCourts(String(tournament.settings?.number_of_courts ?? 1));

      if (Array.isArray(tournament.signup_schema)) {
        setSignupFields(
          tournament.signup_schema.map((f: any, idx: number) => ({
            id: f.id || `field-${idx}-${Date.now()}`,
            label: f.label || "",
            type: f.type || "text",
            required: !!f.required,
            options: Array.isArray(f.options) ? f.options : ["Option 1"],
            placeholder: f.placeholder || "",
            min: f.min !== undefined && f.min !== null ? String(f.min) : "",
            max: f.max !== undefined && f.max !== null ? String(f.max) : "",
            description: f.description || "",
          }))
        );
      } else {
        setSignupFields([]);
      }
    }
  }, [tournament, visible]);

  const handleSaveGeneral = async () => {
    if (!isOrganizer) return;
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
          visibility,
        })
        .eq("id", tournament.id);

      if (error) throw error;

      Alert.alert(
        isPt ? "Sucesso" : "Success",
        isPt ? "Definições do torneio atualizadas." : "Tournament settings updated."
      );
      onUpdateSuccess();
    } catch (err: any) {
      Alert.alert(
        isPt ? "Erro ao Guardar" : "Error Saving",
        err?.message || (isPt ? "Erro ao atualizar definições." : "Failed to update settings.")
      );
    } finally {
      setSaving(false);
    }
  };

  const handleAddField = () => {
    const id = `field_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setSignupFields((prev) => [
      ...prev,
      {
        id,
        label: isPt ? "Novo Campo" : "New Field",
        type: "text",
        required: false,
        options: ["Option 1"],
        placeholder: "",
        min: "",
        max: "",
        description: "",
      },
    ]);
    setFormBuilderExpanded(true);
  };

  const handleUpdateField = (id: string, patch: Partial<SignupField>) => {
    setSignupFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...patch } : f))
    );
  };

  const handleRemoveField = (id: string) => {
    setSignupFields((prev) => prev.filter((f) => f.id !== id));
  };

  const handleSaveFormConfig = async () => {
    if (!isOrganizer) return;
    setSavingForm(true);
    try {
      const sanitized = signupFields.map((f) => ({
        id: f.id,
        label: f.label.trim() || (isPt ? "Campo" : "Field"),
        type: f.type,
        required: f.required,
        ...(f.type === "select"
          ? { options: (f.options || []).filter((o) => o.trim().length > 0) }
          : {}),
        ...(f.type === "text" && f.placeholder ? { placeholder: f.placeholder } : {}),
        ...(f.type === "number"
          ? {
              min: f.min !== "" && !isNaN(Number(f.min)) ? Number(f.min) : undefined,
              max: f.max !== "" && !isNaN(Number(f.max)) ? Number(f.max) : undefined,
            }
          : {}),
        ...(f.type === "checkbox" && f.description
          ? { description: f.description }
          : {}),
      }));

      const { error } = await supabase
        .from("tournaments")
        .update({ signup_schema: sanitized })
        .eq("id", tournament.id);

      if (error) throw error;

      Alert.alert(
        isPt ? "Sucesso" : "Success",
        isPt ? "Formulário de inscrição guardado." : "Signup form configuration saved."
      );
      onUpdateSuccess();
    } catch (err: any) {
      Alert.alert(
        isPt ? "Erro ao Guardar" : "Error Saving",
        err?.message || (isPt ? "Erro ao guardar formulário." : "Failed to save form config.")
      );
    } finally {
      setSavingForm(false);
    }
  };

  const handleDelete = () => {
    if (!isOrganizer) return;
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

  const activeVisMeta =
    VISIBILITY_OPTIONS.find((v) => v.key === visibility) || VISIBILITY_OPTIONS[0];

  if (!isOrganizer) {
    return null;
  }

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
            <Text style={styles.headerTitle}>
              {isPt ? "Definições do Torneio" : "Tournament Settings"}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              testID="close-tournament-settings-modal"
              disabled={saving || savingForm || deleting}
            >
              <Ionicons name="close" size={18} color={ScoreBoardTheme.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Card 1: General Configuration */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionHeading}>
                {isPt ? "Configuração Geral" : "General Configuration"}
              </Text>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>
                  {isPt ? "Data de Início do Torneio" : "Tournament Start Date"}
                </Text>
                <View style={styles.inputWithIcon}>
                  <TextInput
                    style={styles.inputInner}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={ScoreBoardTheme.textMuted}
                    value={startDate}
                    onChangeText={setStartDate}
                    editable={!saving && !deleting}
                    testID="settings-start-date-input"
                  />
                  <Ionicons
                    name="calendar-outline"
                    size={16}
                    color={ScoreBoardTheme.textMuted}
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>
                  {isPt ? "Data de Fim do Torneio" : "Tournament End Date"}
                </Text>
                <View style={styles.inputWithIcon}>
                  <TextInput
                    style={styles.inputInner}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={ScoreBoardTheme.textMuted}
                    value={endDate}
                    onChangeText={setEndDate}
                    editable={!saving && !deleting}
                    testID="settings-end-date-input"
                  />
                  <Ionicons
                    name="calendar-outline"
                    size={16}
                    color={ScoreBoardTheme.textMuted}
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>
                  {isPt ? "Número de Campos Disponíveis" : "Number of Available Courts"}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="1"
                  placeholderTextColor={ScoreBoardTheme.textMuted}
                  value={courts}
                  onChangeText={setCourts}
                  keyboardType="numeric"
                  editable={!saving && !deleting}
                  testID="settings-courts-input"
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>
                  {isPt ? "Visibilidade do Torneio" : "Tournament Visibility"}
                </Text>
                <View style={styles.segmentedTrack}>
                  {VISIBILITY_OPTIONS.map((v) => {
                    const isSelected = visibility === v.key;
                    return (
                      <TouchableOpacity
                        key={v.key}
                        style={[
                          styles.segmentedBtn,
                          isSelected && styles.segmentedBtnActive,
                        ]}
                        onPress={() => setVisibility(v.key)}
                        disabled={saving || deleting}
                        testID={`settings-visibility-${v.key}`}
                        activeOpacity={0.75}
                      >
                        <Text
                          style={[
                            styles.segmentedText,
                            isSelected && styles.segmentedTextActive,
                          ]}
                        >
                          {isPt ? v.labelPt : v.labelEn}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <Text style={styles.helperText}>
                  {isPt ? activeVisMeta.hintPt : activeVisMeta.hintEn}
                </Text>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>
                  {isPt ? "Número Máximo de Equipas" : "Maximum Number of Teams"}
                </Text>
                <View style={styles.maxTeamsSaveRow}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="16"
                    placeholderTextColor={ScoreBoardTheme.textMuted}
                    value={maxTeams}
                    onChangeText={setMaxTeams}
                    keyboardType="numeric"
                    editable={!saving && !deleting}
                    testID="settings-max-teams-input"
                  />
                  <TouchableOpacity
                    style={styles.primaryBtn}
                    onPress={handleSaveGeneral}
                    disabled={saving || deleting}
                    testID="settings-save-btn"
                    activeOpacity={0.8}
                  >
                    {saving ? (
                      <ActivityIndicator
                        size="small"
                        color={ScoreBoardTheme.surfaceContainerLowest}
                      />
                    ) : (
                      <Text style={styles.primaryBtnText}>
                        {isPt ? "Guardar" : "Save Settings"}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Card 2: Signup Form Builder */}
            <View style={styles.sectionCard}>
              <View style={styles.builderHeader}>
                <View style={styles.builderTitleWrap}>
                  <View style={styles.builderTitleRow}>
                    <Text style={styles.sectionHeading}>
                      {isPt ? "Formulário de Inscrição" : "Signup Form Builder"}
                    </Text>
                    <View style={styles.countBadge}>
                      <Text style={styles.countBadgeText}>
                        {signupFields.length}{" "}
                        {isPt
                          ? signupFields.length === 1
                            ? "campo"
                            : "campos"
                          : signupFields.length === 1
                          ? "field"
                          : "fields"}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.builderSubtitle}>
                    {isPt
                      ? "Configura campos de inscrição, respostas obrigatórias e opções para participantes."
                      : "Configure registration fields, required responses, and options for participants."}
                  </Text>
                </View>
              </View>

              <View style={styles.builderActionsBar}>
                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={handleAddField}
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name="add"
                    size={16}
                    color={ScoreBoardTheme.onSurface}
                  />
                  <Text style={styles.secondaryBtnText}>
                    {isPt ? "Adicionar Campo" : "Add Field"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.collapseIconBtn}
                  onPress={() => setFormBuilderExpanded((prev) => !prev)}
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name={formBuilderExpanded ? "chevron-up" : "chevron-down"}
                    size={16}
                    color={ScoreBoardTheme.onSurfaceVariant}
                  />
                </TouchableOpacity>
              </View>

              {formBuilderExpanded && (
                <View style={styles.builderBody}>
                  {signupFields.length === 0 ? (
                    <Text style={styles.emptyFieldsText}>
                      {isPt
                        ? "Nenhum campo personalizado adicionado."
                        : "No custom signup fields configured yet."}
                    </Text>
                  ) : (
                    signupFields.map((field) => {
                      const typeMeta =
                        FIELD_TYPES.find((ft) => ft.type === field.type) ||
                        FIELD_TYPES[1];

                      return (
                        <View key={field.id} style={styles.fieldCard}>
                          {/* Field Card Header */}
                          <View style={styles.fieldCardHeader}>
                            <View style={styles.fieldCardLeft}>
                              <View style={styles.fieldTypeIconBox}>
                                <Ionicons
                                  name={typeMeta.icon}
                                  size={16}
                                  color={ScoreBoardTheme.onSurfaceVariant}
                                />
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.fieldCardTitle} numberOfLines={2}>
                                  {field.label || (isPt ? "Campo" : "Untitled Field")}
                                </Text>
                                <Text style={styles.fieldCardSubtitle}>
                                  {isPt ? typeMeta.descPt : typeMeta.descEn}
                                </Text>
                              </View>
                            </View>

                            <View style={styles.fieldCardControls}>
                              <View style={styles.requiredWrap}>
                                <Text style={styles.requiredLabel}>
                                  {isPt ? "Obrigatório" : "Required"}
                                </Text>
                                <Switch
                                  value={field.required}
                                  onValueChange={(val) =>
                                    handleUpdateField(field.id, { required: val })
                                  }
                                  trackColor={{
                                    false: "#1f2533",
                                    true: ScoreBoardTheme.onSurface,
                                  }}
                                  thumbColor={
                                    field.required
                                      ? ScoreBoardTheme.surfaceContainerLowest
                                      : "#a3a9b8"
                                  }
                                />
                              </View>
                              <TouchableOpacity
                                style={styles.fieldDeleteBtn}
                                onPress={() => handleRemoveField(field.id)}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              >
                                <Ionicons
                                  name="trash-outline"
                                  size={16}
                                  color={ScoreBoardTheme.textMuted}
                                />
                              </TouchableOpacity>
                            </View>
                          </View>

                          {/* Field Label */}
                          <View style={styles.fieldGroup}>
                            <Text style={styles.label}>
                              {isPt ? "Nome do Campo" : "Field Label"}
                            </Text>
                            <TextInput
                              style={styles.input}
                              value={field.label}
                              onChangeText={(txt) =>
                                handleUpdateField(field.id, { label: txt })
                              }
                              placeholder={isPt ? "Ex.: Tamanho" : "e.g. T-Shirt Size"}
                              placeholderTextColor={ScoreBoardTheme.textMuted}
                            />
                          </View>

                          {/* Field Type */}
                          <View style={styles.fieldGroup}>
                            <Text style={styles.label}>
                              {isPt ? "Tipo de Campo" : "Field Type"}
                            </Text>
                            <View style={styles.typePillsRow}>
                              {FIELD_TYPES.map((ft) => {
                                const active = field.type === ft.type;
                                return (
                                  <TouchableOpacity
                                    key={ft.type}
                                    style={[
                                      styles.typePill,
                                      active && styles.typePillActive,
                                    ]}
                                    onPress={() =>
                                      handleUpdateField(field.id, { type: ft.type })
                                    }
                                    activeOpacity={0.75}
                                  >
                                    <Text
                                      style={[
                                        styles.typePillText,
                                        active && styles.typePillTextActive,
                                      ]}
                                    >
                                      {isPt ? ft.labelPt : ft.labelEn}
                                    </Text>
                                  </TouchableOpacity>
                                );
                              })}
                            </View>
                          </View>

                          {/* Type-specific inputs */}
                          {field.type === "select" && (
                            <View style={styles.fieldGroup}>
                              <Text style={styles.label}>
                                {isPt ? "Opções" : "Options"}
                              </Text>
                              <View style={styles.optionsList}>
                                {(field.options || []).map((opt, oIdx) => (
                                  <View key={oIdx} style={styles.optionRow}>
                                    <TextInput
                                      style={[styles.input, { flex: 1 }]}
                                      value={opt}
                                      onChangeText={(txt) => {
                                        const next = [...(field.options || [])];
                                        next[oIdx] = txt;
                                        handleUpdateField(field.id, { options: next });
                                      }}
                                      placeholder={`${isPt ? "Opção" : "Option"} ${oIdx + 1}`}
                                      placeholderTextColor={ScoreBoardTheme.textMuted}
                                    />
                                    <TouchableOpacity
                                      style={styles.optionRemoveBtn}
                                      onPress={() => {
                                        const next = (field.options || []).filter(
                                          (_, i) => i !== oIdx
                                        );
                                        handleUpdateField(field.id, { options: next });
                                      }}
                                    >
                                      <Ionicons
                                        name="close"
                                        size={16}
                                        color={ScoreBoardTheme.textMuted}
                                      />
                                    </TouchableOpacity>
                                  </View>
                                ))}
                                <TouchableOpacity
                                  style={styles.addOptionBtn}
                                  onPress={() =>
                                    handleUpdateField(field.id, {
                                      options: [
                                        ...(field.options || []),
                                        `${isPt ? "Opção" : "Option"} ${(field.options?.length || 0) + 1}`,
                                      ],
                                    })
                                  }
                                >
                                  <Ionicons
                                    name="add-circle-outline"
                                    size={15}
                                    color={ScoreBoardTheme.onSurfaceVariant}
                                  />
                                  <Text style={styles.addOptionText}>
                                    {isPt ? "Adicionar Opção" : "Add Option"}
                                  </Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          )}

                          {field.type === "text" && (
                            <View style={styles.fieldGroup}>
                              <Text style={styles.label}>
                                {isPt ? "Texto de Exemplo" : "Placeholder Text"}
                              </Text>
                              <TextInput
                                style={styles.input}
                                value={field.placeholder || ""}
                                onChangeText={(txt) =>
                                  handleUpdateField(field.id, { placeholder: txt })
                                }
                                placeholder={isPt ? "Ex.: cartão de cidadão" : "e.g. ID number"}
                                placeholderTextColor={ScoreBoardTheme.textMuted}
                              />
                            </View>
                          )}

                          {field.type === "number" && (
                            <View style={styles.row}>
                              <View style={[styles.fieldGroup, { flex: 1 }]}>
                                <Text style={styles.label}>Min</Text>
                                <TextInput
                                  style={styles.input}
                                  value={field.min || ""}
                                  onChangeText={(txt) =>
                                    handleUpdateField(field.id, { min: txt })
                                  }
                                  keyboardType="numeric"
                                  placeholder="0"
                                  placeholderTextColor={ScoreBoardTheme.textMuted}
                                />
                              </View>
                              <View style={[styles.fieldGroup, { flex: 1 }]}>
                                <Text style={styles.label}>Max</Text>
                                <TextInput
                                  style={styles.input}
                                  value={field.max || ""}
                                  onChangeText={(txt) =>
                                    handleUpdateField(field.id, { max: txt })
                                  }
                                  keyboardType="numeric"
                                  placeholder="10"
                                  placeholderTextColor={ScoreBoardTheme.textMuted}
                                />
                              </View>
                            </View>
                          )}

                          {field.type === "checkbox" && (
                            <View style={styles.fieldGroup}>
                              <Text style={styles.label}>
                                {isPt ? "Descrição / Subtexto" : "Description / Subtext"}
                              </Text>
                              <TextInput
                                style={[styles.input, styles.textArea]}
                                value={field.description || ""}
                                onChangeText={(txt) =>
                                  handleUpdateField(field.id, { description: txt })
                                }
                                multiline
                                placeholder={
                                  isPt
                                    ? "Texto explicativo para a caixa de seleção..."
                                    : "Check this box if..."
                                }
                                placeholderTextColor={ScoreBoardTheme.textMuted}
                              />
                            </View>
                          )}
                        </View>
                      );
                    })
                  )}

                  {/* Builder Footer */}
                  <View style={styles.builderFooter}>
                    <Text style={styles.builderFooterTitle}>
                      {isPt ? "Configuração Concluída?" : "Configuration Complete?"}
                    </Text>
                    <Text style={styles.builderFooterSubtitle}>
                      {isPt
                        ? "Guarda as alterações para atualizar o portal de inscrição."
                        : "Save your changes to update the live registration portal."}
                    </Text>
                    <View style={styles.builderFooterBtns}>
                      <TouchableOpacity
                        style={[styles.secondaryBtn, { flex: 1 }]}
                        onPress={() => setPreviewVisible(true)}
                        activeOpacity={0.75}
                      >
                        <Text style={styles.secondaryBtnText}>
                          {isPt ? "Pré-visualizar" : "Preview Form"}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.primaryBtn, { flex: 1 }]}
                        onPress={handleSaveFormConfig}
                        disabled={savingForm}
                        activeOpacity={0.8}
                      >
                        {savingForm ? (
                          <ActivityIndicator
                            size="small"
                            color={ScoreBoardTheme.surfaceContainerLowest}
                          />
                        ) : (
                          <Text style={styles.primaryBtnText}>
                            {isPt ? "Guardar Formulário" : "Save Form Config"}
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}
            </View>

            {/* Card 3: Danger Zone */}
            <View style={styles.dangerZone}>
              <Text style={styles.dangerTitle}>
                {isPt ? "Zona de Perigo" : "Danger Zone"}
              </Text>
              <Text style={styles.dangerDesc}>
                {isPt
                  ? "Eliminar um torneio é uma ação permanente. Todos os jogos, equipas e pontuações históricas serão apagados."
                  : "Deleting a tournament is a permanent action. All matches, team rosters, and historical scores will be erased permanently."}
              </Text>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={handleDelete}
                disabled={saving || deleting}
                testID="settings-delete-tournament-btn"
                activeOpacity={0.8}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons
                      name="trash-outline"
                      size={16}
                      color="#ffffff"
                      style={{ marginRight: 8 }}
                    />
                    <Text style={styles.deleteBtnText}>
                      {isPt
                        ? "Eliminar Torneio Permanentemente"
                        : "Permanently Delete Tournament"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      {/* Form Preview Modal */}
      <Modal
        visible={previewVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewVisible(false)}
      >
        <View style={styles.previewOverlay}>
          <View style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewTitle}>
                {isPt ? "Pré-visualização do Formulário" : "Form Preview"}
              </Text>
              <TouchableOpacity onPress={() => setPreviewVisible(false)}>
                <Ionicons name="close" size={20} color={ScoreBoardTheme.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 340 }} contentContainerStyle={{ gap: 10 }}>
              {signupFields.length === 0 ? (
                <Text style={styles.helperText}>
                  {isPt ? "Sem campos configurados." : "No custom fields configured."}
                </Text>
              ) : (
                signupFields.map((f) => (
                  <View key={f.id} style={styles.previewField}>
                    <Text style={styles.previewFieldLabel}>
                      {f.label} {f.required ? "*" : ""}
                    </Text>
                    <Text style={styles.previewFieldMeta}>
                      {f.type === "select"
                        ? (f.options || []).join(" · ")
                        : f.description || f.placeholder || f.type}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(7, 8, 13, 0.85)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: ScoreBoardTheme.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    maxHeight: "92%",
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: ScoreBoardTheme.borderSubtle,
    backgroundColor: ScoreBoardTheme.surfaceContainer,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: ScoreBoardTheme.onSurface,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: ScoreBoardTheme.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    flexGrow: 0,
  },
  bodyContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 32,
  },
  sectionCard: {
    backgroundColor: ScoreBoardTheme.surfaceContainer,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    padding: 16,
    gap: 14,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: "600",
    color: ScoreBoardTheme.onSurface,
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: "500",
    color: ScoreBoardTheme.onSurfaceVariant,
  },
  input: {
    backgroundColor: ScoreBoardTheme.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: ScoreBoardTheme.onSurface,
    fontSize: 13,
  },
  textArea: {
    minHeight: 64,
    textAlignVertical: "top",
  },
  inputWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: ScoreBoardTheme.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  inputInner: {
    flex: 1,
    paddingVertical: 10,
    color: ScoreBoardTheme.onSurface,
    fontSize: 13,
  },
  segmentedTrack: {
    flexDirection: "row",
    backgroundColor: ScoreBoardTheme.surfaceContainerLowest,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    padding: 4,
    gap: 4,
  },
  segmentedBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentedBtnActive: {
    backgroundColor: ScoreBoardTheme.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
  },
  segmentedText: {
    fontSize: 11,
    fontWeight: "600",
    color: ScoreBoardTheme.textMuted,
    letterSpacing: 0.4,
  },
  segmentedTextActive: {
    color: ScoreBoardTheme.onSurface,
  },
  helperText: {
    fontSize: 11,
    color: ScoreBoardTheme.textMuted,
  },
  maxTeamsSaveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  primaryBtn: {
    backgroundColor: ScoreBoardTheme.onSurface,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    color: ScoreBoardTheme.surfaceContainerLowest,
    fontSize: 13,
    fontWeight: "600",
  },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: ScoreBoardTheme.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  secondaryBtnText: {
    color: ScoreBoardTheme.onSurface,
    fontSize: 12,
    fontWeight: "600",
  },
  builderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  builderTitleWrap: {
    flex: 1,
    gap: 4,
  },
  builderTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  countBadge: {
    backgroundColor: ScoreBoardTheme.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: ScoreBoardTheme.onSurfaceVariant,
  },
  builderSubtitle: {
    fontSize: 12,
    lineHeight: 17,
    color: ScoreBoardTheme.textMuted,
  },
  builderActionsBar: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 8,
  },
  collapseIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: ScoreBoardTheme.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  builderBody: {
    gap: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: ScoreBoardTheme.borderSubtle,
  },
  emptyFieldsText: {
    fontSize: 12,
    color: ScoreBoardTheme.textMuted,
    textAlign: "center",
    paddingVertical: 12,
  },
  fieldCard: {
    backgroundColor: ScoreBoardTheme.surfaceContainerLowest,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    padding: 12,
    gap: 10,
  },
  fieldCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  fieldCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  fieldTypeIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: ScoreBoardTheme.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  fieldCardTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: ScoreBoardTheme.onSurface,
  },
  fieldCardSubtitle: {
    fontSize: 11,
    color: ScoreBoardTheme.textMuted,
  },
  fieldCardControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  requiredWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  requiredLabel: {
    fontSize: 11,
    color: ScoreBoardTheme.onSurfaceVariant,
  },
  fieldDeleteBtn: {
    padding: 4,
  },
  typePillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  typePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: ScoreBoardTheme.surfaceContainer,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
  },
  typePillActive: {
    backgroundColor: ScoreBoardTheme.surfaceContainerHigh,
    borderColor: ScoreBoardTheme.onSurfaceVariant,
  },
  typePillText: {
    fontSize: 11,
    fontWeight: "600",
    color: ScoreBoardTheme.textMuted,
  },
  typePillTextActive: {
    color: ScoreBoardTheme.onSurface,
  },
  optionsList: {
    gap: 8,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  optionRemoveBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: ScoreBoardTheme.surfaceContainer,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  addOptionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
  },
  addOptionText: {
    fontSize: 12,
    fontWeight: "500",
    color: ScoreBoardTheme.onSurfaceVariant,
  },
  row: {
    flexDirection: "row",
    gap: 10,
  },
  builderFooter: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: ScoreBoardTheme.borderSubtle,
    gap: 8,
  },
  builderFooterTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: ScoreBoardTheme.onSurface,
  },
  builderFooterSubtitle: {
    fontSize: 11,
    color: ScoreBoardTheme.textMuted,
  },
  builderFooterBtns: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  dangerZone: {
    backgroundColor: "rgba(229, 72, 77, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(229, 72, 77, 0.25)",
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  dangerTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#e5484d",
  },
  dangerDesc: {
    fontSize: 12,
    color: ScoreBoardTheme.textMuted,
    lineHeight: 18,
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e5484d",
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 2,
  },
  deleteBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#ffffff",
  },
  previewOverlay: {
    flex: 1,
    backgroundColor: "rgba(7, 8, 13, 0.82)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  previewCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: ScoreBoardTheme.surfaceContainer,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    padding: 16,
    gap: 12,
  },
  previewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  previewTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: ScoreBoardTheme.onSurface,
  },
  previewField: {
    backgroundColor: ScoreBoardTheme.surfaceContainerLowest,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    padding: 10,
    gap: 2,
  },
  previewFieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: ScoreBoardTheme.onSurface,
  },
  previewFieldMeta: {
    fontSize: 11,
    color: ScoreBoardTheme.textMuted,
  },
});
