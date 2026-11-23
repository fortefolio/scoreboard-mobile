import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within, fireEvent } from "@testing-library/react";
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
const mockDeleteMatchEq = vi.fn().mockResolvedValue({ error: null });

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
          delete: () => ({
            eq: mockDeleteMatchEq,
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

  it("renders Tennis summary table and Set, Game & Point-by-Point Breakdown", async () => {
    mockMatchData = {
      id: "match-tennis-1",
      sport_type: "Tennis",
      status: "ongoing",
      organizer_id: "org-1",
      tournament_id: null,
      participants: [{ name: "Alexander Zverev" }, { name: "Carlos Alcaraz" }],
      scores: {
        serving_index: 0,
        tennis: {
          sets: [{ team1: 6, team2: 4 }],
          games: [2, 1],
          points: [2, 1],
          current_set_games: [
            {
              game_number: 1,
              winner: 0,
              serving_team: 0,
              points_progression: [
                [1, 0],
                [2, 0],
                [3, 0],
                [4, 0],
              ],
            },
          ],
        },
      },
      settings: {},
    };

    render(
      <LanguageProvider>
        <MatchDetailScreen />
      </LanguageProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("match-summary-table")).toBeInTheDocument();
    });
    const summaryTable = screen.getByTestId("match-summary-table");
    expect(within(summaryTable).getByText("6")).toBeInTheDocument();
    expect(within(summaryTable).getByText("4")).toBeInTheDocument();
    expect(within(summaryTable).getByText("30")).toBeInTheDocument();
    expect(within(summaryTable).getByText("15")).toBeInTheDocument();
    const breakdown = screen.getByTestId("tennis-score-breakdown");
    expect(breakdown).toBeInTheDocument();
    expect(within(breakdown).getByText("Game 1")).toBeInTheDocument();
  });

  it("opens custom Delete Match confirmation modal and deletes on confirm", async () => {
    mockDeleteMatchEq.mockClear();
    mockMatchData = {
      id: "match-del-1",
      sport_type: "Football",
      status: "scheduled",
      organizer_id: "org-1",
      tournament_id: null,
      participants: [{ name: "AAC" }, { name: "AAV" }],
      scores: { current: { home: 0, away: 0 } },
      settings: {},
    };

    render(
      <LanguageProvider>
        <MatchDetailScreen />
      </LanguageProvider>
    );

    const optionsBtn = await screen.findByTestId("icon-ellipsis-vertical");
    fireEvent.click(optionsBtn);

    const deleteMenuBtn = await screen.findByTestId("match-detail-delete-btn");
    fireEvent.click(deleteMenuBtn);

    const confirmModal = await screen.findByTestId("delete-match-confirm-modal");
    expect(confirmModal).toBeInTheDocument();

    const confirmBtn = screen.getByTestId("confirm-delete-match-btn");
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockDeleteMatchEq).toHaveBeenCalledWith("id", "match-bb-1");
    });
  });
});
