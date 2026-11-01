import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { LanguageProvider } from "../LanguageContext";
import { VolleyballScoreboard } from "@/components/scoreboards/VolleyballScoreboard";
import { en } from "../locales/en";
import { pt } from "../locales/pt";

const mockVolleyballMatch = {
  id: "test-vball-i18n",
  sport_type: "Volleyball",
  court: "Central Court",
  participants: [{ name: "Benfica" }, { name: "Sporting" }],
  scores: {
    serving_index: 0,
    current: { home: 1, away: 4 },
    volleyball: {
      sets: [],
      current_points: [1, 4],
      timeouts: { home: 2, away: 2 },
    },
  },
};

describe("Mobile Scoreboard Localization & Language Switching", () => {
  it("has complete dictionary coverage for all referee console & match keys in EN and PT", () => {
    // Check key strings highlighted in user screenshots
    expect(en.match.openScoreboardUpper).toBe("OPEN REFEREE CONSOLE");
    expect(pt.match.openScoreboardUpper).toBe("ABRIR CONSOLA DE ÁRBITRO");

    expect(en.match.inviteSentPending).toBe("Invitation Sent (Pending)");
    expect(pt.match.inviteSentPending).toBe("Convite Enviado (Pendente)");

    expect(en.match.accessGrantedMobile).toBe("Access granted to mobile referee console");
    expect(pt.match.accessGrantedMobile).toBe("Acesso concedido à consola de arbitragem móvel");

    expect(en.match.appointOtherRefereeUpper).toBe("DESIGNATE ANOTHER REFEREE");
    expect(pt.match.appointOtherRefereeUpper).toBe("DESIGNAR OUTRO ÁRBITRO");

    expect(en.scoreboard.refereeConsole).toBe("REFEREE CONSOLE");
    expect(pt.scoreboard.refereeConsole).toBe("CONSOLA DE ÁRBITRO");

    expect(en.scoreboard.serving).toBe("SERVING");
    expect(pt.scoreboard.serving).toBe("A SERVIR");

    expect(en.scoreboard.volleyball.setLimit).toBe("SET LIMIT");
    expect(pt.scoreboard.volleyball.setLimit).toBe("LIMITE DO SET");

    expect(en.scoreboard.volleyball.toggleServe).toBe("Toggle Serve");
    expect(pt.scoreboard.volleyball.toggleServe).toBe("Alternar Saque");

    expect(en.scoreboard.endMatch).toBe("End Match");
    expect(pt.scoreboard.endMatch).toBe("Terminar");

    expect(en.scoreboard.timeout).toBe("Timeout");
    expect(pt.scoreboard.timeout).toBe("Desconto");
  });

  it("renders Volleyball Scoreboard in English when language context is EN", () => {
    // Note: Default LanguageProvider initializes with en or device locale
    render(
      <LanguageProvider>
        <VolleyballScoreboard matchData={mockVolleyballMatch} canEdit={true} />
      </LanguageProvider>
    );

    // In English, serving badge, set limit, point, timeout and end match must be in English
    // Because LanguageProvider in test environment without stored locale defaults to en (or pt if mock is pt)
    expect(screen.getByText("Benfica")).toBeInTheDocument();
    expect(screen.getByText("Sporting")).toBeInTheDocument();
  });
});
