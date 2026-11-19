import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase/client";

export type EntityType = "match" | "tournament" | "team" | "player" | "competition";

interface FollowStoreState {
  userId: string | null;
  followedMatchIds: Set<string>;
  followedTournamentIds: Set<string>;
  loading: boolean;
  updatingIds: Set<string>;
}

let storeState: FollowStoreState = {
  userId: null,
  followedMatchIds: new Set(),
  followedTournamentIds: new Set(),
  loading: true,
  updatingIds: new Set(),
};

const listeners = new Set<(state: FollowStoreState) => void>();

function setStoreState(updater: (prev: FollowStoreState) => FollowStoreState) {
  storeState = updater(storeState);
  listeners.forEach((listener) => listener(storeState));
}

async function fetchFollowsForUser(userId: string | null) {
  if (!userId) {
    setStoreState((prev) => ({
      ...prev,
      userId: null,
      followedMatchIds: new Set(),
      followedTournamentIds: new Set(),
      loading: false,
    }));
    return;
  }

  setStoreState((prev) => ({ ...prev, userId, loading: true }));

  try {
    const { data, error } = await supabase
      .from("follows")
      .select("entity_id, entity_type")
      .eq("user_id", userId);

    if (error) {
      console.warn("Error fetching follows:", error.message);
      setStoreState((prev) => ({ ...prev, loading: false }));
      return;
    }

    const matchIds = new Set<string>();
    const tournamentIds = new Set<string>();

    (data || []).forEach((item: { entity_id: string; entity_type: string }) => {
      if (item.entity_type === "match") {
        matchIds.add(item.entity_id);
      } else if (item.entity_type === "tournament" || item.entity_type === "competition") {
        tournamentIds.add(item.entity_id);
      }
    });

    setStoreState((prev) => ({
      ...prev,
      userId,
      followedMatchIds: matchIds,
      followedTournamentIds: tournamentIds,
      loading: false,
    }));
  } catch (err) {
    console.warn("Failed to load follows:", err);
    setStoreState((prev) => ({ ...prev, loading: false }));
  }
}

export function useFollow() {
  const { user } = useAuth();
  const [state, setState] = useState<FollowStoreState>(storeState);

  useEffect(() => {
    listeners.add(setState);
    setState(storeState);
    return () => {
      listeners.delete(setState);
    };
  }, []);

  useEffect(() => {
    const nextUserId = user?.id ?? null;
    if (storeState.userId !== nextUserId) {
      fetchFollowsForUser(nextUserId);
    } else if (!nextUserId && storeState.loading) {
      fetchFollowsForUser(null);
    }
  }, [user?.id]);

  const refetchFollows = useCallback(async () => {
    await fetchFollowsForUser(user?.id ?? null);
  }, [user?.id]);

  const isFollowing = useCallback(
    (entityId: string, entityType: "match" | "tournament"): boolean => {
      if (entityType === "match") {
        return state.followedMatchIds.has(entityId);
      }
      return state.followedTournamentIds.has(entityId);
    },
    [state.followedMatchIds, state.followedTournamentIds]
  );

  const toggleFollow = useCallback(
    async (entityId: string, entityType: "match" | "tournament"): Promise<boolean> => {
      if (!user) {
        return false;
      }

      const currentlyFollowing =
        entityType === "match"
          ? storeState.followedMatchIds.has(entityId)
          : storeState.followedTournamentIds.has(entityId);
      const nextState = !currentlyFollowing;
      const updatingKey = `${entityType}:${entityId}`;

      // Optimistic update on shared store
      setStoreState((prev) => {
        const nextUpdating = new Set(prev.updatingIds);
        nextUpdating.add(updatingKey);

        if (entityType === "match") {
          const nextMatches = new Set(prev.followedMatchIds);
          if (nextState) nextMatches.add(entityId);
          else nextMatches.delete(entityId);
          return { ...prev, followedMatchIds: nextMatches, updatingIds: nextUpdating };
        }
        const nextTournaments = new Set(prev.followedTournamentIds);
        if (nextState) nextTournaments.add(entityId);
        else nextTournaments.delete(entityId);
        return { ...prev, followedTournamentIds: nextTournaments, updatingIds: nextUpdating };
      });

      try {
        if (currentlyFollowing) {
          const { error } = await supabase
            .from("follows")
            .delete()
            .match({ user_id: user.id, entity_id: entityId, entity_type: entityType });
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("follows")
            .insert({ user_id: user.id, entity_id: entityId, entity_type: entityType });
          if (error) throw error;
        }
        return nextState;
      } catch (err) {
        console.warn("Failed to toggle follow:", err);
        // Rollback on shared store
        setStoreState((prev) => {
          if (entityType === "match") {
            const nextMatches = new Set(prev.followedMatchIds);
            if (currentlyFollowing) nextMatches.add(entityId);
            else nextMatches.delete(entityId);
            return { ...prev, followedMatchIds: nextMatches };
          }
          const nextTournaments = new Set(prev.followedTournamentIds);
          if (currentlyFollowing) nextTournaments.add(entityId);
          else nextTournaments.delete(entityId);
          return { ...prev, followedTournamentIds: nextTournaments };
        });
        return currentlyFollowing;
      } finally {
        setStoreState((prev) => {
          const nextUpdating = new Set(prev.updatingIds);
          nextUpdating.delete(updatingKey);
          return { ...prev, updatingIds: nextUpdating };
        });
      }
    },
    [user]
  );

  return {
    followedMatchIds: state.followedMatchIds,
    followedTournamentIds: state.followedTournamentIds,
    loading: state.loading,
    updatingIds: state.updatingIds,
    isFollowing,
    toggleFollow,
    refetchFollows,
  };
}
