import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

const { mockSupabase } = vi.hoisted(() => ({
  mockSupabase: {
    from: vi.fn(),
  },
}));

vi.mock("@/components/AuthProvider", () => ({
  useAuth: () => ({
    user: { id: "user-follow-1", email: "fan@scoreboard.app" },
  }),
}));

vi.mock("@/lib/supabase/client", () => ({
  supabase: mockSupabase,
}));

import { useFollow } from "@/lib/hooks/useFollow";

describe("useFollow shared store synchronization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.from.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
      insert: vi.fn().mockResolvedValue({ error: null }),
      delete: vi.fn().mockReturnValue({
        match: vi.fn().mockResolvedValue({ error: null }),
      }),
    }));
  });

  it("synchronizes match & tournament favorites across multiple mounted hook consumers", async () => {
    const { result: cardHook } = renderHook(() => useFollow());
    const { result: favoritesTabHook } = renderHook(() => useFollow());

    await waitFor(() => {
      expect(cardHook.current.loading).toBe(false);
    });

    expect(favoritesTabHook.current.followedMatchIds.has("match-99")).toBe(false);

    // Toggle favorite from a MatchCard
    await act(async () => {
      await cardHook.current.toggleFollow("match-99", "match");
    });

    // Both the card and the Favorites tab see the update immediately
    expect(cardHook.current.isFollowing("match-99", "match")).toBe(true);
    expect(favoritesTabHook.current.followedMatchIds.has("match-99")).toBe(true);

    // Unfavorite from the Favorites tab
    await act(async () => {
      await favoritesTabHook.current.toggleFollow("match-99", "match");
    });

    expect(cardHook.current.isFollowing("match-99", "match")).toBe(false);
    expect(favoritesTabHook.current.followedMatchIds.has("match-99")).toBe(false);
  });
});
