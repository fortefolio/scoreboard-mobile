import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LanguageProvider } from "@/lib/i18n";
import {
  GroupedMatchList,
  groupMatchesByTournament,
} from "@/components/GroupedMatchList";
import { MatchListItem } from "@/components/MatchListItem";

const mockPush = vi.fn();
vi.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/components/AuthProvider", () => ({
  useAuth: () => ({ user: { id: "u1", email: "user@test.com" } }),
}));

vi.mock("@/lib/hooks/useFollow", () => ({
  useFollow: () => ({
    isFollowing: () => false,
    toggleFollow: vi.fn(),
    updatingIds: new Set(),
  }),
}));

const sampleMatches = [
  {
    id: "m1",
    sport_type: "Tennis",
    status: "live",
    tournament_id: "t1",
    tournaments: { name: "Lisbon Open 2026" },
    organizer: { username: "organizer1" },
    participants: [{ name: "Braga" }, { name: "Évora" }],
    scores: { tennis: { sets: [[6, 4]], games: [2, 1], points: [1, 0] } },
  },
  {
    id: "m2",
    sport_type: "Tennis",
    status: "scheduled",
    tournament_id: "t1",
    tournaments: { name: "Lisbon Open 2026" },
    organizer: { username: "organizer1" },
    participants: [{ name: "Porto" }, { name: "Coimbra" }],
    scores: {},
  },
  {
    id: "m3",
    sport_type: "Football",
    status: "completed",
    tournament_id: null,
    tournaments: null,
    organizer: { username: "organizer2" },
    participants: [{ name: "Sporting" }, { name: "Benfica" }],
    scores: { current: { home: 2, away: 1 } },
  },
];

describe("GroupedMatchList & MatchListItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("groupMatchesByTournament groups by tournament_id and places null into __standalone__ preserving order", () => {
    const groups = groupMatchesByTournament(sampleMatches);
    expect(groups).toHaveLength(2);
    expect(groups[0].key).toBe("t1");
    expect(groups[0].tournamentName).toBe("Lisbon Open 2026");
    expect(groups[0].matches).toHaveLength(2);

    expect(groups[1].key).toBe("__standalone__");
    expect(groups[1].tournamentId).toBeNull();
    expect(groups[1].matches).toHaveLength(1);
  });

  it("renders single tournament header with @organizer, Standalone Matches header, and no View Tournament link", () => {
    render(
      <LanguageProvider>
        <GroupedMatchList matches={sampleMatches} showOrganizer={true} />
      </LanguageProvider>
    );

    // Tournament header appears once even with 2 matches
    expect(screen.getAllByText("Lisbon Open 2026")).toHaveLength(1);
    expect(screen.getByText("@organizer1")).toBeInTheDocument();
    expect(screen.getByText(/Standalone Matches|Jogos Isolados/)).toBeInTheDocument();
    expect(screen.queryByText(/View Tournament|Ver Torneio/i)).not.toBeInTheDocument();

    // Matches are rendered inside groups
    expect(screen.getByText("Braga")).toBeInTheDocument();
    expect(screen.getByText("Porto")).toBeInTheDocument();
    expect(screen.getByText("Sporting")).toBeInTheDocument();
  });

  it("hides @organizer when showOrganizer is false", () => {
    render(
      <LanguageProvider>
        <GroupedMatchList matches={sampleMatches} showOrganizer={false} />
      </LanguageProvider>
    );

    expect(screen.queryByText("@organizer1")).not.toBeInTheDocument();
  });

  it("collapses and expands a group, showing Matches (N) / Jogos (N) when collapsed", () => {
    render(
      <LanguageProvider>
        <GroupedMatchList matches={sampleMatches} />
      </LanguageProvider>
    );

    const chevrons = screen.getAllByTestId("icon-chevron-up");
    fireEvent.click(chevrons[0]);

    // Collapsed tournament group hides its 2 matches and shows count
    expect(screen.queryByText("Braga")).not.toBeInTheDocument();
    expect(screen.queryByText("Porto")).not.toBeInTheDocument();
    expect(screen.getByText(/(Matches|Jogos) \(2\)/)).toBeInTheDocument();

    // Standalone match remains visible
    expect(screen.getByText("Sporting")).toBeInTheDocument();

    // Expand again
    fireEvent.click(screen.getByTestId("icon-chevron-down"));
    expect(screen.getByText("Braga")).toBeInTheDocument();
  });

  it("MatchListItem toggles SportFavoriteButton vs plain SportIcon box via showFavorite", () => {
    const { rerender } = render(
      <LanguageProvider>
        <MatchListItem match={sampleMatches[2]} showFavorite={true} />
      </LanguageProvider>
    );
    expect(screen.getByTestId("icon-star-outline")).toBeInTheDocument();

    rerender(
      <LanguageProvider>
        <MatchListItem match={sampleMatches[2]} showFavorite={false} />
      </LanguageProvider>
    );
    expect(screen.queryByTestId("icon-star-outline")).not.toBeInTheDocument();
    expect(screen.getByTestId("icon-football")).toBeInTheDocument();
  });
});
