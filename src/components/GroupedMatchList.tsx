import React, { useState, useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SportFavoriteButton } from "@/components/FollowButton";
import { MatchListItem } from "@/components/MatchListItem";
import { useTranslation } from "@/lib/i18n";
import { ScoreBoardTheme } from "@/constants/theme";

export interface MatchGroup {
  key: string;
  tournamentId: string | null;
  tournamentName: string | null;
  sportType: string;
  organizerUsername: string | null;
  matches: any[];
}

export function groupMatchesByTournament(matches: any[]): MatchGroup[] {
  const groupsMap = new Map<string, MatchGroup>();

  for (const match of matches) {
    const key = match.tournament_id || "__standalone__";
    const existing = groupsMap.get(key);

    if (existing) {
      existing.matches.push(match);
    } else {
      groupsMap.set(key, {
        key,
        tournamentId: match.tournament_id || null,
        tournamentName: match.tournaments?.name || null,
        sportType: match.sport_type || "Tennis",
        organizerUsername: match.organizer?.username || null,
        matches: [match],
      });
    }
  }

  return Array.from(groupsMap.values());
}

export interface GroupedMatchListProps {
  matches: any[];
  showOrganizer?: boolean;
  onAuthRequired?: () => void;
  renderRowActions?: (match: any) => React.ReactNode;
}

export function GroupedMatchList({
  matches,
  showOrganizer = true,
  onAuthRequired,
  renderRowActions,
}: GroupedMatchListProps) {
  const { locale } = useTranslation();
  const router = useRouter();
  const isPt = locale === "pt";

  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const groups = useMemo(() => groupMatchesByTournament(matches), [matches]);

  const toggleGroup = (key: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <View style={styles.listContainer}>
      {groups.map((group) => {
        const isCollapsed = !!collapsedGroups[group.key];
        const countLabel = isPt
          ? `Jogos (${group.matches.length})`
          : `Matches (${group.matches.length})`;

        return (
          <View key={group.key} style={styles.groupCard}>
            {/* Group Header Bar */}
            <View
              style={[
                styles.groupHeader,
                isCollapsed && styles.groupHeaderCollapsed,
              ]}
            >
              {group.tournamentId ? (
                <View style={styles.headerLeft}>
                  <SportFavoriteButton
                    entityId={group.tournamentId}
                    entityType="tournament"
                    sport={group.sportType}
                    size="sm"
                    onAuthRequired={onAuthRequired}
                  />
                  <TouchableOpacity
                    style={styles.titleWrap}
                    onPress={() =>
                      router.push(`/tournament/${group.tournamentId}` as any)
                    }
                    activeOpacity={0.75}
                  >
                    <Text style={styles.groupTitle} numberOfLines={1}>
                      {group.tournamentName ||
                        (isPt ? "Torneio" : "Tournament")}
                    </Text>
                    {showOrganizer && group.organizerUsername && (
                      <Text style={styles.organizerText} numberOfLines={1}>
                        @{group.organizerUsername}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.headerLeft}>
                  <View style={styles.standaloneIconBox}>
                    <Ionicons
                      name="stopwatch-outline"
                      size={16}
                      color={ScoreBoardTheme.onSurfaceVariant}
                    />
                  </View>
                  <Text style={styles.groupTitle} numberOfLines={1}>
                    {isPt ? "Jogos Isolados" : "Standalone Matches"}
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.collapseBtn}
                onPress={() => toggleGroup(group.key)}
                activeOpacity={0.75}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                {isCollapsed && (
                  <Text style={styles.collapsedCountText}>{countLabel}</Text>
                )}
                <Ionicons
                  name={isCollapsed ? "chevron-down" : "chevron-up"}
                  size={16}
                  color={ScoreBoardTheme.textMuted}
                />
              </TouchableOpacity>
            </View>

            {/* Group Body */}
            {!isCollapsed && (
              <View>
                {group.matches.map((match, idx) => (
                  <View
                    key={match.id}
                    style={idx > 0 ? styles.rowDivider : undefined}
                  >
                    <MatchListItem
                      match={match}
                      inGroup
                      onAuthRequired={onAuthRequired}
                      rightActions={renderRowActions?.(match)}
                    />
                  </View>
                ))}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  listContainer: {
    gap: 12,
  },
  groupCard: {
    backgroundColor: "#11141c",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    overflow: "hidden",
  },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(22, 26, 36, 0.6)",
    borderBottomWidth: 1,
    borderBottomColor: ScoreBoardTheme.borderSubtle,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  groupHeaderCollapsed: {
    borderBottomWidth: 0,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  standaloneIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: ScoreBoardTheme.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
  },
  groupTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: ScoreBoardTheme.onSurface,
  },
  organizerText: {
    fontSize: 11,
    color: ScoreBoardTheme.textMuted,
    marginTop: 1,
  },
  collapseBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  collapsedCountText: {
    fontSize: 11,
    fontWeight: "500",
    color: ScoreBoardTheme.textMuted,
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: ScoreBoardTheme.borderSubtle,
  },
});
