import React from "react";
import { TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/components/AuthProvider";
import { useFollow } from "@/lib/hooks/useFollow";
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
});
