import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  Modal,
  Switch,
  ActivityIndicator,
  Share,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { TopBar } from "@/components/TopBar";
import { AuthModal } from "@/components/AuthModal";
import { useAuth } from "@/components/AuthProvider";
import { useTranslation, Locale } from "@/lib/i18n";
import { supabase } from "@/lib/supabase/client";
import { ScoreBoardTheme } from "@/constants/theme";
import { validatePassword } from "@/lib/auth/passwordValidation";
import { mapErrorToUserMessage } from "@/lib/errors/mapError";
import { en, pt } from "@/lib/i18n";
import { SUPPORTED_SPORTS } from "@/lib/sports";

const SPORTS_LIST = [
  { id: "all", labelEn: en.sports.all, labelPt: pt.sports.all },
  ...SUPPORTED_SPORTS.map((s) => ({
    id: s.slug,
    labelEn: en.sports[s.i18nKey],
    labelPt: pt.sports[s.i18nKey],
  })),
];

export default function ProfileScreen() {
  const { t, locale, setLocale } = useTranslation();
  const { user, signOut } = useAuth();
  const router = useRouter();

  const [authModalVisible, setAuthModalVisible] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);

  // Profile fields
  const [username, setUsername] = useState("");
  const [initialUsername, setInitialUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [initialDisplayName, setInitialDisplayName] = useState("");
  const [subscriptionTier, setSubscriptionTier] = useState("free");
  const [savingProfile, setSavingProfile] = useState(false);

  // Preferences fields
  const [defaultSport, setDefaultSport] = useState("all");
  const [sportModalVisible, setSportModalVisible] = useState(false);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [savingPreferences, setSavingPreferences] = useState(false);

  // Notification preferences
  const [notifAllEnabled, setNotifAllEnabled] = useState(true);
  const [notifUmpireInvited, setNotifUmpireInvited] = useState(true);
  const [notifMatchStarted, setNotifMatchStarted] = useState(true);
  const [notifMatchEnded, setNotifMatchEnded] = useState(true);
  const [notifTennisEnabled, setNotifTennisEnabled] = useState(true);
  const [notifTennisSets, setNotifTennisSets] = useState(true);
  const [notifTennisGames, setNotifTennisGames] = useState(false);
  const [notifVolleyEnabled, setNotifVolleyEnabled] = useState(true);
  const [notifVolleySets, setNotifVolleySets] = useState(true);
  const [notifVolleyPoints, setNotifVolleyPoints] = useState(false);
  const [notifFootballEnabled, setNotifFootballEnabled] = useState(true);
  const [notifFootballGoals, setNotifFootballGoals] = useState(true);
  const [notifFootballCards, setNotifFootballCards] = useState(true);
  const [notifBasketballEnabled, setNotifBasketballEnabled] = useState(true);
  const [notifBasketballPoints, setNotifBasketballPoints] = useState(true);
  const [notifBasketballQuarters, setNotifBasketballQuarters] = useState(true);

  // Security & Password fields
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // GDPR Data Export
  const [exportingData, setExportingData] = useState(false);

  // GDPR Account Deletion
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const loadUserData = async () => {
      setProfileLoading(true);
      try {
        const { data, error } = await supabase
          .from("users")
          .select("username, display_name, subscription_tier, preferences")
          .eq("id", user.id)
          .maybeSingle();

        if (!error && data) {
          const userHandle = data.username || "";
          const userDisplay = data.display_name || userHandle;
          setUsername(userHandle);
          setInitialUsername(userHandle);
          setDisplayName(userDisplay);
          setInitialDisplayName(userDisplay);
          setSubscriptionTier(data.subscription_tier || "free");

          const prefs = data.preferences || {};
          if (prefs.language && (prefs.language === "en" || prefs.language === "pt")) {
            setLocale(prefs.language);
          }
          setDefaultSport(prefs.default_sport || "all");
          setHapticsEnabled(prefs.haptics_enabled !== false);
          setSoundEnabled(prefs.sound_enabled !== false);

          const notif = prefs.notifications || {};
          setNotifAllEnabled(notif.enabled !== false);
          setNotifUmpireInvited(notif.umpire_invited !== false);
          setNotifMatchStarted(notif.match_started !== false);
          setNotifMatchEnded(notif.match_ended !== false);
          setNotifTennisEnabled(notif.tennis_padel_enabled !== false);
          setNotifTennisSets(
            notif.tennis_padel_sets !== undefined
              ? notif.tennis_padel_sets
              : notif.tennis_padel_granularity !== "none"
          );
          setNotifTennisGames(
            notif.tennis_padel_games !== undefined
              ? notif.tennis_padel_games
              : notif.tennis_padel_granularity === "game"
          );
          setNotifVolleyEnabled(notif.volleyball_enabled !== false);
          setNotifVolleySets(
            notif.volleyball_sets !== undefined
              ? notif.volleyball_sets
              : notif.volleyball_granularity !== "none"
          );
          setNotifVolleyPoints(
            notif.volleyball_points !== undefined
              ? notif.volleyball_points
              : notif.volleyball_granularity === "point"
          );
          setNotifFootballEnabled(notif.football_enabled !== false);
          setNotifFootballGoals(notif.football_goals !== false);
          setNotifFootballCards(notif.football_cards !== false);
          setNotifBasketballEnabled(notif.basketball_enabled !== false);
          setNotifBasketballPoints(notif.basketball_points !== false);
          setNotifBasketballQuarters(notif.basketball_quarters !== false);
        }
      } catch (err) {
        console.error("Error loading profile:", err);
      } finally {
        setProfileLoading(false);
      }
    };

    loadUserData();
  }, [user?.id]);

  const triggerHaptic = async () => {
    if (hapticsEnabled) {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (e) {
        // Haptics unavailable on simulator/web
      }
    }
  };

  // Profile Save
  const handleSaveProfile = async () => {
    if (!user) return;
    const trimmedUsername = username.trim().toLowerCase();
    const trimmedDisplayName = displayName.trim();

    if (!trimmedUsername) {
      Alert.alert(
        locale === "pt" ? "Aviso" : "Warning",
        t("settings.profile.errorEmptyUsername")
      );
      return;
    }

    if (
      trimmedUsername === initialUsername.toLowerCase() &&
      trimmedDisplayName === initialDisplayName
    ) {
      Alert.alert(
        locale === "pt" ? "Informação" : "Info",
        locale === "pt" ? "Sem alterações para guardar" : "No changes to save"
      );
      return;
    }

    setSavingProfile(true);
    triggerHaptic();

    try {
      if (trimmedUsername !== initialUsername.toLowerCase()) {
        const { data: existingUser } = await supabase
          .from("users")
          .select("id")
          .ilike("username", trimmedUsername)
          .neq("id", user.id)
          .maybeSingle();

        if (existingUser) {
          Alert.alert(
            locale === "pt" ? "Erro" : "Error",
            t("settings.profile.errorUsernameTaken")
          );
          setSavingProfile(false);
          return;
        }
      }

      const { error } = await supabase
        .from("users")
        .update({
          username: trimmedUsername,
          display_name: trimmedDisplayName || trimmedUsername,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) {
        Alert.alert(locale === "pt" ? "Erro" : "Error", mapErrorToUserMessage(error, locale));
      } else {
        setInitialUsername(trimmedUsername);
        setUsername(trimmedUsername);
        setInitialDisplayName(trimmedDisplayName || trimmedUsername);
        setDisplayName(trimmedDisplayName || trimmedUsername);
        Alert.alert(
          locale === "pt" ? "Sucesso" : "Success",
          t("settings.profile.success")
        );
      }
    } catch (err: any) {
      Alert.alert(locale === "pt" ? "Erro" : "Error", mapErrorToUserMessage(err, locale, "Failed to update profile"));
    } finally {
      setSavingProfile(false);
    }
  };

  // Preferences Save
  const handleSavePreferences = async (newLocale?: Locale) => {
    if (!user) return;
    setSavingPreferences(true);
    triggerHaptic();

    const targetLocale = newLocale || locale;
    try {
      const prefsPayload = {
        language: targetLocale,
        default_sport: defaultSport === "all" ? null : defaultSport,
        haptics_enabled: hapticsEnabled,
        sound_enabled: soundEnabled,
        notifications: {
          enabled: notifAllEnabled,
          umpire_invited: notifUmpireInvited,
          match_started: notifMatchStarted,
          match_ended: notifMatchEnded,
          tennis_padel_enabled: notifTennisEnabled,
          tennis_padel_sets: notifTennisSets,
          tennis_padel_games: notifTennisGames,
          volleyball_enabled: notifVolleyEnabled,
          volleyball_sets: notifVolleySets,
          volleyball_points: notifVolleyPoints,
          football_enabled: notifFootballEnabled,
          football_goals: notifFootballGoals,
          football_cards: notifFootballCards,
          basketball_enabled: notifBasketballEnabled,
          basketball_points: notifBasketballPoints,
          basketball_quarters: notifBasketballQuarters,
        },
      };

      const { error } = await supabase
        .from("users")
        .update({
          preferences: prefsPayload,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) {
        Alert.alert(locale === "pt" ? "Erro" : "Error", mapErrorToUserMessage(error, locale));
      } else {
        if (newLocale) setLocale(newLocale);
        Alert.alert(
          locale === "pt" ? "Sucesso" : "Success",
          t("settings.preferences.saved")
        );
      }
    } catch (err: any) {
      Alert.alert(locale === "pt" ? "Erro" : "Error", mapErrorToUserMessage(err, locale, "Failed to save preferences"));
    } finally {
      setSavingPreferences(false);
    }
  };

  // Password Update
  const handleUpdatePassword = async () => {
    if (!user) return;

    if (!currentPassword) {
      Alert.alert(
        locale === "pt" ? "Aviso" : "Warning",
        t("settings.security.currentPasswordRequired")
      );
      return;
    }

    setUpdatingPassword(true);
    try {
      if (user.email) {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: currentPassword,
        });

        if (authError) {
          Alert.alert(
            locale === "pt" ? "Aviso" : "Warning",
            t("settings.security.currentPasswordIncorrect")
          );
          setUpdatingPassword(false);
          return;
        }
      }

      const validation = validatePassword(newPassword);
      if (!validation.isValid) {
        Alert.alert(
          locale === "pt" ? "Aviso" : "Warning",
          t("settings.security.passwordLength")
        );
        setUpdatingPassword(false);
        return;
      }

      if (newPassword !== confirmPassword) {
        Alert.alert(
          locale === "pt" ? "Aviso" : "Warning",
          t("settings.security.passwordMismatch")
        );
        setUpdatingPassword(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        Alert.alert(locale === "pt" ? "Erro" : "Error", mapErrorToUserMessage(error, locale));
      } else {
        await supabase.auth.signOut({ scope: "others" }).catch(() => {});
        setPasswordModalVisible(false);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        Alert.alert(
          locale === "pt" ? "Sucesso" : "Success",
          t("settings.security.passwordUpdated")
        );
      }
    } catch (err: any) {
      Alert.alert(locale === "pt" ? "Erro" : "Error", mapErrorToUserMessage(err, locale, "Password update failed"));
    } finally {
      setUpdatingPassword(false);
    }
  };

  // GDPR Data Portability (Article 20)
  const handleExportData = async () => {
    if (!user) return;
    setExportingData(true);
    triggerHaptic();

    try {
      const { data, error } = await supabase.rpc("export_user_data");
      if (error) {
        Alert.alert(locale === "pt" ? "Erro" : "Error", mapErrorToUserMessage(error, locale));
        return;
      }

      const formattedJson = JSON.stringify(data, null, 2);
      await Share.share({
        title: "ScoreBoard Data Export",
        message: formattedJson,
      });
    } catch (err: any) {
      Alert.alert(locale === "pt" ? "Erro" : "Error", mapErrorToUserMessage(err, locale, "Export failed"));
    } finally {
      setExportingData(false);
    }
  };

  // GDPR Soft-Delete (Article 17)
  const handleDeleteAccount = async () => {
    if (!user) return;
    setDeleteError(null);

    if (deleteConfirmText.trim().toUpperCase() !== "DELETE") {
      setDeleteError(
        locale === "pt"
          ? "Escreve DELETE para confirmar."
          : "Please type DELETE to confirm."
      );
      return;
    }

    setIsDeleting(true);
    triggerHaptic();

    try {
      const { error } = await supabase.rpc("delete_user_account");
      if (error) {
        setDeleteError(mapErrorToUserMessage(error, locale));
        setIsDeleting(false);
        return;
      }

      setDeleteModalVisible(false);
      Alert.alert(
        locale === "pt" ? "Conta Eliminada" : "Account Deleted",
        t("settings.danger.deleteSuccess"),
        [{ text: "OK", onPress: () => signOut() }]
      );
    } catch (err: any) {
      setDeleteError(mapErrorToUserMessage(err, locale, "Failed to delete account"));
      setIsDeleting(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      t("nav.signOut"),
      locale === "pt"
        ? "Tem a certeza de que pretende sair da sua conta?"
        : "Are you sure you want to sign out?",
      [
        { text: t("common.cancel"), style: "cancel" },
        { text: t("nav.signOut"), style: "destructive", onPress: () => signOut() },
      ]
    );
  };

  const selectedSportObj = SPORTS_LIST.find((s) => s.id === defaultSport) || SPORTS_LIST[0];

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <TopBar />

      <ScrollView contentContainerStyle={styles.content}>
        {/* User Card Header */}
        <View style={styles.userCard}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarText}>
              {(user?.email?.[0] || "U").toUpperCase()}
            </Text>
          </View>

          <View style={styles.userInfo}>
            <Text style={styles.userEmail} numberOfLines={1}>
              {user ? displayName || user.email : locale === "pt" ? "Utilizador Convidado" : "Guest User"}
            </Text>
            <View style={styles.tierBadgeRow}>
              <View
                style={[
                  styles.tierDot,
                  { backgroundColor: subscriptionTier === "pro" ? "#34d399" : ScoreBoardTheme.textMuted },
                ]}
              />
              <Text style={styles.userRole}>
                {user
                  ? `${subscriptionTier.toUpperCase()} PLAN • @${username || "user"}`
                  : locale === "pt"
                  ? "Modo Visitante"
                  : "Guest Mode"}
              </Text>
            </View>
          </View>

          {!user && (
            <TouchableOpacity
              style={styles.loginCardBtn}
              onPress={() => setAuthModalVisible(true)}
            >
              <Text style={styles.loginCardBtnText}>{t("nav.signIn")}</Text>
            </TouchableOpacity>
          )}
        </View>

        {profileLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={ScoreBoardTheme.onSurfaceVariant} />
          </View>
        ) : (
          <>
            {/* Section 1: Profile & Identity (Authenticated Only) */}
            {user && (
              <>
                <Text style={styles.sectionHeader}>{t("settings.tabs.profile")}</Text>
                <View style={styles.sectionCard}>
                  {/* Email Read-only */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>{t("settings.profile.email")}</Text>
                    <TextInput
                      style={[styles.input, styles.inputDisabled]}
                      value={user.email || ""}
                      editable={false}
                    />
                    <Text style={styles.fieldHint}>{t("settings.profile.emailNotice")}</Text>
                  </View>

                  <View style={styles.rowDivider} />

                  {/* Username */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>{t("settings.profile.username")}</Text>
                    <TextInput
                      style={styles.input}
                      value={username}
                      onChangeText={setUsername}
                      placeholder={t("settings.profile.usernamePlaceholder")}
                      placeholderTextColor="#64748b"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>

                  <View style={styles.rowDivider} />

                  {/* Display Name */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>{t("settings.profile.displayName")}</Text>
                    <TextInput
                      style={styles.input}
                      value={displayName}
                      onChangeText={setDisplayName}
                      placeholder={t("settings.profile.displayNamePlaceholder")}
                      placeholderTextColor="#64748b"
                    />
                  </View>

                  {/* Save Profile Button */}
                  <TouchableOpacity
                    style={[styles.primaryButton, savingProfile && styles.buttonDisabled]}
                    onPress={handleSaveProfile}
                    disabled={savingProfile}
                  >
                    {savingProfile ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={styles.primaryButtonText}>
                        {t("settings.profile.saveChanges")}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* Section 2: Preferences */}
            <Text style={styles.sectionHeader}>{t("settings.tabs.preferences")}</Text>
            <View style={styles.sectionCard}>
              {/* Language Selector */}
              <View style={styles.rowItem}>
                <View style={styles.rowLeft}>
                  <Ionicons name="language-outline" size={20} color="#94a3b8" />
                  <Text style={styles.rowLabel}>{t("settings.preferences.language")}</Text>
                </View>
                <View style={styles.langToggleRow}>
                  <TouchableOpacity
                    style={[styles.langPill, locale === "pt" && styles.langPillActive]}
                    onPress={() => {
                      setLocale("pt");
                      if (user) handleSavePreferences("pt");
                    }}
                  >
                    <Text style={[styles.langPillText, locale === "pt" && styles.langPillTextActive]}>
                      PT
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.langPill, locale === "en" && styles.langPillActive]}
                    onPress={() => {
                      setLocale("en");
                      if (user) handleSavePreferences("en");
                    }}
                  >
                    <Text style={[styles.langPillText, locale === "en" && styles.langPillTextActive]}>
                      EN
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.rowDivider} />

              {/* Default Sport Filter */}
              <TouchableOpacity
                style={styles.rowItem}
                onPress={() => setSportModalVisible(true)}
              >
                <View style={styles.rowLeft}>
                  <Ionicons name="trophy-outline" size={20} color="#94a3b8" />
                  <Text style={styles.rowLabel}>{t("settings.preferences.defaultSport")}</Text>
                </View>
                <View style={styles.rowRightClickable}>
                  <Text style={styles.rowValue}>
                    {locale === "pt" ? selectedSportObj.labelPt : selectedSportObj.labelEn}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color="#64748b" />
                </View>
              </TouchableOpacity>

              <View style={styles.rowDivider} />

              {/* Haptic Feedback Toggle */}
              <View style={styles.rowItem}>
                <View style={styles.rowLeft}>
                  <Ionicons name="phone-portrait-outline" size={20} color="#94a3b8" />
                  <View>
                    <Text style={styles.rowLabel}>{t("settings.preferences.hapticFeedback")}</Text>
                    <Text style={styles.rowSubLabel}>{t("settings.preferences.hapticDesc")}</Text>
                  </View>
                </View>
                <Switch
                  value={hapticsEnabled}
                  onValueChange={(val) => {
                    setHapticsEnabled(val);
                    if (val) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  trackColor={{ false: ScoreBoardTheme.surfaceContainerHighest, true: ScoreBoardTheme.onSurfaceVariant }}
                  thumbColor={hapticsEnabled ? ScoreBoardTheme.onSurface : ScoreBoardTheme.textMuted}
                />
              </View>

              <View style={styles.rowDivider} />

              {/* Sound Feedback Toggle */}
              <View style={styles.rowItem}>
                <View style={styles.rowLeft}>
                  <Ionicons name="volume-medium-outline" size={20} color="#94a3b8" />
                  <View>
                    <Text style={styles.rowLabel}>{t("settings.preferences.soundEffects")}</Text>
                    <Text style={styles.rowSubLabel}>{t("settings.preferences.soundDesc")}</Text>
                  </View>
                </View>
                <Switch
                  value={soundEnabled}
                  onValueChange={setSoundEnabled}
                  trackColor={{ false: ScoreBoardTheme.surfaceContainerHighest, true: ScoreBoardTheme.onSurfaceVariant }}
                  thumbColor={soundEnabled ? ScoreBoardTheme.onSurface : ScoreBoardTheme.textMuted}
                />
              </View>

              {user && (
                <TouchableOpacity
                  style={[styles.savePrefsButton, savingPreferences && styles.buttonDisabled]}
                  onPress={() => handleSavePreferences()}
                  disabled={savingPreferences}
                >
                  {savingPreferences ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.savePrefsButtonText}>
                      {t("settings.preferences.savePreferences")}
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            </View>

            {/* Section 2b: Notification Preferences (Authenticated Only) */}
            {user && (
              <>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingRight: 4 }}>
                  <Text style={styles.sectionHeader}>{t("settings.notifications.title")}</Text>
                  <Switch
                    testID="notif-switch-all"
                    value={notifAllEnabled}
                    onValueChange={setNotifAllEnabled}
                    trackColor={{ false: ScoreBoardTheme.surfaceContainerHighest, true: ScoreBoardTheme.onSurfaceVariant }}
                    thumbColor={notifAllEnabled ? ScoreBoardTheme.onSurface : ScoreBoardTheme.textMuted}
                  />
                </View>
                <View style={styles.sectionCard} testID="notification-settings-section">
                  <View
                    style={!notifAllEnabled ? { opacity: 0.45 } : undefined}
                    pointerEvents={notifAllEnabled ? "auto" : "none"}
                  >
                  <Text style={styles.notifSubHeader}>{t("settings.notifications.generalTitle")}</Text>

                  {/* Umpire Invitations */}
                  <View style={styles.rowItem}>
                    <View style={styles.rowLeft}>
                      <Ionicons name="shield-checkmark-outline" size={20} color="#94a3b8" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rowLabel}>{t("settings.notifications.umpireInvited")}</Text>
                        <Text style={styles.rowSubLabel}>{t("settings.notifications.umpireInvitedDesc")}</Text>
                      </View>
                    </View>
                    <Switch
                      testID="notif-switch-umpire"
                      value={notifUmpireInvited}
                      onValueChange={setNotifUmpireInvited}
                      trackColor={{ false: ScoreBoardTheme.surfaceContainerHighest, true: ScoreBoardTheme.onSurfaceVariant }}
                      thumbColor={notifUmpireInvited ? ScoreBoardTheme.onSurface : ScoreBoardTheme.textMuted}
                    />
                  </View>

                  <View style={styles.rowDivider} />

                  {/* Match Started */}
                  <View style={styles.rowItem}>
                    <View style={styles.rowLeft}>
                      <Ionicons name="play-circle-outline" size={20} color="#94a3b8" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rowLabel}>{t("settings.notifications.matchStarted")}</Text>
                        <Text style={styles.rowSubLabel}>{t("settings.notifications.matchStartedDesc")}</Text>
                      </View>
                    </View>
                    <Switch
                      testID="notif-switch-started"
                      value={notifMatchStarted}
                      onValueChange={setNotifMatchStarted}
                      trackColor={{ false: ScoreBoardTheme.surfaceContainerHighest, true: ScoreBoardTheme.onSurfaceVariant }}
                      thumbColor={notifMatchStarted ? ScoreBoardTheme.onSurface : ScoreBoardTheme.textMuted}
                    />
                  </View>

                  <View style={styles.rowDivider} />

                  {/* Match Ended */}
                  <View style={styles.rowItem}>
                    <View style={styles.rowLeft}>
                      <Ionicons name="flag-outline" size={20} color="#94a3b8" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rowLabel}>{t("settings.notifications.matchEnded")}</Text>
                        <Text style={styles.rowSubLabel}>{t("settings.notifications.matchEndedDesc")}</Text>
                      </View>
                    </View>
                    <Switch
                      testID="notif-switch-ended"
                      value={notifMatchEnded}
                      onValueChange={setNotifMatchEnded}
                      trackColor={{ false: ScoreBoardTheme.surfaceContainerHighest, true: ScoreBoardTheme.onSurfaceVariant }}
                      thumbColor={notifMatchEnded ? ScoreBoardTheme.onSurface : ScoreBoardTheme.textMuted}
                    />
                  </View>

                  <View style={styles.rowDivider} />
                  <Text style={styles.notifSubHeader}>{t("settings.notifications.sportSpecificTitle")}</Text>

                  <View>
                    {/* Tennis & Padel */}
                    <View style={[styles.sportCardHeader, { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }]}>
                      <View style={[styles.rowLeft, { flex: 1, paddingRight: 12 }]}>
                        <Ionicons name="tennisball-outline" size={18} color={ScoreBoardTheme.onSurface} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.sportCardHeaderTitle}>{t("settings.notifications.tennisPadel")}</Text>
                          <Text style={styles.rowSubLabel}>{t("settings.notifications.tennisPadelHint")}</Text>
                        </View>
                      </View>
                      <Switch
                        testID="notif-switch-tennis-all"
                        value={notifTennisEnabled}
                        onValueChange={setNotifTennisEnabled}
                        trackColor={{ false: ScoreBoardTheme.surfaceContainer, true: ScoreBoardTheme.onSurfaceVariant }}
                        thumbColor={notifTennisEnabled ? ScoreBoardTheme.onSurface : ScoreBoardTheme.textMuted}
                      />
                    </View>
                    <View
                      style={!notifTennisEnabled ? { opacity: 0.45 } : undefined}
                      pointerEvents={notifTennisEnabled ? "auto" : "none"}
                    >
                  <View style={styles.rowItem}>
                    <View style={{ flex: 1, paddingLeft: 32 }}>
                      <Text style={styles.rowLabel}>{t("settings.notifications.tennisPadelSets")}</Text>
                      <Text style={styles.rowSubLabel}>{t("settings.notifications.tennisPadelSetsDesc")}</Text>
                    </View>
                    <Switch
                      testID="notif-switch-tennis-sets"
                      value={notifTennisSets}
                      onValueChange={setNotifTennisSets}
                      trackColor={{ false: ScoreBoardTheme.surfaceContainerHighest, true: ScoreBoardTheme.onSurfaceVariant }}
                      thumbColor={notifTennisSets ? ScoreBoardTheme.onSurface : ScoreBoardTheme.textMuted}
                    />
                  </View>
                  <View style={styles.rowItem}>
                    <View style={{ flex: 1, paddingLeft: 32 }}>
                      <Text style={styles.rowLabel}>{t("settings.notifications.tennisPadelGames")}</Text>
                      <Text style={styles.rowSubLabel}>{t("settings.notifications.tennisPadelGamesDesc")}</Text>
                    </View>
                    <Switch
                      testID="notif-switch-tennis-games"
                      value={notifTennisGames}
                      onValueChange={setNotifTennisGames}
                      trackColor={{ false: ScoreBoardTheme.surfaceContainerHighest, true: ScoreBoardTheme.onSurfaceVariant }}
                      thumbColor={notifTennisGames ? ScoreBoardTheme.onSurface : ScoreBoardTheme.textMuted}
                    />
                  </View>
                  </View>

                  <View style={styles.rowDivider} />

                  {/* Volleyball */}
                  <View style={[styles.sportCardHeader, { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }]}>
                    <View style={styles.rowLeft}>
                      <Ionicons name="aperture-outline" size={18} color={ScoreBoardTheme.onSurface} />
                      <Text style={styles.sportCardHeaderTitle}>{t("settings.notifications.volleyball")}</Text>
                    </View>
                    <Switch
                      testID="notif-switch-volley-all"
                      value={notifVolleyEnabled}
                      onValueChange={setNotifVolleyEnabled}
                      trackColor={{ false: ScoreBoardTheme.surfaceContainer, true: ScoreBoardTheme.onSurfaceVariant }}
                      thumbColor={notifVolleyEnabled ? ScoreBoardTheme.onSurface : ScoreBoardTheme.textMuted}
                    />
                  </View>
                  <View
                    style={!notifVolleyEnabled ? { opacity: 0.45 } : undefined}
                    pointerEvents={notifVolleyEnabled ? "auto" : "none"}
                  >
                  <View style={styles.rowItem}>
                    <View style={{ flex: 1, paddingLeft: 32 }}>
                      <Text style={styles.rowLabel}>{t("settings.notifications.volleyballSets")}</Text>
                      <Text style={styles.rowSubLabel}>{t("settings.notifications.volleyballSetsDesc")}</Text>
                    </View>
                    <Switch
                      testID="notif-switch-volley-sets"
                      value={notifVolleySets}
                      onValueChange={setNotifVolleySets}
                      trackColor={{ false: ScoreBoardTheme.surfaceContainerHighest, true: ScoreBoardTheme.onSurfaceVariant }}
                      thumbColor={notifVolleySets ? ScoreBoardTheme.onSurface : ScoreBoardTheme.textMuted}
                    />
                  </View>
                  <View style={styles.rowItem}>
                    <View style={{ flex: 1, paddingLeft: 32 }}>
                      <Text style={styles.rowLabel}>{t("settings.notifications.volleyballPoints")}</Text>
                      <Text style={styles.rowSubLabel}>{t("settings.notifications.volleyballPointsDesc")}</Text>
                    </View>
                    <Switch
                      testID="notif-switch-volley-points"
                      value={notifVolleyPoints}
                      onValueChange={setNotifVolleyPoints}
                      trackColor={{ false: ScoreBoardTheme.surfaceContainerHighest, true: ScoreBoardTheme.onSurfaceVariant }}
                      thumbColor={notifVolleyPoints ? ScoreBoardTheme.onSurface : ScoreBoardTheme.textMuted}
                    />
                  </View>
                  </View>

                  <View style={styles.rowDivider} />

                  {/* Football */}
                  <View style={[styles.sportCardHeader, { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }]}>
                    <View style={styles.rowLeft}>
                      <Ionicons name="football-outline" size={18} color={ScoreBoardTheme.onSurface} />
                      <Text style={styles.sportCardHeaderTitle}>{t("settings.notifications.football")}</Text>
                    </View>
                    <Switch
                      testID="notif-switch-football-all"
                      value={notifFootballEnabled}
                      onValueChange={setNotifFootballEnabled}
                      trackColor={{ false: ScoreBoardTheme.surfaceContainer, true: ScoreBoardTheme.onSurfaceVariant }}
                      thumbColor={notifFootballEnabled ? ScoreBoardTheme.onSurface : ScoreBoardTheme.textMuted}
                    />
                  </View>
                  <View
                    style={!notifFootballEnabled ? { opacity: 0.45 } : undefined}
                    pointerEvents={notifFootballEnabled ? "auto" : "none"}
                  >
                  <View style={styles.rowItem}>
                    <View style={{ flex: 1, paddingLeft: 32 }}>
                      <Text style={styles.rowLabel}>{t("settings.notifications.footballGoals")}</Text>
                      <Text style={styles.rowSubLabel}>{t("settings.notifications.footballGoalsDesc")}</Text>
                    </View>
                    <Switch
                      testID="notif-switch-football-goals"
                      value={notifFootballGoals}
                      onValueChange={setNotifFootballGoals}
                      trackColor={{ false: ScoreBoardTheme.surfaceContainerHighest, true: ScoreBoardTheme.onSurfaceVariant }}
                      thumbColor={notifFootballGoals ? ScoreBoardTheme.onSurface : ScoreBoardTheme.textMuted}
                    />
                  </View>
                  <View style={styles.rowItem}>
                    <View style={{ flex: 1, paddingLeft: 32 }}>
                      <Text style={styles.rowLabel}>{t("settings.notifications.footballCards")}</Text>
                      <Text style={styles.rowSubLabel}>{t("settings.notifications.footballCardsDesc")}</Text>
                    </View>
                    <Switch
                      testID="notif-switch-football-cards"
                      value={notifFootballCards}
                      onValueChange={setNotifFootballCards}
                      trackColor={{ false: ScoreBoardTheme.surfaceContainerHighest, true: ScoreBoardTheme.onSurfaceVariant }}
                      thumbColor={notifFootballCards ? ScoreBoardTheme.onSurface : ScoreBoardTheme.textMuted}
                    />
                  </View>
                  </View>

                  <View style={styles.rowDivider} />

                  {/* Basketball */}
                  <View style={[styles.sportCardHeader, { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }]}>
                    <View style={styles.rowLeft}>
                      <Ionicons name="basketball-outline" size={18} color={ScoreBoardTheme.onSurface} />
                      <Text style={styles.sportCardHeaderTitle}>{t("settings.notifications.basketball")}</Text>
                    </View>
                    <Switch
                      testID="notif-switch-basketball-all"
                      value={notifBasketballEnabled}
                      onValueChange={setNotifBasketballEnabled}
                      trackColor={{ false: ScoreBoardTheme.surfaceContainer, true: ScoreBoardTheme.onSurfaceVariant }}
                      thumbColor={notifBasketballEnabled ? ScoreBoardTheme.onSurface : ScoreBoardTheme.textMuted}
                    />
                  </View>
                  <View
                    style={!notifBasketballEnabled ? { opacity: 0.45 } : undefined}
                    pointerEvents={notifBasketballEnabled ? "auto" : "none"}
                  >
                  <View style={styles.rowItem}>
                    <View style={{ flex: 1, paddingLeft: 32 }}>
                      <Text style={styles.rowLabel}>{t("settings.notifications.basketballPoints")}</Text>
                      <Text style={styles.rowSubLabel}>{t("settings.notifications.basketballPointsDesc")}</Text>
                    </View>
                    <Switch
                      testID="notif-switch-basketball-points"
                      value={notifBasketballPoints}
                      onValueChange={setNotifBasketballPoints}
                      trackColor={{ false: ScoreBoardTheme.surfaceContainerHighest, true: ScoreBoardTheme.onSurfaceVariant }}
                      thumbColor={notifBasketballPoints ? ScoreBoardTheme.onSurface : ScoreBoardTheme.textMuted}
                    />
                  </View>
                  <View style={styles.rowItem}>
                    <View style={{ flex: 1, paddingLeft: 32 }}>
                      <Text style={styles.rowLabel}>{t("settings.notifications.basketballQuarters")}</Text>
                      <Text style={styles.rowSubLabel}>{t("settings.notifications.basketballQuartersDesc")}</Text>
                    </View>
                    <Switch
                      testID="notif-switch-basketball-quarters"
                      value={notifBasketballQuarters}
                      onValueChange={setNotifBasketballQuarters}
                      trackColor={{ false: ScoreBoardTheme.surfaceContainerHighest, true: ScoreBoardTheme.onSurfaceVariant }}
                      thumbColor={notifBasketballQuarters ? ScoreBoardTheme.onSurface : ScoreBoardTheme.textMuted}
                    />
                  </View>
                  </View>
                  </View>
                  </View>

                  <TouchableOpacity
                    testID="save-notif-prefs-btn"
                    style={[styles.savePrefsButton, savingPreferences && styles.buttonDisabled]}
                    onPress={() => handleSavePreferences()}
                    disabled={savingPreferences}
                  >
                    {savingPreferences ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={styles.savePrefsButtonText}>
                        {t("settings.preferences.savePreferences")}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* Section 3: Security & GDPR Portability (Authenticated Only) */}
            {user && (
              <>
                <Text style={styles.sectionHeader}>{t("settings.tabs.security")}</Text>
                <View style={styles.sectionCard}>
                  {/* Change Password Trigger */}
                  <TouchableOpacity
                    style={styles.rowItem}
                    onPress={() => setPasswordModalVisible(true)}
                  >
                    <View style={styles.rowLeft}>
                      <Ionicons name="key-outline" size={20} color="#94a3b8" />
                      <Text style={styles.rowLabel}>{t("settings.security.changePassword")}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#64748b" />
                  </TouchableOpacity>

                  <View style={styles.rowDivider} />

                  {/* GDPR Article 20 Data Export */}
                  <TouchableOpacity
                    style={styles.rowItem}
                    onPress={handleExportData}
                    disabled={exportingData}
                  >
                    <View style={styles.rowLeft}>
                      <Ionicons name="download-outline" size={20} color="#38bdf8" />
                      <View style={{ flex: 1, paddingRight: 12 }}>
                        <Text style={[styles.rowLabel, { color: "#38bdf8" }]}>
                          {exportingData
                            ? t("settings.security.exporting")
                            : t("settings.security.downloadData")}
                        </Text>
                        <Text style={styles.rowSubLabel}>
                          {t("settings.security.exportDesc")}
                        </Text>
                      </View>
                    </View>
                    {exportingData && <ActivityIndicator size="small" color="#38bdf8" />}
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* Section 4: System Information */}
            <Text style={styles.sectionHeader}>
              {locale === "pt" ? "Aplicação & Sistema" : "Application & System"}
            </Text>
            <View style={styles.sectionCard}>
              <View style={styles.rowItem}>
                <View style={styles.rowLeft}>
                  <Ionicons name="moon-outline" size={20} color="#94a3b8" />
                  <Text style={styles.rowLabel}>{locale === "pt" ? "Tema" : "Theme"}</Text>
                </View>
                <Text style={styles.rowValue}>ScoreBoard Dark</Text>
              </View>

              <View style={styles.rowDivider} />

              <View style={styles.rowItem}>
                <View style={styles.rowLeft}>
                  <Ionicons name="information-circle-outline" size={20} color="#94a3b8" />
                  <Text style={styles.rowLabel}>{locale === "pt" ? "Versão" : "Version"}</Text>
                </View>
                <Text style={styles.rowValue}>1.0.0 (Expo SDK 58)</Text>
              </View>
            </View>

            {/* Section 5: Danger Zone (GDPR Article 17) */}
            {user && (
              <>
                <Text style={[styles.sectionHeader, { color: "#f87171" }]}>
                  {t("settings.tabs.danger")}
                </Text>
                <View style={[styles.sectionCard, styles.dangerCard]}>
                  <Text style={styles.dangerTitle}>{t("settings.danger.title")}</Text>
                  <Text style={styles.dangerDesc}>{t("settings.danger.deleteWarning")}</Text>
                  <TouchableOpacity
                    style={styles.dangerButton}
                    onPress={() => {
                      setDeleteConfirmText("");
                      setDeleteError(null);
                      setDeleteModalVisible(true);
                    }}
                  >
                    <Ionicons name="trash-outline" size={18} color="#ffffff" />
                    <Text style={styles.dangerButtonText}>
                      {t("settings.danger.deleteAccount")}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* Section 6: Sign Out */}
            {user && (
              <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
                <Ionicons name="log-out-outline" size={20} color="#ffb4ab" />
                <Text style={styles.signOutText}>{t("nav.signOut")}</Text>
              </TouchableOpacity>
            )}

            {/* Telemetry Status Pill & Legal Footer */}
            <View style={styles.footerSection}>
              <View style={styles.statusPill}>
                <View style={styles.statusDot} />
                <Text style={styles.statusPillText}>{t("footer.statusOnline")}</Text>
              </View>
              <TouchableOpacity
                onPress={() => router.push("/terms" as any)}
                activeOpacity={0.75}
                testID="profile-terms-link"
              >
                <Text style={[styles.footerTermsText, { textDecorationLine: "underline" }]}>
                  {t("footer.terms")}
                </Text>
              </TouchableOpacity>
              <Text style={styles.footerTagline}>{t("footer.tagline")}</Text>
              <Text style={styles.footerCopyright}>
                © {new Date().getFullYear()} ScoreBoard. {t("footer.allRightsReserved")}
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      {/* Sport Selector Modal */}
      <Modal
        visible={sportModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSportModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSportModalVisible(false)}
        >
          <View style={styles.pickerModalCard}>
            <Text style={styles.pickerModalTitle}>
              {t("settings.preferences.defaultSport")}
            </Text>
            {SPORTS_LIST.map((sport) => {
              const isSelected = sport.id === defaultSport;
              return (
                <TouchableOpacity
                  key={sport.id}
                  style={[styles.pickerItem, isSelected && styles.pickerItemActive]}
                  onPress={() => {
                    setDefaultSport(sport.id);
                    setSportModalVisible(false);
                    triggerHaptic();
                  }}
                >
                  <Text style={[styles.pickerItemText, isSelected && styles.pickerItemTextActive]}>
                    {locale === "pt" ? sport.labelPt : sport.labelEn}
                  </Text>
                  {isSelected && <Ionicons name="checkmark" size={18} color="#38bdf8" />}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        visible={passwordModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPasswordModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.popupCard}>
            <View style={styles.popupHeader}>
              <Text style={styles.popupTitle}>{t("settings.security.changePassword")}</Text>
              <TouchableOpacity onPress={() => setPasswordModalVisible(false)}>
                <Ionicons name="close" size={22} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{t("settings.security.currentPassword")}</Text>
              <TextInput
                style={styles.input}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry
                placeholder="••••••••••••"
                placeholderTextColor="#64748b"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{t("settings.security.newPassword")}</Text>
              <TextInput
                style={styles.input}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                placeholder="••••••••••••"
                placeholderTextColor="#64748b"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{t("settings.security.confirmPassword")}</Text>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                placeholder="••••••••••••"
                placeholderTextColor="#64748b"
              />
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, updatingPassword && styles.buttonDisabled]}
              onPress={handleUpdatePassword}
              disabled={updatingPassword}
            >
              {updatingPassword ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {t("settings.security.updatePassword")}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Delete Account Modal (GDPR Article 17) */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.popupCard, styles.deletePopupCard]}>
            <View style={styles.popupHeader}>
              <Text style={[styles.popupTitle, { color: "#f87171" }]}>
                {t("settings.danger.title")}
              </Text>
              <TouchableOpacity onPress={() => setDeleteModalVisible(false)}>
                <Ionicons name="close" size={22} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.dangerConsequenceText}>
              {t("settings.danger.deleteConsequence")}
            </Text>

            {deleteError && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{deleteError}</Text>
              </View>
            )}

            <Text style={styles.deleteConfirmPrompt}>
              {t("settings.danger.confirmPrompt")}
            </Text>

            <TextInput
              style={[styles.input, styles.deleteInput]}
              value={deleteConfirmText}
              onChangeText={setDeleteConfirmText}
              placeholder="DELETE"
              placeholderTextColor="#f87171"
              autoCapitalize="characters"
              autoCorrect={false}
            />

            <TouchableOpacity
              style={[
                styles.deleteExecuteButton,
                (isDeleting || deleteConfirmText.trim().toUpperCase() !== "DELETE") &&
                  styles.buttonDisabled,
              ]}
              onPress={handleDeleteAccount}
              disabled={isDeleting || deleteConfirmText.trim().toUpperCase() !== "DELETE"}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.deleteExecuteButtonText}>
                  {t("settings.danger.confirmButton")}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <AuthModal visible={authModalVisible} onClose={() => setAuthModalVisible(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: ScoreBoardTheme.background,
  },
  content: {
    padding: 16,
    paddingBottom: 90,
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: ScoreBoardTheme.surfaceContainerLow,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderGhost,
    borderRadius: 20,
    padding: 16,
    marginBottom: 24,
  },
  avatarLarge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: ScoreBoardTheme.surfaceContainerHighest,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: ScoreBoardTheme.onSurface,
    fontSize: 22,
    fontWeight: "800",
  },
  userInfo: {
    flex: 1,
    marginLeft: 14,
  },
  userEmail: {
    fontSize: 15,
    fontWeight: "700",
    color: ScoreBoardTheme.onSurface,
  },
  tierBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 6,
  },
  tierDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  userRole: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(220, 225, 251, 0.65)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  loginCardBtn: {
    backgroundColor: ScoreBoardTheme.onSurface,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  loginCardBtnText: {
    color: ScoreBoardTheme.surfaceContainerLowest,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: "800",
    color: "rgba(220, 225, 251, 0.5)",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
    marginTop: 12,
  },
  sectionCard: {
    backgroundColor: ScoreBoardTheme.surfaceContainerLow,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderGhost,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
  },
  fieldGroup: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "rgba(220, 225, 251, 0.6)",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  fieldHint: {
    fontSize: 10,
    color: "#64748b",
    marginTop: 4,
  },
  input: {
    backgroundColor: ScoreBoardTheme.surfaceContainer,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: "600",
    color: ScoreBoardTheme.onSurface,
  },
  inputDisabled: {
    opacity: 0.5,
  },
  primaryButton: {
    backgroundColor: ScoreBoardTheme.onSurface,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 8,
  },
  primaryButtonText: {
    color: ScoreBoardTheme.surfaceContainerLowest,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  savePrefsButton: {
    backgroundColor: ScoreBoardTheme.surfaceContainerHighest,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.onSurfaceVariant,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 14,
  },
  savePrefsButtonText: {
    color: ScoreBoardTheme.onSurface,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  rowItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: ScoreBoardTheme.onSurface,
  },
  rowSubLabel: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 2,
    paddingRight: 10,
  },
  rowValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#94a3b8",
  },
  rowRightClickable: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  rowDivider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    marginVertical: 4,
  },
  langToggleRow: {
    flexDirection: "row",
    gap: 8,
  },
  langPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: ScoreBoardTheme.surfaceContainer,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  langPillActive: {
    backgroundColor: ScoreBoardTheme.onSurface,
    borderColor: ScoreBoardTheme.onSurface,
  },
  langPillText: {
    fontSize: 12,
    fontWeight: "800",
    color: ScoreBoardTheme.textMuted,
  },
  langPillTextActive: {
    color: ScoreBoardTheme.surfaceContainerLowest,
  },
  dangerCard: {
    borderColor: "rgba(239, 68, 68, 0.3)",
    backgroundColor: "rgba(239, 68, 68, 0.06)",
  },
  dangerTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#f87171",
    marginBottom: 6,
  },
  dangerDesc: {
    fontSize: 11,
    lineHeight: 16,
    color: "rgba(220, 225, 251, 0.7)",
    marginBottom: 14,
  },
  dangerButton: {
    backgroundColor: "#ef4444",
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  dangerButtonText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 180, 171, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 180, 171, 0.2)",
    borderRadius: 18,
    paddingVertical: 14,
    marginTop: 8,
    gap: 8,
  },
  signOutText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ffb4ab",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  pickerModalCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: ScoreBoardTheme.surfaceContainerLow,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderGhost,
  },
  pickerModalTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: ScoreBoardTheme.onSurface,
    marginBottom: 12,
    marginLeft: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  pickerItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  pickerItemActive: {
    backgroundColor: "rgba(56, 189, 248, 0.15)",
  },
  pickerItemText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#cbd5e1",
  },
  pickerItemTextActive: {
    color: "#38bdf8",
    fontWeight: "800",
  },
  popupCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: ScoreBoardTheme.surfaceContainerLow,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderGhost,
  },
  popupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  popupTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: ScoreBoardTheme.onSurface,
  },
  deletePopupCard: {
    borderColor: "rgba(239, 68, 68, 0.4)",
  },
  dangerConsequenceText: {
    fontSize: 12,
    lineHeight: 18,
    color: "#f87171",
    fontWeight: "600",
    marginBottom: 12,
  },
  errorBanner: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderWidth: 1,
    borderColor: "#ef4444",
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  errorBannerText: {
    color: "#fca5a5",
    fontSize: 11,
    fontWeight: "700",
  },
  deleteConfirmPrompt: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(220, 225, 251, 0.7)",
    marginBottom: 8,
  },
  deleteInput: {
    borderColor: "rgba(239, 68, 68, 0.5)",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontWeight: "800",
    letterSpacing: 2,
    textAlign: "center",
    marginBottom: 16,
  },
  deleteExecuteButton: {
    backgroundColor: "#ef4444",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  deleteExecuteButtonText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  footerSection: {
    marginTop: 28,
    marginBottom: 16,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: ScoreBoardTheme.borderSubtle,
    alignItems: "center",
    gap: 8,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: ScoreBoardTheme.surfaceContainer,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10b981",
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: "700",
    color: ScoreBoardTheme.onSurfaceVariant,
    letterSpacing: 0.8,
  },
  footerTermsText: {
    fontSize: 12,
    fontWeight: "600",
    color: ScoreBoardTheme.onSurfaceVariant,
  },
  footerTagline: {
    fontSize: 11,
    color: ScoreBoardTheme.textMuted,
    textAlign: "center",
  },
  footerCopyright: {
    fontSize: 11,
    color: ScoreBoardTheme.textMuted,
    textAlign: "center",
  },
  notifSubHeader: {
    fontSize: 11,
    fontWeight: "700",
    color: ScoreBoardTheme.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.7,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  notifBlock: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  sportCardHeader: {
    backgroundColor: ScoreBoardTheme.surfaceContainerHighest,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: ScoreBoardTheme.borderSubtle,
  },
  sportCardHeaderTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: ScoreBoardTheme.onSurface,
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  granularityRow: {
    flexDirection: "row",
    gap: 8,
    marginLeft: 32,
  },
  granularityPill: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    backgroundColor: ScoreBoardTheme.surfaceContainerHigh,
    alignItems: "center",
  },
  granularityPillActive: {
    backgroundColor: ScoreBoardTheme.onSurface,
    borderColor: ScoreBoardTheme.onSurface,
  },
  granularityPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: ScoreBoardTheme.onSurfaceVariant,
  },
  granularityPillTextActive: {
    color: ScoreBoardTheme.surfaceContainerLowest,
  },
});
