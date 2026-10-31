import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { VolleyballScoreboard } from "@/components/scoreboards/VolleyballScoreboard";

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
 * Ficha Oficial FPV — Liga UNA Seguros Jogo nº 136
 * Clube Kairós vs VC Viana (3-2: 19-25, 25-22, 25-20, 18-25, 15-10)
 * Pavilhão CD Laranjeiras, Ponta Delgada
 */
const mockVolleyball136Match = {
  id: "fpv-una-match-136-mob",
  sport_type: "Volleyball",
  court: "Pavilhão CD Laranjeiras — Ponta Delgada",
  participants: [
    { name: "Clube Kairós" },
    { name: "VC Viana" },
  ],
  scores: {
    serving_index: null,
    current: { home: 0, away: 0 },
    volleyball: {
      sets: [],
      current_points: [0, 0],
      timeouts: { home: 2, away: 2 },
    },
  },
  tournaments: { name: "Liga UNA Seguros 2026/27" },
};

describe("Mobile Volleyball UI Interaction Tests — FPV Liga UNA Seguros (Clube Kairós vs VC Viana)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("handles toss coin selection to set Clube Kairós as first server", async () => {
    render(<VolleyballScoreboard matchData={mockVolleyball136Match} canEdit={true} />);

    expect(screen.getByText("QUEM EFETUA O PRIMEIRO SERVIÇO?")).toBeInTheDocument();

    const kairosTossBtn = screen.getAllByText("Clube Kairós")[0];
    fireEvent.click(kairosTossBtn);

    expect(insertMock).toHaveBeenCalledWith(
      "match_events",
      expect.arrayContaining([
        expect.objectContaining({
          match_id: "fpv-una-match-136-mob",
          event_data: { type: "start_scoreboard", initial_server_index: 0 },
        }),
      ])
    );
  });

  it("simulates rally scoring (PONTO), side-out service rotation, and -1 correction", async () => {
    const matchWithServer = {
      ...mockVolleyball136Match,
      scores: {
        ...mockVolleyball136Match.scores,
        serving_index: 0, // Clube Kairós serving
      },
    };

    render(<VolleyballScoreboard matchData={matchWithServer} canEdit={true} />);

    const pointButtons = screen.getAllByText("PONTO");
    const kairosAddPoint = pointButtons[0];
    const vianaAddPoint = pointButtons[1];

    // Rally 1: Kairós scores (PONTO) -> 1 - 0
    fireEvent.click(kairosAddPoint);
    expect(insertMock).toHaveBeenCalledWith(
      "match_events",
      expect.arrayContaining([
        expect.objectContaining({
          event_data: expect.objectContaining({ type: "point_won", side: "home" }),
        }),
      ])
    );

    // Rally 2: VC Viana scores sideout (PONTO) -> 1 - 1 (server auto-rotates to away)
    fireEvent.click(vianaAddPoint);
    expect(insertMock).toHaveBeenCalledWith(
      "match_events",
      expect.arrayContaining([
        expect.objectContaining({
          event_data: expect.objectContaining({ type: "point_won", side: "away" }),
        }),
      ])
    );

    // Server rotated to VC Viana: A SERVIR badge visible on away side
    expect(screen.getByText("A SERVIR")).toBeInTheDocument();

    // Correction: referee corrects call with -1
    const undoButtons = screen.getAllByText("-1");
    fireEvent.click(undoButtons[1]);

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        scores: expect.objectContaining({
          volleyball: expect.objectContaining({
            current_points: [1, 0],
          }),
        }),
      })
    );
  });

  it("decrements team timeouts when Desconto button is clicked", async () => {
    const matchWithServer = {
      ...mockVolleyball136Match,
      scores: {
        ...mockVolleyball136Match.scores,
        serving_index: 0,
      },
    };

    render(<VolleyballScoreboard matchData={matchWithServer} canEdit={true} />);

    const timeoutBtns = screen.getAllByText("Desconto");
    const kairosTimeout = timeoutBtns[0];

    fireEvent.click(kairosTimeout);

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        scores: expect.objectContaining({
          volleyball: expect.objectContaining({
            timeouts: expect.objectContaining({ home: 1 }),
          }),
        }),
      })
    );
  });

  it("handles deciding 5th set target points of 15 and displays 'SET 5 (NEGRA)'", () => {
    const matchIn5thSet = {
      ...mockVolleyball136Match,
      scores: {
        serving_index: 0,
        volleyball: {
          sets: [
            { home: 19, away: 25 },
            { home: 25, away: 22 },
            { home: 25, away: 20 },
            { home: 18, away: 25 },
          ],
          current_points: [8, 7],
          timeouts: { home: 2, away: 2 },
        },
      },
    };

    render(<VolleyballScoreboard matchData={matchIn5thSet} canEdit={true} />);

    // In 5th set, target is 15 points
    expect(screen.getByText("SET 5 (NEGRA)")).toBeInTheDocument();
    expect(screen.getByText("15")).toBeInTheDocument();
  });
});
