import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Alert } from "react-native";
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
 * Ficha Oficial Premier Padel — Comunidad de Madrid Premier Padel P1 2024
 * Final Masculina: Arturo Coello / Agustín Tapia vs Alejandro Galán / Federico Chingotto
 * Regras: FIP / Premier Padel — Ponto de Ouro (Golden Point) a 40-40
 */
const mockMadridP1Match = {
  id: "madrid-p1-final-mob",
  sport_type: "Padel",
  court: "Pista Central — WiZink Center",
  participants: [
    { name: "A. Coello / A. Tapia" },
    { name: "A. Galán / F. Chingotto" },
  ],
  scores: {
    serving_index: 0, // Coello / Tapia a servir
    tennis: {
      points: [0, 0],
      games: [0, 0],
      sets: [],
      stats: {
        aces: { home: 1, away: 0 },
        double_faults: { home: 0, away: 1 },
      },
    },
  },
  tournaments: { name: "Comunidad de Madrid Premier Padel P1" },
};

describe("Mobile Padel UI Interaction Tests — Madrid Premier Padel P1 (Coello/Tapia vs Galán/Chingotto)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders participants and initial games score", () => {
    render(<TennisScoreboard matchData={mockMadridP1Match} canEdit={true} />);

    expect(screen.getAllByText("A. Coello / A. Tapia")[0]).toBeInTheDocument();
    expect(screen.getAllByText("A. Galán / F. Chingotto")[0]).toBeInTheDocument();
    expect(screen.getByText("JOGOS")).toBeInTheDocument();
    expect(screen.getByText("0 - 0")).toBeInTheDocument();
  });

  it("triggers and displays 'PONTO DE OURO' at 40-40 without advantage", async () => {
    render(<TennisScoreboard matchData={mockMadridP1Match} canEdit={true} />);

    const addPointButtons = screen.getAllByText("PONTO");
    const coelloAddPoint = addPointButtons[0];
    const galanAddPoint = addPointButtons[1];

    // Rally 1: 15 - 0
    fireEvent.click(coelloAddPoint);
    // Rally 2: 15 - 15
    fireEvent.click(galanAddPoint);
    // Rally 3: 30 - 15
    fireEvent.click(coelloAddPoint);
    // Rally 4: 30 - 30
    fireEvent.click(galanAddPoint);
    // Rally 5: 40 - 30
    fireEvent.click(coelloAddPoint);
    // Rally 6: 40 - 40 -> Golden Point!
    fireEvent.click(galanAddPoint);

    // Verify Ponto de Ouro alert banner in Padel (no-ad)
    expect(screen.getByText("PONTO DE OURO")).toBeInTheDocument();

    // Verify both have 40
    const digitalScores = screen.getAllByText("40");
    expect(digitalScores.length).toBeGreaterThanOrEqual(2);

    // Winner of Golden Point
    fireEvent.click(coelloAddPoint);
    expect(insertMock).toHaveBeenLastCalledWith(
      "match_events",
      expect.arrayContaining([
        expect.objectContaining({
          event_data: expect.objectContaining({ type: "point_won", side: "home" }),
        }),
      ])
    );
  });

  it("allows undoing a point (-1) when referee changes a challenge decision", async () => {
    const matchWithPoints = {
      ...mockMadridP1Match,
      scores: {
        serving_index: 0,
        tennis: {
          points: [2, 1], // 30 - 15
          games: [4, 3],
          stats: { aces: { home: 0, away: 0 }, double_faults: { home: 0, away: 0 } },
        },
      },
    };

    render(<TennisScoreboard matchData={matchWithPoints} canEdit={true} />);

    const undoButtons = screen.getAllByText("-1");
    const undoHomeBtn = undoButtons[0];

    // Click undo for Coello/Tapia (30 -> 15)
    fireEvent.click(undoHomeBtn);

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        scores: expect.objectContaining({
          tennis: expect.objectContaining({
            points: [1, 1],
          }),
        }),
      })
    );
  });

  it("prompts confirmation alert and terminates match when clicking Terminar button", async () => {
    const alertSpy = vi.spyOn(Alert, "alert");

    render(<TennisScoreboard matchData={mockMadridP1Match} canEdit={true} />);

    const finalizeBtn = screen.getByText("Terminar");
    fireEvent.click(finalizeBtn);

    expect(alertSpy).toHaveBeenCalledWith(
      "Terminar Jogo",
      expect.stringContaining("Tens a certeza que queres terminar este jogo de Padel?"),
      expect.any(Array)
    );

    // Simulate pressing the Confirm button on the alert
    const confirmAction = alertSpy.mock.calls[0][2]?.find(
      (btn) => btn.text === "Terminar" || btn.style === "destructive"
    );
    if (confirmAction?.onPress) {
      await confirmAction.onPress();
    }

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "completed",
      })
    );
  });
});
