import React from "react";
import { TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/components/AuthProvider";
import { useFollow } from "@/lib/hooks/useFollow";

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
        <ActivityIndicator size="small" color="#fbbf24" />
      ) : (
        <Ionicons
          name={following ? "star" : "star-outline"}
          size={size}
          color={following ? "#fbbf24" : "rgba(220, 225, 251, 0.4)"}
        />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  btnActive: {
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    borderColor: "rgba(245, 158, 11, 0.35)",
  },
});
