import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { LanguageProvider } from "@/lib/i18n";
import MatchDetailScreen from "../../src/app/match/[id]";

const mockPush = vi.fn();
const mockBack = vi.fn();

vi.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
  useLocalSearchParams: () => ({ id: "match-bb-1" }),
  useFocusEffect: vi.fn(),
}));

vi.mock("@/components/AuthProvider", () => ({
  useAuth: () => ({
    user: { id: "org-1", email: "org@scoreboard.dev" },
    signOut: vi.fn(),
  }),
}));

vi.mock("@/lib/hooks/useFollow", () => ({
  useFollow: () => ({
    isFollowing: () => false,
    toggleFollow: vi.fn(),
    updatingIds: new Set(),
  }),
}));

let mockMatchData: any = null;

vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      if (table === "matches") {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({ data: mockMatchData, error: null }),
            }),
          }),
        };
      }
      if (table === "match_events") {
        return {
          select: () => ({
            eq: () => ({
              order: () => Promise.resolve({ data: [], error: null }),
            }),
          }),
        };
      }
      if (table === "users") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({
                  data: { id: "org-1", username: "gjoforte", subscription_tier: "pro" },
                  error: null,
                }),
            }),
          }),
        };
      }
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: null, error: null }),
          }),
        }),
      };
    },
    channel: () => {
      const ch: any = {
        on: () => ch,
        subscribe: vi.fn(() => ch),
      };
      return ch;
    },
    removeChannel: vi.fn(),
  },
}));

describe("MatchDetailScreen (Match Overview)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Basketball scores from scores.current fallback when total_points is absent", async () => {
    mockMatchData = {
      id: "match-bb-1",
      sport_type: "Basketball",
      status: "ongoing",
      organizer_id: "org-1",
      tournament_id: "t-1",
      tournaments: { id: "t-1", name: "Liga Betclic", organizer_id: "org-1" },
      participants: [{ name: "LA Lakers" }, { name: "Golden State Warriors" }],
      scores: { current: { home: 88, away: 82 } },
      settings: {},
    };

    render(
      <LanguageProvider>
        <MatchDetailScreen />
      </LanguageProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("88")).toBeInTheDocument();
    });
    expect(screen.getByText("82")).toBeInTheDocument();
    expect(screen.getByText("@gjoforte")).toBeInTheDocument();
    expect(screen.getByText("Liga Betclic")).toBeInTheDocument();
    expect(screen.getByTestId("start-scoreboard-btn")).toBeInTheDocument();
  });

  it("renders Football scores from scores.current fallback when goals is absent", async () => {
    mockMatchData = {
      id: "match-fb-1",
      sport_type: "Football",
      status: "ongoing",
      organizer_id: "org-1",
      tournament_id: null,
      participants: [{ name: "Sporting CP" }, { name: "SL Benfica" }],
      scores: { current: { home: 3, away: 1 } },
      settings: {},
    };

    render(
      <LanguageProvider>
        <MatchDetailScreen />
      </LanguageProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("3")).toBeInTheDocument();
    });
    expect(screen.getByText("1")).toBeInTheDocument();
  });
});
