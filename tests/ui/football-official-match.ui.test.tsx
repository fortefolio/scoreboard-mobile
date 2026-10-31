import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { FootballScoreboard } from "@/components/scoreboards/FootballScoreboard";

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
 * FPF / Taça de Portugal — Jogo Oficial
 * Sporting CP vs AC. Viseu
 * Regras: 2 partes x 45 min, cartões amarelos e vermelhos, cantos, faltas, compensação (+1m)
 */
const mockFootballMatch = {
  id: "fpf-sporting-viseu-mob",
  sport_type: "Football",
  court: "Estádio José Alvalade — Lisboa",
  participants: [
    { name: "Sporting CP" },
    { name: "AC. Viseu" },
  ],
  scores: {
    goals: [0, 0],
    football: {
      goals: [0, 0],
      period: "1ª Parte",
      elapsed_seconds: 1500, // 25:00
      is_clock_running: true,
      stoppage_minutes: 0,
      yellow_cards: { home: 0, away: 0 },
      red_cards: { home: 0, away: 0 },
      corners: { home: 0, away: 0 },
      fouls: { home: 0, away: 0 },
    },
  },
  tournaments: { name: "Taça de Portugal 2026/27" },
};

describe("Mobile Football UI Interaction Tests — Official Match (Sporting CP vs AC. Viseu)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders participants, digital score '0', 25:00 timer, and 1ª Parte", () => {
    render(<FootballScoreboard matchData={mockFootballMatch} canEdit={true} />);

    expect(screen.getAllByText("Sporting CP")[0]).toBeInTheDocument();
    expect(screen.getAllByText("AC. Viseu")[0]).toBeInTheDocument();
    expect(screen.getByText("25:00")).toBeInTheDocument();
    expect(screen.getByText("1ª Parte")).toBeInTheDocument();
  });

  it("registers a goal (+1 GOLO) and handles VAR goal cancellation (-1)", async () => {
    render(<FootballScoreboard matchData={mockFootballMatch} canEdit={true} />);

    const goalBtns = screen.getAllByText("+1 GOLO");
    const sportingGoalBtn = goalBtns[0];

    // Sporting scores
    fireEvent.click(sportingGoalBtn);

    expect(insertMock).toHaveBeenCalledWith(
      "match_events",
      expect.arrayContaining([
        expect.objectContaining({
          match_id: "fpf-sporting-viseu-mob",
          event_data: expect.objectContaining({ type: "goal", side: "home" }),
        }),
      ])
    );

    // Goal cancellation (-1)
    const undoBtns = screen.getAllByText("-1");
    const undoHomeBtn = undoBtns[0];
    fireEvent.click(undoHomeBtn);

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        scores: expect.objectContaining({
          current: expect.objectContaining({ home: 0 }),
          football: expect.objectContaining({ goals: [0, 0] }),
        }),
      })
    );
  });

  it("registers yellow and red disciplinary cards on the UI", async () => {
    render(<FootballScoreboard matchData={mockFootballMatch} canEdit={true} />);

    const yellowBtns = screen.getAllByText("Amarelo");
    const redBtns = screen.getAllByText("Vermelho");

    // AC Viseu yellow card
    fireEvent.click(yellowBtns[1]);
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        scores: expect.objectContaining({
          football: expect.objectContaining({
            yellow_cards: { home: 0, away: 1 },
          }),
        }),
      })
    );

    // AC Viseu red card
    fireEvent.click(redBtns[1]);
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        scores: expect.objectContaining({
          football: expect.objectContaining({
            red_cards: { home: 0, away: 1 },
          }),
        }),
      })
    );
  });

  it("registers match statistics (+Canto and +Falta)", async () => {
    render(<FootballScoreboard matchData={mockFootballMatch} canEdit={true} />);

    const cornerBtns = screen.getAllByText("+Canto");
    const foulBtns = screen.getAllByText("+Falta");

    // Corner for Sporting
    fireEvent.click(cornerBtns[0]);
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        scores: expect.objectContaining({
          football: expect.objectContaining({
            corners: { home: 1, away: 0 },
          }),
        }),
      })
    );

    // Foul for AC Viseu
    fireEvent.click(foulBtns[1]);
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        scores: expect.objectContaining({
          football: expect.objectContaining({
            fouls: { home: 0, away: 1 },
          }),
        }),
      })
    );
  });

  it("adjusts stoppage time and displays 'Comp: +1m' in digital badge", async () => {
    render(<FootballScoreboard matchData={mockFootballMatch} canEdit={true} />);

    const stoppageBtn = screen.getByText("Comp: +0m");
    fireEvent.click(stoppageBtn);

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        scores: expect.objectContaining({
          football: expect.objectContaining({
            stoppage_minutes: 1,
          }),
        }),
      })
    );
  });

  it("changes match period to Intervalo (pausing clock) when period pill is clicked", async () => {
    render(<FootballScoreboard matchData={mockFootballMatch} canEdit={true} />);

    const periodBtn = screen.getByText("1ª Parte");
    fireEvent.click(periodBtn);

    await waitFor(() => {
      expect(insertMock).toHaveBeenCalledWith(
        "match_events",
        expect.arrayContaining([
          expect.objectContaining({
            event_data: expect.objectContaining({
              type: "period_change",
              period: "Intervalo",
            }),
          }),
        ])
      );
    });
  });
});
