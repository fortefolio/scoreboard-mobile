import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Alert } from "react-native";
import { LanguageProvider } from "@/lib/i18n";
import { CreateMatchModal } from "../../src/components/match/CreateMatchModal";
import MyMatchesScreen from "../../src/app/(tabs)/my-matches";

// Mock router
const mockPush = vi.fn();
vi.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock Auth
let mockUser: any = {
  id: "organizer-user-789",
  email: "organizer@scoreboard.app",
};

vi.mock("@/components/AuthProvider", () => ({
  useAuth: () => ({
    user: mockUser,
  }),
}));

// Mock Supabase
const mockInsert = vi.fn();
let mockMatchesData: any[] = [];
let mockTournamentsData = [
  { id: "tournament-1", name: "Summer Open 2026" },
  { id: "tournament-2", name: "Winter Cup 2026" },
];

vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      if (table === "matches") {
        return {
          select: () => ({
            or: () => ({
              order: () => Promise.resolve({ data: mockMatchesData, error: null }),
            }),
          }),
          insert: (...args: any[]) => ({
            select: () => ({
              single: () => mockInsert(...args),
            }),
          }),
        };
      }
      if (table === "tournaments") {
        return {
          select: () => ({
            eq: () => ({
              order: () => Promise.resolve({ data: mockTournamentsData, error: null }),
            }),
          }),
        };
      }
      return {
        select: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: [], error: null }),
          }),
        }),
      };
    },
    channel: () => ({
      on: () => ({ subscribe: vi.fn() }),
    }),
    removeChannel: vi.fn(),
  },
}));

