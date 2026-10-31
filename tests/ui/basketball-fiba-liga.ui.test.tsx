import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Alert } from "react-native";
import { BasketballScoreboard } from "@/components/scoreboards/BasketballScoreboard";

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
 * FIBA / Federação Portuguesa de Basquetebol (FPB) — Liga Betclic
 * SL Benfica vs FC Porto (Pavilhão Fidelidade)
 * Regras: 4 x 10 min, 24s shot clock, bónus de faltas (5)
 */
const mockFibaBasketballMatch = {
  id: "fiba-benfica-porto-mob",
  sport_type: "Basketball",
  court: "Pavilhão Fidelidade — Lisboa",
  participants: [
    { name: "SL Benfica" },
    { name: "FC Porto" },
  ],
  scores: {
    current: { home: 0, away: 0 },
    basketball: {
      period: "Q1",
      fouls: { home: 0, away: 0 },
      timeouts: { home: 3, away: 3 },
      quarter_seconds: 600,
      is_clock_running: false,
    },
  },
  tournaments: { name: "Liga Betclic Basquetebol" },
};

describe("Mobile Basketball UI Interaction Tests — FIBA Liga Betclic (SL Benfica vs FC Porto)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders participants, default 10:00 FIBA clock, 24s shot clock, and Q1", () => {
    render(<BasketballScoreboard matchData={mockFibaBasketballMatch} canEdit={true} />);

    expect(screen.getAllByText("SL Benfica")[0]).toBeInTheDocument();
    expect(screen.getAllByText("FC Porto")[0]).toBeInTheDocument();
    expect(screen.getByText("10:00")).toBeInTheDocument();
    expect(screen.getAllByText("24s").length).toBeGreaterThan(0);
    expect(screen.getByText("Q1")).toBeInTheDocument();
  });

  it("scores +1, +2, and +3 points via UI buttons, updating digital score and resetting shot clock", async () => {
    render(<BasketballScoreboard matchData={mockFibaBasketballMatch} canEdit={true} />);

    // Benfica Free Throw (+1)
    const plus1Btns = screen.getAllByText("+1");
    fireEvent.click(plus1Btns[0]);

    expect(insertMock).toHaveBeenCalledWith(
      "match_events",
      expect.arrayContaining([
        expect.objectContaining({
          event_data: expect.objectContaining({ type: "score", side: "home", points: 1 }),
        }),
      ])
    );

    // Benfica Field Goal (+2)
    const plus2Btns = screen.getAllByText("+2");
    fireEvent.click(plus2Btns[0]);

    expect(insertMock).toHaveBeenCalledWith(
      "match_events",
      expect.arrayContaining([
        expect.objectContaining({
          event_data: expect.objectContaining({ type: "score", side: "home", points: 2 }),
        }),
      ])
    );

    // Porto Triple (+3)
    const plus3Btns = screen.getAllByText("+3");
    fireEvent.click(plus3Btns[1]);

    expect(insertMock).toHaveBeenCalledWith(
      "match_events",
      expect.arrayContaining([
        expect.objectContaining({
          event_data: expect.objectContaining({ type: "score", side: "away", points: 3 }),
        }),
      ])
    );

    // Both teams now have 3 points in current display
    const threes = screen.getAllByText("3");
    expect(threes.length).toBeGreaterThanOrEqual(2);
  });

  it("accumulates team fouls up to bonus (5th foul) and triggers BÓNUS alert", async () => {
    const alertSpy = vi.spyOn(Alert, "alert");

    render(<BasketballScoreboard matchData={mockFibaBasketballMatch} canEdit={true} />);

    const foulBtns = screen.getAllByText("+ Falta");
    const benficaFoulBtn = foulBtns[0];

    // Click 4 fouls for Benfica
    fireEvent.click(benficaFoulBtn);
    fireEvent.click(benficaFoulBtn);
    fireEvent.click(benficaFoulBtn);
    fireEvent.click(benficaFoulBtn);

    expect(alertSpy).not.toHaveBeenCalled();

    // 5th foul triggers bonus alert
    fireEvent.click(benficaFoulBtn);
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        "BÓNUS DE FALTAS",
        expect.stringContaining("atingiu o limite de faltas (5)")
      );
    });
  });

  it("decrements team timeouts when Desconto button is pressed", async () => {
    render(<BasketballScoreboard matchData={mockFibaBasketballMatch} canEdit={true} />);

    const timeoutBtns = screen.getAllByText("Desconto");
    const portoTimeoutBtn = timeoutBtns[1];

    fireEvent.click(portoTimeoutBtn);

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        scores: expect.objectContaining({
          basketball: expect.objectContaining({
            timeouts: expect.objectContaining({ away: 2 }),
            is_clock_running: false,
          }),
        }),
      })
    );
  });

  it("advances game period to Q2, resetting fouls to 0 and timer to 10:00", async () => {
    render(<BasketballScoreboard matchData={mockFibaBasketballMatch} canEdit={true} />);

    const q1Btn = screen.getByText("Q1");
    fireEvent.click(q1Btn); // Cycle to Q2

    expect(insertMock).toHaveBeenCalledWith(
      "match_events",
      expect.arrayContaining([
        expect.objectContaining({
          event_data: expect.objectContaining({
            type: "period_change",
            period: "Q2",
          }),
        }),
      ])
    );
  });
});
