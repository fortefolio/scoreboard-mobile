import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TennisScoreboard } from "@/components/scoreboards/TennisScoreboard";

const insertMock = vi.fn().mockResolvedValue({ error: null });
const updateMock = vi.fn().mockReturnValue({
  eq: vi.fn().mockResolvedValue({ error: null }),
});

vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    from: (table: string) => ({
      insert: (payload: any) => insertMock(table, payload),
      update: (payload: any) => updateMock(payload),
    }),
  },
}));

/**
 * 2023 Wimbledon Men's Singles Final (Centre Court, London)
 * Carlos Alcaraz vs Novak Djokovic
 * Source dataset: JeffSackmann/tennis_MatchChartingProject
 */
const mockWimbledonFinalMatch = {
  id: "wimbledon-2023-final-mob",
  sport_type: "Tennis",
  court: "Centre Court — Wimbledon",
  participants: [
    { name: "Carlos Alcaraz" },
    { name: "Novak Djokovic" },
  ],
  scores: {
    serving_index: null,
    tennis: {
      points: [0, 0],
      games: [0, 0],
      sets: [],
      stats: {
        aces: { home: 0, away: 0 },
        double_faults: { home: 0, away: 0 },
      },
    },
  },
  tournaments: { name: "Wimbledon Championships 2023" },
};

describe("Mobile Tennis UI Interaction Tests — 2023 Wimbledon Final (Alcaraz vs Djokovic)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("handles initial coin toss selection and activates scoreboard UI for Djokovic serving", async () => {
    render(<TennisScoreboard matchData={mockWimbledonFinalMatch} canEdit={true} />);

    // Toss banner must be displayed
    expect(screen.getByText("SELECIONE QUEM SERVE PRIMEIRO")).toBeInTheDocument();

    // Select Djokovic as first server
    const djokovicTossBtn = screen.getAllByText("Novak Djokovic")[0];
    fireEvent.click(djokovicTossBtn);

    // Verifies events dispatched to backend
    expect(insertMock).toHaveBeenCalledWith(
      "match_events",
      expect.arrayContaining([
        expect.objectContaining({
          match_id: "wimbledon-2023-final-mob",
          event_data: { type: "start_scoreboard" },
        }),
        expect.objectContaining({
          match_id: "wimbledon-2023-final-mob",
          event_data: { type: "toss_coin", winner_index: 1 },
        }),
      ])
    );
  });

  it("replays the Set 3 Game 5 13-deuce marathon: points, aces, double faults, deuces and break points", async () => {
    const matchInProgress = {
      ...mockWimbledonFinalMatch,
      scores: {
        serving_index: 1, // Djokovic serving
        tennis: {
          points: [0, 0],
          games: [3, 1],
          sets: [
            { home: 1, away: 6 },
            { home: 7, away: 6 },
          ],
          stats: {
            aces: { home: 4, away: 2 },
            double_faults: { home: 1, away: 2 },
          },
        },
      },
    };

    render(<TennisScoreboard matchData={matchInProgress} canEdit={true} />);

    const addPointButtons = screen.getAllByText("PONTO");
    const alcarazAddPoint = addPointButtons[0];
    const djokovicAddPoint = addPointButtons[1];

    const aceButtons = screen.getAllByText("Ás (Ace)");
    const djokovicAceBtn = aceButtons[1];

    const dfButtons = screen.getAllByText("Falta Dupla");
    const djokovicDfBtn = dfButtons[1];

    // Rally 1: Alcaraz hits return winner -> 15-0
    fireEvent.click(alcarazAddPoint);
    expect(insertMock).toHaveBeenCalledWith(
      "match_events",
      expect.arrayContaining([
        expect.objectContaining({
          event_data: expect.objectContaining({ type: "point_won", side: "home" }),
        }),
      ])
    );

    // Rally 2: Djokovic hits an Ace -> 15-15
    fireEvent.click(djokovicAceBtn);
    await waitFor(() => {
      expect(insertMock).toHaveBeenCalledWith(
        "match_events",
        expect.arrayContaining([
          expect.objectContaining({
            event_data: { type: "tennis_stat", stat: "ace", side: "away" },
          }),
        ])
      );
    });

    // Rally 3: Djokovic double faults -> 30-15
    fireEvent.click(djokovicDfBtn);
    await waitFor(() => {
      expect(insertMock).toHaveBeenCalledWith(
        "match_events",
        expect.arrayContaining([
          expect.objectContaining({
            event_data: { type: "tennis_stat", stat: "double_fault", side: "away" },
          }),
        ])
      );
    });

    // Advance to 40-40 (Deuce #1)
    fireEvent.click(djokovicAddPoint); // 30-30
    fireEvent.click(alcarazAddPoint);  // 40-30 Alcaraz (Break Point!)

    // Check Break Point indicator
    expect(screen.getByText("BREAK POINT")).toBeInTheDocument();

    // Djokovic saves Break Point -> 40-40 (Deuce)
    fireEvent.click(djokovicAddPoint);
    expect(screen.getByText("DEUCE")).toBeInTheDocument();

    // Djokovic gets Advantage (Ad-40)
    fireEvent.click(djokovicAddPoint);
    expect(screen.getAllByText("AD").length).toBeGreaterThan(0);

    // Alcaraz brings it back to Deuce
    fireEvent.click(alcarazAddPoint);
    expect(screen.getByText("DEUCE")).toBeInTheDocument();

    // Alcaraz gets Advantage (Break Point)
    fireEvent.click(alcarazAddPoint);
    expect(screen.getByText("BREAK POINT")).toBeInTheDocument();
    expect(screen.getAllByText("AD").length).toBeGreaterThan(0);
  });

  it("allows referee to manually switch server using Alternar Servidor button", async () => {
    const matchData = {
      ...mockWimbledonFinalMatch,
      scores: {
        serving_index: 0,
        tennis: {
          points: [0, 0],
          games: [1, 0],
          stats: { aces: { home: 0, away: 0 }, double_faults: { home: 0, away: 0 } },
        },
      },
    };

    render(<TennisScoreboard matchData={matchData} canEdit={true} />);

    const toggleServerBtn = screen.getByText("Alternar Servidor");
    fireEvent.click(toggleServerBtn);

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        scores: expect.objectContaining({
          serving_index: 1,
        }),
      })
    );
  });
});