describe("Mobile Match Creation — Feature Parity Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Alert, "alert");
    mockUser = { id: "organizer-user-789", email: "organizer@scoreboard.app" };
    mockMatchesData = [];
    mockInsert.mockResolvedValue({
      data: { id: "new-match-999" },
      error: null,
    });
  });

  describe("CreateMatchModal", () => {
    it("renders match creation form fields correctly", async () => {
      render(
        <LanguageProvider>
          <CreateMatchModal
            visible={true}
            onClose={vi.fn()}
            onCreateSuccess={vi.fn()}
            userId="organizer-user-789"
          />
        </LanguageProvider>
      );

      expect(screen.getByTestId("match-team1-input")).toBeTruthy();
      expect(screen.getByTestId("match-team2-input")).toBeTruthy();
      expect(screen.getByTestId("match-sport-select-tennis")).toBeTruthy();
      expect(screen.getByTestId("match-sport-select-padel")).toBeTruthy();
      expect(screen.getByTestId("tournament-chip-none")).toBeTruthy();
      expect(screen.getByTestId("submit-create-match-btn")).toBeTruthy();

      await waitFor(() => {
        expect(screen.getByTestId("tournament-chip-tournament-1")).toBeTruthy();
      });
    });

    it("prevents submission if team names are missing", async () => {
      render(
        <LanguageProvider>
          <CreateMatchModal
            visible={true}
            onClose={vi.fn()}
            onCreateSuccess={vi.fn()}
            userId="organizer-user-789"
          />
        </LanguageProvider>
      );

      fireEvent.click(screen.getByTestId("submit-create-match-btn"));

      expect(Alert.alert).toHaveBeenCalledWith(
        expect.stringMatching(/Required Fields|Campos Obrigatórios/i),
        expect.stringMatching(/both team|ambas as equipas/i)
      );
      expect(mockInsert).not.toHaveBeenCalled();
    });

    it("validates date format if provided", async () => {
      render(
        <LanguageProvider>
          <CreateMatchModal
            visible={true}
            onClose={vi.fn()}
            onCreateSuccess={vi.fn()}
            userId="organizer-user-789"
          />
        </LanguageProvider>
      );

      fireEvent.change(screen.getByTestId("match-team1-input"), {
        target: { value: "Alcaraz" },
      });
      fireEvent.change(screen.getByTestId("match-team2-input"), {
        target: { value: "Djokovic" },
      });
      fireEvent.change(screen.getByTestId("match-date-input"), {
        target: { value: "not-a-valid-date" },
      });

      fireEvent.click(screen.getByTestId("submit-create-match-btn"));

      expect(Alert.alert).toHaveBeenCalledWith(
        expect.stringMatching(/Invalid Date|Data Inválida/i),
        expect.stringMatching(/date format|formato de data/i)
      );
      expect(mockInsert).not.toHaveBeenCalled();
    });

    it("creates a standalone match successfully and calls onCreateSuccess", async () => {
      const mockSuccess = vi.fn();

      render(
        <LanguageProvider>
          <CreateMatchModal
            visible={true}
            onClose={vi.fn()}
            onCreateSuccess={mockSuccess}
            userId="organizer-user-789"
          />
        </LanguageProvider>
      );

      fireEvent.change(screen.getByTestId("match-team1-input"), {
        target: { value: "Benfica" },
      });
      fireEvent.change(screen.getByTestId("match-team2-input"), {
        target: { value: "Sporting" },
      });

      // Select Football
      fireEvent.click(screen.getByTestId("match-sport-select-football"));

      // Click Submit
      fireEvent.click(screen.getByTestId("submit-create-match-btn"));

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledTimes(1);
      });

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          organizer_id: "organizer-user-789",
          sport_type: "Football",
          participants: [{ name: "Benfica" }, { name: "Sporting" }],
          tournament_id: null,
          status: "scheduled",
        })
      );

      const confirmBtn = await screen.findByTestId("success-modal-confirm-btn");
      fireEvent.click(confirmBtn);

      expect(mockSuccess).toHaveBeenCalledWith("new-match-999");
    });

    it("creates a tournament-linked match when tournament chip is selected", async () => {
      const mockSuccess = vi.fn();

      render(
        <LanguageProvider>
          <CreateMatchModal
            visible={true}
            onClose={vi.fn()}
            onCreateSuccess={mockSuccess}
            userId="organizer-user-789"
          />
        </LanguageProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("tournament-chip-tournament-1")).toBeTruthy();
      });

      fireEvent.change(screen.getByTestId("match-team1-input"), {
        target: { value: "Lebrón / Galán" },
      });
      fireEvent.change(screen.getByTestId("match-team2-input"), {
        target: { value: "Coello / Tapia" },
      });

      // Select Padel
      fireEvent.click(screen.getByTestId("match-sport-select-padel"));

      // Select Tournament 1
      fireEvent.click(screen.getByTestId("tournament-chip-tournament-1"));

      // Submit
      fireEvent.click(screen.getByTestId("submit-create-match-btn"));

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledTimes(1);
      });

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          sport_type: "Padel",
          participants: [{ name: "Lebrón / Galán" }, { name: "Coello / Tapia" }],
          tournament_id: "tournament-1",
        })
      );

      const confirmBtn = await screen.findByTestId("success-modal-confirm-btn");
      fireEvent.click(confirmBtn);

      expect(mockSuccess).toHaveBeenCalledWith("new-match-999");
    });
  });

  describe("MyMatchesScreen Integration", () => {
    it("opens CreateMatchModal when clicking header Create button", async () => {
      render(
        <LanguageProvider>
          <MyMatchesScreen />
        </LanguageProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("header-create-match-btn")).toBeTruthy();
      });

      fireEvent.click(screen.getByTestId("header-create-match-btn"));

      await waitFor(() => {
        expect(screen.getByTestId("match-team1-input")).toBeTruthy();
      });
    });

    it("opens CreateMatchModal from empty state button", async () => {
      render(
        <LanguageProvider>
          <MyMatchesScreen />
        </LanguageProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("empty-create-match-btn")).toBeTruthy();
      });

      fireEvent.click(screen.getByTestId("empty-create-match-btn"));

      await waitFor(() => {
        expect(screen.getByTestId("match-team1-input")).toBeTruthy();
      });
    });
  });
});
