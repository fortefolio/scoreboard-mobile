import React from "react";
import { TouchableOpacity, View, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/components/AuthProvider";
import { useFollow } from "@/lib/hooks/useFollow";
import { SportIcon } from "@/components/SportIcon";
import { ScoreBoardTheme } from "@/constants/theme";

interface FollowButtonProps {
  entityId: string;
  entityType: "match" | "tournament";
  size?: number;
  onAuthRequired?: () => void;
}

export function FollowButton({
  entityId,
  entityType,
  size = 18,
  onAuthRequired,
}: FollowButtonProps) {
  const { user } = useAuth();
  const { isFollowing, toggleFollow, updatingIds } = useFollow();

  const following = isFollowing(entityId, entityType);
  const isUpdating = updatingIds.has(`${entityType}:${entityId}`);

  const handlePress = async () => {
    if (!user) {
      if (onAuthRequired) onAuthRequired();
      return;
    }
    await toggleFollow(entityId, entityType);
  };

  return (
    <TouchableOpacity
      style={[styles.btn, following && styles.btnActive]}
      onPress={handlePress}
      disabled={isUpdating}
      activeOpacity={0.7}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      {isUpdating ? (
        <ActivityIndicator size="small" color={ScoreBoardTheme.onSurface} />
      ) : (
        <Ionicons
          name={following ? "star" : "star-outline"}
          size={size}
          color={following ? ScoreBoardTheme.onSurface : ScoreBoardTheme.textMuted}
        />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: ScoreBoardTheme.surfaceContainer,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    justifyContent: "center",
    alignItems: "center",
  },
  btnActive: {
    backgroundColor: ScoreBoardTheme.surfaceContainerHighest,
    borderColor: ScoreBoardTheme.onSurfaceVariant,
  },
  sportBox: {
    borderRadius: 8,
    backgroundColor: ScoreBoardTheme.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  sportBoxActive: {
    borderColor: ScoreBoardTheme.onSurfaceVariant,
  },
  starBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 15,
    height: 15,
    borderRadius: 7.5,
    backgroundColor: ScoreBoardTheme.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: ScoreBoardTheme.borderSubtle,
    justifyContent: "center",
    alignItems: "center",
  },
  starBadgeActive: {
    backgroundColor: ScoreBoardTheme.onSurface,
    borderColor: ScoreBoardTheme.onSurface,
  },
});

export interface SportFavoriteButtonProps {
  entityId: string;
  entityType: "match" | "tournament";
  sport?: string | null;
  size?: "sm" | "md";
  onAuthRequired?: () => void;
}

export function SportFavoriteButton({
  entityId,
  entityType,
  sport,
  size = "sm",
  onAuthRequired,
}: SportFavoriteButtonProps) {
  const { user } = useAuth();
  const { isFollowing, toggleFollow, updatingIds } = useFollow();

  const following = isFollowing(entityId, entityType);
  const isUpdating = updatingIds.has(`${entityType}:${entityId}`);
  const dim = size === "sm" ? 30 : 34;
  const iconSize = size === "sm" ? 15 : 17;

  const handlePress = async () => {
    if (!user) {
      if (onAuthRequired) onAuthRequired();
      return;
    }
    await toggleFollow(entityId, entityType);
  };

  return (
    <TouchableOpacity
      style={[
        styles.sportBox,
        { width: dim, height: dim },
        following && styles.sportBoxActive,
      ]}
      onPress={handlePress}
      disabled={isUpdating}
      activeOpacity={0.75}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      accessibilityLabel={following ? "Unfollow" : "Follow"}
    >
      {isUpdating ? (
        <ActivityIndicator size="small" color={ScoreBoardTheme.onSurface} />
      ) : (
        <SportIcon
          sport={sport || ""}
          size={iconSize}
          color={following ? ScoreBoardTheme.onSurface : ScoreBoardTheme.onSurfaceVariant}
        />
      )}
      <View style={[styles.starBadge, following && styles.starBadgeActive]}>
        <Ionicons
          name={following ? "star" : "star-outline"}
          size={9}
          color={following ? ScoreBoardTheme.surfaceContainerLowest : ScoreBoardTheme.textMuted}
        />
      </View>
    </TouchableOpacity>
  );
}
