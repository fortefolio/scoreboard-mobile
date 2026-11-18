import React, { createContext, useContext } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TouchableOpacityProps,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SportIcon } from "@/components/SportIcon";
import { ScoreBoardTheme } from "@/constants/theme";

interface ScoreboardChromeContextValue {
  onBack?: () => void;
  onOpenObs?: () => void;
  offlineBadge?: React.ReactNode;
}

const ScoreboardChromeContext = createContext<ScoreboardChromeContextValue>({});

export function ScoreboardProvider({
  onBack,
  onOpenObs,
  offlineBadge,
  children,
}: ScoreboardChromeContextValue & { children: React.ReactNode }) {
  return (
    <ScoreboardChromeContext.Provider value={{ onBack, onOpenObs, offlineBadge }}>
      {children}
    </ScoreboardChromeContext.Provider>
  );
}

export interface CompactHeaderConfig {
  sportType: string;
  sportLabel: string;
  eventName: string;
  statusBadge?: string;
  onFinish?: () => void;
  finishLabel?: string;
}

export function ScoreboardMainCard({
  left,
  leftActions,
  center,
  right,
  rightActions,
  compactHeader,
}: {
  left: React.ReactNode;
  leftActions?: React.ReactNode;
  center: React.ReactNode;
  right: React.ReactNode;
  rightActions?: React.ReactNode;
  compactHeader?: CompactHeaderConfig;
}) {
  const { onBack, onOpenObs, offlineBadge } = useContext(ScoreboardChromeContext);

  return (
    <View style={styles.mainCard}>
      {compactHeader && (
        <View style={styles.compactHeader}>
          <View style={styles.compactHeaderLeft}>
            {onBack && (
              <TouchableOpacity
                testID="scoreboard-back-btn"
                style={styles.compactIconBtn}
                onPress={onBack}
                activeOpacity={0.75}
              >
                <Ionicons
                  name="arrow-back"
                  size={15}
                  color={ScoreBoardTheme.onSurfaceVariant}
                />
              </TouchableOpacity>
            )}
            <View style={styles.compactIconBox}>
              <SportIcon
                sport={compactHeader.sportType}
                size={14}
                color={ScoreBoardTheme.onSurface}
              />
            </View>
            <Text style={styles.compactSportText} numberOfLines={1}>
              {compactHeader.sportLabel}{" "}
              <Text style={styles.compactEventMuted}>
                • {compactHeader.eventName}
              </Text>
            </Text>
          </View>

          <View style={styles.compactHeaderRight}>
            {compactHeader.statusBadge && (
              <View style={styles.compactStatusBadge}>
                <Text style={styles.compactStatusText}>
                  {compactHeader.statusBadge}
                </Text>
              </View>
            )}
            {offlineBadge}
            {onOpenObs && (
              <TouchableOpacity
                style={styles.compactActionBtn}
                onPress={onOpenObs}
                activeOpacity={0.75}
              >
                <Ionicons
                  name="radio-outline"
                  size={14}
                  color={ScoreBoardTheme.onSurfaceVariant}
                />
                <Text style={styles.compactActionText}>OBS</Text>
              </TouchableOpacity>
            )}
            {compactHeader.onFinish && (
              <TouchableOpacity
                testID="end-match-btn"
                style={styles.compactFinishBtn}
                onPress={compactHeader.onFinish}
                activeOpacity={0.75}
              >
                <Ionicons
                  name="checkmark-circle-outline"
                  size={14}
                  color={ScoreBoardTheme.error}
                />
                <Text style={styles.compactFinishText}>
                  {compactHeader.finishLabel || "Terminar"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      <View style={styles.gridRow}>
        {/* Left Team + Square Side-Rail Actions */}
        <View style={styles.teamRailWrapLeft}>
          {leftActions && <View style={styles.sideRail}>{leftActions}</View>}
          <View style={styles.teamColumnSlot}>{left}</View>
        </View>

        {/* Center Telemetry Column */}
        <View style={styles.centerSlot}>{center}</View>

        {/* Right Team + Square Side-Rail Actions */}
        <View style={styles.teamRailWrapRight}>
          <View style={styles.teamColumnSlot}>{right}</View>
          {rightActions && <View style={styles.sideRail}>{rightActions}</View>}
        </View>
      </View>
    </View>
  );
}

export function ScoreboardTeamColumn({
  teamName,
  subLabel,
  score,
  pills,
}: {
  teamName: string;
  subLabel: React.ReactNode;
  score: React.ReactNode;
  pills?: React.ReactNode;
}) {
  return (
    <View style={styles.teamCol}>
      <Text style={styles.teamName} numberOfLines={1}>
        {teamName}
      </Text>
      <View style={styles.subLabelSlot}>{subLabel}</View>
      <View style={styles.scoreWrap}>
        {typeof score === "string" || typeof score === "number" ? (
          <Text style={styles.scoreDigital}>{score}</Text>
        ) : (
          score
        )}
      </View>
      {pills && <View style={styles.pillsRow}>{pills}</View>}
    </View>
  );
}

export type ScoreboardActionVariant =
  | "primary"
  | "secondary"
  | "warning"
  | "danger";

export function ScoreboardActionButton({
  variant = "secondary",
  label,
  icon,
  style,
  ...props
}: TouchableOpacityProps & {
  variant?: ScoreboardActionVariant;
  label?: string;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const variantStyle =
    variant === "primary"
      ? styles.btnPrimary
      : variant === "warning"
      ? styles.btnWarning
      : variant === "danger"
      ? styles.btnDanger
      : styles.btnSecondary;

  const textColor =
    variant === "primary"
      ? ScoreBoardTheme.surfaceContainerLowest
      : variant === "warning"
      ? "#fcd34d"
      : variant === "danger"
      ? "#fda4af"
      : ScoreBoardTheme.onSurfaceVariant;

  return (
    <TouchableOpacity
      style={[styles.actionBtn, variantStyle, style]}
      activeOpacity={0.75}
      {...props}
    >
      {icon && <Ionicons name={icon} size={14} color={textColor} />}
      {label !== undefined && (
        <Text style={[styles.actionBtnText, { color: textColor }]} numberOfLines={1}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  mainCard: {
    flex: 1,
    backgroundColor: ScoreBoardTheme.surfaceContainer,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    padding: 10,
    justifyContent: "space-between",
    overflow: "hidden",
  },
  compactHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 8,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: ScoreBoardTheme.borderSubtle,
    gap: 8,
  },
  compactHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  compactIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: ScoreBoardTheme.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  compactIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: ScoreBoardTheme.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  compactSportText: {
    fontSize: 12,
    fontWeight: "600",
    color: ScoreBoardTheme.onSurfaceVariant,
    flexShrink: 1,
  },
  compactEventMuted: {
    fontWeight: "400",
    color: ScoreBoardTheme.textMuted,
  },
  compactHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  compactStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: ScoreBoardTheme.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
  },
  compactStatusText: {
    fontSize: 11,
    fontWeight: "600",
    color: ScoreBoardTheme.onSurface,
  },
  compactActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    height: 28,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: ScoreBoardTheme.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
  },
  compactActionText: {
    fontSize: 11,
    fontWeight: "500",
    color: ScoreBoardTheme.onSurfaceVariant,
  },
  compactFinishBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: ScoreBoardTheme.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
  },
  compactFinishText: {
    fontSize: 11,
    fontWeight: "600",
    color: ScoreBoardTheme.error,
  },
  gridRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "stretch",
    gap: 10,
  },
  teamRailWrapLeft: {
    flex: 1.25,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  teamRailWrapRight: {
    flex: 1.25,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  teamColumnSlot: {
    flex: 1,
    height: "100%",
    justifyContent: "center",
  },
  sideRail: {
    width: 44,
    gap: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  centerSlot: {
    flex: 0.9,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  teamCol: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  teamName: {
    fontSize: 14,
    fontWeight: "600",
    color: ScoreBoardTheme.onSurface,
    textAlign: "center",
    marginBottom: 4,
  },
  subLabelSlot: {
    height: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  scoreWrap: {
    marginVertical: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreDigital: {
    fontFamily: "Digital7Mono",
    fontSize: 64,
    lineHeight: 68,
    color: ScoreBoardTheme.onSurface,
    fontVariant: ["tabular-nums"],
  },
  pillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 4,
    marginTop: 6,
  },
  actionBtn: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
  },
  btnPrimary: {
    backgroundColor: ScoreBoardTheme.onSurface,
  },
  btnSecondary: {
    backgroundColor: ScoreBoardTheme.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
  },
  btnWarning: {
    backgroundColor: ScoreBoardTheme.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.25)",
  },
  btnDanger: {
    backgroundColor: ScoreBoardTheme.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: "rgba(244, 63, 94, 0.25)",
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: "700",
  },
});
