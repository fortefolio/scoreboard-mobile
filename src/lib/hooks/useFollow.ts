import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase/client";

export type EntityType = "match" | "tournament" | "team" | "player" | "competition";

export function useFollow() {
  const { user } = useAuth();
  const [followedMatchIds, setFollowedMatchIds] = useState<Set<string>>(new Set());
  const [followedTournamentIds, setFollowedTournamentIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<boolean>(true);
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());

  const fetchFollows = useCallback(async () => {
    if (!user) {
      setFollowedMatchIds(new Set());
      setFollowedTournamentIds(new Set());
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("follows")
        .select("entity_id, entity_type")
        .eq("user_id", user.id);

      if (error) {
        console.warn("Error fetching follows:", error.message);
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

      setFollowedMatchIds(matchIds);
      setFollowedTournamentIds(tournamentIds);
    } catch (err) {
      console.warn("Failed to load follows:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchFollows();
  }, [fetchFollows]);

  const isFollowing = useCallback(
    (entityId: string, entityType: "match" | "tournament"): boolean => {
      if (entityType === "match") {
        return followedMatchIds.has(entityId);
      }
      return followedTournamentIds.has(entityId);
    },
    [followedMatchIds, followedTournamentIds]
  );

  const toggleFollow = useCallback(
    async (entityId: string, entityType: "match" | "tournament"): Promise<boolean> => {
      if (!user) {
        return false;
      }

      const currentlyFollowing = isFollowing(entityId, entityType);
      const nextState = !currentlyFollowing;

      // Optimistic update
      if (entityType === "match") {
        setFollowedMatchIds((prev) => {
          const next = new Set(prev);
          if (nextState) next.add(entityId);
          else next.delete(entityId);
          return next;
        });
      } else {
        setFollowedTournamentIds((prev) => {
          const next = new Set(prev);
          if (nextState) next.add(entityId);
          else next.delete(entityId);
          return next;
        });
      }

      setUpdatingIds((prev) => new Set(prev).add(entityId));

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
        // Rollback
        if (entityType === "match") {
          setFollowedMatchIds((prev) => {
            const next = new Set(prev);
            if (currentlyFollowing) next.add(entityId);
            else next.delete(entityId);
            return next;
          });
        } else {
          setFollowedTournamentIds((prev) => {
            const next = new Set(prev);
            if (currentlyFollowing) next.add(entityId);
            else next.delete(entityId);
            return next;
          });
        }
        return currentlyFollowing;
      } finally {
        setUpdatingIds((prev) => {
          const next = new Set(prev);
          next.delete(entityId);
          return next;
        });
      }
    },
    [user, isFollowing]
  );

  return {
    followedMatchIds,
    followedTournamentIds,
    loading,
    updatingIds,
    isFollowing,
    toggleFollow,
    refetchFollows: fetchFollows,
  };
}
