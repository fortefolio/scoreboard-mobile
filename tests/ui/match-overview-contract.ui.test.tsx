import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import { LanguageProvider } from "@/lib/i18n";
import MatchDetailScreen from "../../src/app/match/[id]";
import {
  createInitialTennisScores,
  calculateTennisScore,
} from "@/lib/scoring/tennis-engine";
import {
  createInitialVolleyballScores,
  calculateVolleyballScore,
} from "@/lib/scoring/volleyball-engine";
import type { MatchScores } from "@/lib/scoring/types";

vi.mock("expo-router", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  useLocalSearchParams: () => ({ id: "contract-match-1" }),
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
              single: () => Promise.resolve({ data: mockMatchData, error: null }),
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
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: null, error: null }),
            single: () => Promise.resolve({ data: null, error: null }),
          }),
        }),
      };
    },
    channel: () => ({
      on: function () { return this; },
      subscribe: () => ({}),
    }),
    removeChannel: vi.fn(),
  },
}));

describe("Producer-to-Consumer Contract Tests (Scoring Engine -> MatchDetailScreen)", () => {
  beforeEach(() => {
    mockMatchData = null;
  });

  it("renders real calculateTennisScore output (completed set 6-0 + live 30-15 in set 2)", async () => {
    let state = createInitialTennisScores(0);
    // Win Set 1: 6 games x 4 points = 24 points for player 0
    for (let i = 0; i < 24; i++) {
      state = calculateTennisScore(state, 0, { max_sets: 3 });
    }
    // Set 2: 2 points for player 0 (30), 1 point for player 1 (15)
    state = calculateTennisScore(state, 0, { max_sets: 3 });
    state = calculateTennisScore(state, 0, { max_sets: 3 });
    state = calculateTennisScore(state, 1, { max_sets: 3 });

    const typedScores: MatchScores = state;

    mockMatchData = {
      id: "contract-match-1",
      sport_type: "Tennis",
      status: "ongoing",
      organizer_id: "org-1",
      tournament_id: null,
      participants: [{ name: "Carlos Alcaraz" }, { name: "Jannik Sinner" }],
      scores: typedScores,
      settings: { max_sets: 3 },
    };

    render(
      <LanguageProvider>
        <MatchDetailScreen />
      </LanguageProvider>
    );

    const summaryTable = await screen.findByTestId("match-summary-table");
    // S1 completed set score (6-0) must render from object sets
    expect(within(summaryTable).getByText("6")).toBeInTheDocument();
    // Live points (30-15)
    expect(within(summaryTable).getByText("30")).toBeInTheDocument();
    expect(within(summaryTable).getByText("15")).toBeInTheDocument();
    // Breakdown renders
    expect(screen.getByTestId("tennis-score-breakdown")).toBeInTheDocument();
  });

  it("renders real calculateVolleyballScore output (completed set 25-0 + live 2-1 in set 2)", async () => {
    let state = createInitialVolleyballScores(0);
    for (let i = 0; i < 25; i++) {
      state = calculateVolleyballScore(state, "home", { max_sets: 5 });
    }
    state = calculateVolleyballScore(state, "home", { max_sets: 5 });
    state = calculateVolleyballScore(state, "home", { max_sets: 5 });
    state = calculateVolleyballScore(state, "away", { max_sets: 5 });

    const typedScores: MatchScores = state;

    mockMatchData = {
      id: "contract-match-1",
      sport_type: "Volleyball",
      status: "ongoing",
      organizer_id: "org-1",
      tournament_id: null,
      participants: [{ name: "Porto Volley" }, { name: "Benfica Volley" }],
      scores: typedScores,
      settings: { max_sets: 5 },
    };

    render(
      <LanguageProvider>
        <MatchDetailScreen />
      </LanguageProvider>
    );

    const summaryTable = await screen.findByTestId("match-summary-table");
    expect(within(summaryTable).getByText("25")).toBeInTheDocument();
    expect(within(summaryTable).getByText("2")).toBeInTheDocument();
    expect(within(summaryTable).getAllByText("1")).toHaveLength(2);
  });
});
