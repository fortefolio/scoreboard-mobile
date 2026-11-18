import React, { useState, useMemo, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  Keyboard,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SportFilterBar } from "@/components/SportFilterBar";
import { SportIcon } from "@/components/SportIcon";
import { useTranslation, getSportTranslation } from "@/lib/i18n";
import { ScoreBoardTheme } from "@/constants/theme";

export interface FeedHeaderProps {
  selectedSport: string;
  onSportChange: (sport: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  statusFilter: string;
  onStatusChange: (status: string) => void;
  displayCount: number;
  countLabel: string;
  viewMode?: "list" | "cards";
  onViewModeChange?: (mode: "list" | "cards") => void;
  showViewToggle?: boolean;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  primaryActionTestID?: string;
  sortOrder?: "desc" | "asc";
  onSortOrderChange?: (order: "desc" | "asc") => void;
  matches?: any[];
  tournaments?: any[];
  currentTab?: "matches" | "tournaments" | "following";
}

const STATUS_OPTIONS = [
  { key: "all", labelKey: "status.all" },
  { key: "ongoing", labelKey: "status.live" },
  { key: "scheduled", labelKey: "status.scheduled" },
  { key: "completed", labelKey: "status.completed" },
];

export const FeedHeader = React.memo(function FeedHeader({
  selectedSport,
  onSportChange,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  viewMode = "list",
  onViewModeChange,
  showViewToggle = true,
  primaryActionLabel,
  onPrimaryAction,
  primaryActionTestID,
  sortOrder = "desc",
  onSortOrderChange,
  matches = [],
  tournaments = [],
  currentTab,
}: FeedHeaderProps) {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeStatusOption =
    STATUS_OPTIONS.find((opt) => opt.key === statusFilter) || STATUS_OPTIONS[0];
  const isPt = locale === "pt";

  const statusLabel = t("common.status") || (isPt ? "Estado" : "Status");
  const dateLabel = t("common.date") || (isPt ? "Data" : "Date");
  const sortLabel =
    sortOrder === "desc"
      ? isPt
        ? "Descendente"
        : "Descending"
      : isPt
      ? "Ascendente"
      : "Ascending";

  const matchingOrganizers = useMemo(() => {
    const raw = searchQuery.trim().toLowerCase();
    const q = raw.startsWith("@") ? raw.slice(1) : raw;
    if (q.length < 2) return [];

    const byUsername = new Map<
      string,
      { username: string; matches: number; tournaments: number }
    >();

    for (const m of matches) {
      const uname = m.organizer?.username;
      if (!uname || !uname.toLowerCase().includes(q)) continue;
      const entry = byUsername.get(uname) || { username: uname, matches: 0, tournaments: 0 };
      entry.matches += 1;
      byUsername.set(uname, entry);
    }

    for (const tourn of tournaments) {
      const uname = tourn.organizer?.username;
      if (!uname || !uname.toLowerCase().includes(q)) continue;
      const entry = byUsername.get(uname) || { username: uname, matches: 0, tournaments: 0 };
      entry.tournaments += 1;
      byUsername.set(uname, entry);
    }

    return Array.from(byUsername.values()).slice(0, 3);
  }, [matches, tournaments, searchQuery]);

  const matchingQuickTournaments = useMemo(() => {
    if (currentTab === "tournaments") return [];
    const q = searchQuery.trim().toLowerCase();
    const userQ = q.startsWith("@") ? q.slice(1) : q;
    if (userQ.length < 2) return [];

    return tournaments
      .filter((tItem) => {
        const name = (tItem.name || "").toLowerCase();
        const sport = (tItem.sport_type || "").toLowerCase();
        const org = (tItem.organizer?.username || "").toLowerCase();
        return name.includes(q) || sport.includes(q) || (userQ && org.includes(userQ));
      })
      .slice(0, 3);
  }, [currentTab, tournaments, searchQuery]);

  const matchingQuickMatches = useMemo(() => {
    if (currentTab === "matches") return [];
    const q = searchQuery.trim().toLowerCase();
    const userQ = q.startsWith("@") ? q.slice(1) : q;
    if (userQ.length < 2) return [];

    return matches
      .filter((m) => {
        const p1 = (m.participants?.[0]?.name || "").toLowerCase();
        const p2 = (m.participants?.[1]?.name || "").toLowerCase();
        const tName = (m.tournaments?.name || "").toLowerCase();
        const sport = (m.sport_type || "").toLowerCase();
        const org = (m.organizer?.username || "").toLowerCase();
        return (
          p1.includes(q) ||
          p2.includes(q) ||
          tName.includes(q) ||
          sport.includes(q) ||
          (userQ && org.includes(userQ))
        );
      })
      .slice(0, 3);
  }, [currentTab, matches, searchQuery]);

  const hasQuickJumpResults =
    matchingOrganizers.length > 0 ||
    matchingQuickTournaments.length > 0 ||
    matchingQuickMatches.length > 0;

  const handleNavigateQuickJump = (path: string) => {
    if (blurTimerRef.current) {
      clearTimeout(blurTimerRef.current);
      blurTimerRef.current = null;
    }
    setSearchFocused(false);
    Keyboard.dismiss();
    router.push(path as any);
  };

  return (
    <View style={styles.headerContainer}>
      {/* Compact Control Card (matches web small-screen layout) */}
      <View style={styles.controlCard}>
        {/* Row 1: Full-width Search Input + Quick Jump Popover */}
        <View style={styles.searchBoxAnchor}>
          <View style={styles.searchWrapper}>
            <Ionicons
              name="search"
              size={16}
              color={ScoreBoardTheme.textMuted}
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder={
                isPt
                  ? "Pesquisar jogos, torneios ou @utilizadores..."
                  : "Search matches, tournaments, or @users..."
              }
              placeholderTextColor={ScoreBoardTheme.textMuted}
              value={searchQuery}
              onFocus={() => {
                if (blurTimerRef.current) {
                  clearTimeout(blurTimerRef.current);
                  blurTimerRef.current = null;
                }
                setSearchFocused(true);
              }}
              onBlur={() => {
                blurTimerRef.current = setTimeout(() => {
                  setSearchFocused(false);
                }, 150);
              }}
              onChangeText={onSearchChange}
              returnKeyType="search"
              clearButtonMode="never"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  onSearchChange("");
                }}
                style={styles.clearBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name="close-circle"
                  size={16}
                  color={ScoreBoardTheme.onSurfaceVariant}
                />
              </TouchableOpacity>
            )}
          </View>

          {searchFocused && hasQuickJumpResults && (
            <View style={styles.popoverCard}>
              <ScrollView
                style={styles.popoverScroll}
                keyboardShouldPersistTaps="always"
                nestedScrollEnabled
              >
                {matchingOrganizers.length > 0 && (
                  <View style={styles.popoverSection}>
                    <Text style={styles.popoverSectionHeader}>
                      {isPt ? "Organizadores" : "Organizers"}
                    </Text>
                    {matchingOrganizers.map((org) => (
                      <TouchableOpacity
                        key={org.username}
                        style={styles.popoverRow}
                        onPress={() =>
                          handleNavigateQuickJump(
                            `/user/${encodeURIComponent(org.username)}`
                          )
                        }
                        activeOpacity={0.7}
                      >
                        <View style={styles.popoverRowLeft}>
                          <View style={styles.popoverIconBox}>
                            <Text style={styles.popoverAvatarText}>
                              {org.username.slice(0, 2).toUpperCase()}
                            </Text>
                          </View>
                          <View style={styles.popoverTextCol}>
                            <Text style={styles.popoverPrimaryText} numberOfLines={1}>
                              @{org.username}
                            </Text>
                            <Text style={styles.popoverSecondaryText} numberOfLines={1}>
                              {org.matches} {t("home.matchesCount").toLowerCase()} •{" "}
                              {org.tournaments} {t("home.tournamentsCount").toLowerCase()}
                            </Text>
                          </View>
                        </View>
                        <Ionicons
                          name="arrow-forward"
                          size={15}
                          color={ScoreBoardTheme.textMuted}
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {matchingQuickTournaments.length > 0 && (
                  <View
                    style={[
                      styles.popoverSection,
                      matchingOrganizers.length > 0 && styles.popoverSectionDivider,
                    ]}
                  >
                    <Text style={styles.popoverSectionHeader}>
                      {t("home.tournamentsTab")}
                    </Text>
                    {matchingQuickTournaments.map((tourn) => (
                      <TouchableOpacity
                        key={tourn.id}
                        style={styles.popoverRow}
                        onPress={() =>
                          handleNavigateQuickJump(`/tournament/${tourn.id}`)
                        }
                        activeOpacity={0.7}
                      >
                        <View style={styles.popoverRowLeft}>
                          <View style={styles.popoverIconBox}>
                            <SportIcon
                              sport={tourn.sport_type}
                              size={13}
                              color={ScoreBoardTheme.onSurfaceVariant}
                            />
                          </View>
                          <View style={styles.popoverTextCol}>
                            <Text style={styles.popoverPrimaryText} numberOfLines={1}>
                              {tourn.name}
                            </Text>
                            <Text style={styles.popoverSecondaryText} numberOfLines={1}>
                              {getSportTranslation(tourn.sport_type, t)}
                              {tourn.organizer?.username
                                ? ` • @${tourn.organizer.username}`
                                : ""}
                            </Text>
                          </View>
                        </View>
                        <Ionicons
                          name="arrow-forward"
                          size={15}
                          color={ScoreBoardTheme.textMuted}
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {matchingQuickMatches.length > 0 && (
                  <View
                    style={[
                      styles.popoverSection,
                      (matchingOrganizers.length > 0 ||
                        matchingQuickTournaments.length > 0) &&
                        styles.popoverSectionDivider,
                    ]}
                  >
                    <Text style={styles.popoverSectionHeader}>
                      {t("home.matchesTab")}
                    </Text>
                    {matchingQuickMatches.map((m) => {
                      const p1 = m.participants?.[0]?.name || "Team 1";
                      const p2 = m.participants?.[1]?.name || "Team 2";
                      const metaParts = [
                        getSportTranslation(m.sport_type, t),
                        m.tournaments?.name,
                        m.organizer?.username ? `@${m.organizer.username}` : null,
                      ].filter(Boolean);

                      return (
                        <TouchableOpacity
                          key={m.id}
                          style={styles.popoverRow}
                          onPress={() => handleNavigateQuickJump(`/match/${m.id}`)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.popoverRowLeft}>
                            <View style={styles.popoverIconBox}>
                              <SportIcon
                                sport={m.sport_type}
                                size={13}
                                color={ScoreBoardTheme.onSurfaceVariant}
                              />
                            </View>
                            <View style={styles.popoverTextCol}>
                              <Text style={styles.popoverPrimaryText} numberOfLines={1}>
                                {p1} vs {p2}
                              </Text>
                              <Text style={styles.popoverSecondaryText} numberOfLines={1}>
                                {metaParts.join(" • ")}
                              </Text>
                            </View>
                          </View>
                          <Ionicons
                            name="arrow-forward"
                            size={15}
                            color={ScoreBoardTheme.textMuted}
                          />
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Row 2: Status & Date dropdowns on left, + & View Toggle on right */}
        <View style={styles.toolbarRow}>
          <View style={styles.dropdownsLeft}>
            {/* Status Dropdown Trigger */}
            <TouchableOpacity
              style={styles.filterDropdown}
              onPress={() => setStatusModalVisible(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.dropdownLabel}>{statusLabel}:</Text>
              <View style={styles.dropdownValueRow}>
                {statusFilter === "ongoing" && <View style={styles.liveDot} />}
                <Text style={styles.dropdownValue} numberOfLines={1}>
                  {t(activeStatusOption.labelKey)}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={13}
                  color={ScoreBoardTheme.onSurfaceVariant}
                />
              </View>
            </TouchableOpacity>

            {/* Date Sort Toggle */}
            <TouchableOpacity
              style={styles.filterDropdown}
              onPress={() =>
                onSortOrderChange?.(sortOrder === "desc" ? "asc" : "desc")
              }
              activeOpacity={0.7}
              disabled={!onSortOrderChange}
            >
              <Text style={styles.dropdownLabel}>{dateLabel}:</Text>
              <View style={styles.dropdownValueRow}>
                <Text style={styles.dropdownValue} numberOfLines={1}>
                  {sortLabel}
                </Text>
                {onSortOrderChange && (
                  <Ionicons
                    name="chevron-down"
                    size={13}
                    color={ScoreBoardTheme.onSurfaceVariant}
                  />
                )}
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.actionsRight}>
            {onPrimaryAction && (
              <TouchableOpacity
                style={styles.addBtn}
                onPress={onPrimaryAction}
                activeOpacity={0.8}
                testID={primaryActionTestID}
                accessibilityLabel={primaryActionLabel || "New"}
              >
                <Ionicons
                  name="add"
                  size={20}
                  color={ScoreBoardTheme.surfaceContainerLowest}
                />
              </TouchableOpacity>
            )}

            {showViewToggle && onViewModeChange && (
              <View style={styles.viewModeToggle}>
                <TouchableOpacity
                  style={[
                    styles.toggleBtn,
                    viewMode === "list" && styles.toggleBtnActive,
                  ]}
                  onPress={() => onViewModeChange("list")}
                  activeOpacity={0.7}
                  accessibilityLabel={t("common.viewList") || "List"}
                >
                  <Ionicons
                    name="list"
                    size={17}
                    color={
                      viewMode === "list"
                        ? ScoreBoardTheme.onSurface
                        : ScoreBoardTheme.textMuted
                    }
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.toggleBtn,
                    viewMode === "cards" && styles.toggleBtnActive,
                  ]}
                  onPress={() => onViewModeChange("cards")}
                  activeOpacity={0.7}
                  accessibilityLabel={t("common.viewCards") || "Cards"}
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
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Sport Filter Bar (below control card, lower zIndex so quick-jump popover overlays it) */}
      <View style={styles.sportBarWrap}>
        <SportFilterBar selectedSport={selectedSport} onSelectSport={onSportChange} />
      </View>

      {/* Status Picker Modal */}
      <Modal
        visible={statusModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setStatusModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setStatusModalVisible(false)}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{statusLabel}</Text>
            {STATUS_OPTIONS.map((opt) => {
              const isSelected = statusFilter === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    styles.modalOption,
                    isSelected && styles.modalOptionActive,
                  ]}
                  onPress={() => {
                    onStatusChange(opt.key);
                    setStatusModalVisible(false);
                  }}
                >
                  <View style={styles.modalOptionLeft}>
                    {opt.key === "ongoing" && <View style={styles.liveDot} />}
                    <Text
                      style={[
                        styles.modalOptionText,
                        isSelected && styles.modalOptionTextActive,
                      ]}
                    >
                      {t(opt.labelKey)}
                    </Text>
                  </View>
                  {isSelected && (
                    <Ionicons
                      name="checkmark"
                      size={16}
                      color={ScoreBoardTheme.onSurface}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
});

const styles = StyleSheet.create({
  headerContainer: {
    paddingTop: 6,
    paddingBottom: 8,
    gap: 8,
    zIndex: 40,
  },
  controlCard: {
    marginHorizontal: 16,
    backgroundColor: ScoreBoardTheme.surfaceContainer,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    padding: 12,
    gap: 10,
    zIndex: 50,
    elevation: 6,
  },
  sportBarWrap: {
    zIndex: 1,
  },
  searchBoxAnchor: {
    position: "relative",
    zIndex: 50,
  },
  popoverCard: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "100%",
    marginTop: 6,
    maxHeight: 300,
    backgroundColor: ScoreBoardTheme.surfaceContainerHigh,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    paddingVertical: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 14,
    zIndex: 60,
  },
  popoverScroll: {
    maxHeight: 288,
  },
  popoverSection: {
    paddingVertical: 4,
  },
  popoverSectionDivider: {
    borderTopWidth: 1,
    borderTopColor: ScoreBoardTheme.borderSubtle,
  },
  popoverSectionHeader: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    fontSize: 11,
    fontWeight: "600",
    color: ScoreBoardTheme.onSurfaceVariant,
  },
  popoverRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  popoverRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  popoverIconBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: ScoreBoardTheme.surfaceContainerHighest,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  popoverAvatarText: {
    fontSize: 10,
    fontWeight: "600",
    color: ScoreBoardTheme.onSurfaceVariant,
  },
  popoverTextCol: {
    flex: 1,
    minWidth: 0,
  },
  popoverPrimaryText: {
    fontSize: 12,
    fontWeight: "500",
    color: ScoreBoardTheme.onSurface,
  },
  popoverSecondaryText: {
    fontSize: 11,
    color: ScoreBoardTheme.textMuted,
  },
  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#07080d",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: ScoreBoardTheme.onSurface,
    fontSize: 13,
    fontWeight: "400",
    paddingVertical: 0,
  },
  clearBtn: {
    marginLeft: 6,
    padding: 2,
  },
  toolbarRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  dropdownsLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    flex: 1,
    minWidth: 0,
  },
  filterDropdown: {
    gap: 2,
  },
  dropdownLabel: {
    fontSize: 10,
    fontWeight: "500",
    color: ScoreBoardTheme.textMuted,
  },
  dropdownValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  dropdownValue: {
    fontSize: 13,
    fontWeight: "600",
    color: ScoreBoardTheme.onSurface,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: ScoreBoardTheme.liveCrimson,
  },
  actionsRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
  addBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: ScoreBoardTheme.onSurface,
    alignItems: "center",
    justifyContent: "center",
  },
  viewModeToggle: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: ScoreBoardTheme.surfaceContainerLowest,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    padding: 3,
    gap: 2,
  },
  toggleBtn: {
    width: 30,
    height: 28,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleBtnActive: {
    backgroundColor: ScoreBoardTheme.surfaceContainerHighest,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 300,
    backgroundColor: ScoreBoardTheme.surfaceContainer,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    padding: 16,
    gap: 6,
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: ScoreBoardTheme.onSurface,
    marginBottom: 4,
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: ScoreBoardTheme.surfaceContainerLowest,
  },
  modalOptionActive: {
    backgroundColor: ScoreBoardTheme.surfaceContainerHighest,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.onSurfaceVariant,
  },
  modalOptionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modalOptionText: {
    fontSize: 13,
    fontWeight: "500",
    color: ScoreBoardTheme.onSurfaceVariant,
  },
  modalOptionTextActive: {
    color: ScoreBoardTheme.onSurface,
    fontWeight: "700",
  },
});
