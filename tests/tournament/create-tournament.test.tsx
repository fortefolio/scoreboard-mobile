import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Alert } from "react-native";
import { LanguageProvider } from "@/lib/i18n";
import { CreateTournamentModal } from "../../src/components/tournament/CreateTournamentModal";
import MyTournamentsScreen from "../../src/app/(tabs)/my-tournaments";

// Mock router
const mockPush = vi.fn();
vi.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock Auth
let mockUser: any = {
  id: "organizer-user-456",
  email: "organizer@scoreboard.app",
};

vi.mock("@/components/AuthProvider", () => ({
  useAuth: () => ({
    user: mockUser,
  }),
}));

// Mock Supabase
const mockInsert = vi.fn();
let mockSubscriptionTier = "pro";
let mockTournamentsData: any[] = [];

vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      if (table === "tournaments") {
        return {
          select: () => ({
            eq: () => ({
              order: () => Promise.resolve({ data: mockTournamentsData, error: null }),
            }),
          }),
          insert: (...args: any[]) => ({
            select: () => ({
              single: () => mockInsert(...args),
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
                  data: { subscription_tier: mockSubscriptionTier },
                  error: null,
                }),
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

describe("Mobile Tournament Creation — Feature Parity Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Alert, "alert");
    mockUser = { id: "organizer-user-456", email: "organizer@scoreboard.app" };
    mockSubscriptionTier = "pro";
    mockTournamentsData = [];
    mockInsert.mockResolvedValue({ data: { id: "new-tournament-789" }, error: null });
  });

  describe("CreateTournamentModal", () => {
    it("renders tournament creation form fields correctly", () => {
      render(
        <LanguageProvider>
          <CreateTournamentModal
            visible={true}
            onClose={vi.fn()}
            onCreateSuccess={vi.fn()}
            userId="organizer-user-456"
          />
        </LanguageProvider>
      );

      expect(screen.getByTestId("tournament-name-input")).toBeTruthy();
      expect(screen.getByTestId("sport-select-padel")).toBeTruthy();
      expect(screen.getByTestId("sport-select-tennis")).toBeTruthy();
      expect(screen.getByTestId("stage-select-bracket")).toBeTruthy();
      expect(screen.getByTestId("stage-select-groups")).toBeTruthy();
      expect(screen.getByTestId("submit-create-btn")).toBeTruthy();
    });

    it("prevents submission if tournament name is empty", async () => {
      render(
        <LanguageProvider>
          <CreateTournamentModal
            visible={true}
            onClose={vi.fn()}
            onCreateSuccess={vi.fn()}
            userId="organizer-user-456"
          />
        </LanguageProvider>
      );

      const submitBtn = screen.getByTestId("submit-create-btn");
      fireEvent.click(submitBtn);

      expect(Alert.alert).toHaveBeenCalledWith(
        expect.stringMatching(/Required Field|Campo Obrigatório/i),
        expect.stringMatching(/Please enter a tournament name|Por favor introduza o nome do torneio/i)
      );
      expect(mockInsert).not.toHaveBeenCalled();
    });

    it("validates that start date cannot be after end date", async () => {
      render(
        <LanguageProvider>
          <CreateTournamentModal
            visible={true}
            onClose={vi.fn()}
            onCreateSuccess={vi.fn()}
            userId="organizer-user-456"
          />
        </LanguageProvider>
      );

      fireEvent.change(screen.getByTestId("tournament-name-input"), {
        target: { value: "Invalid Dates Open" },
      });
      fireEvent.change(screen.getByTestId("start-date-input"), {
        target: { value: "2026-08-20" },
      });
      fireEvent.change(screen.getByTestId("end-date-input"), {
        target: { value: "2026-08-10" },
      });

      fireEvent.click(screen.getByTestId("submit-create-btn"));

      expect(Alert.alert).toHaveBeenCalledWith(
        expect.stringMatching(/Invalid Date|Data Inválida/i),
        expect.stringMatching(/cannot be after the End Date|não pode ser posterior/i)
      );
      expect(mockInsert).not.toHaveBeenCalled();
    });

    it("creates tournament with sport defaults and triggers onCreateSuccess", async () => {
      const mockSuccess = vi.fn();

      render(
        <LanguageProvider>
          <CreateTournamentModal
            visible={true}
            onClose={vi.fn()}
            onCreateSuccess={mockSuccess}
            userId="organizer-user-456"
          />
        </LanguageProvider>
      );

      fireEvent.change(screen.getByTestId("tournament-name-input"), {
        target: { value: "Madrid Padel Masters" },
      });

      // Select Padel
      fireEvent.click(screen.getByTestId("sport-select-padel"));

      // Select Group stage
      fireEvent.click(screen.getByTestId("stage-select-groups"));

      // Submit
      fireEvent.click(screen.getByTestId("submit-create-btn"));

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledTimes(1);
      });

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Madrid Padel Masters",
          sport_type: "Padel",
          organizer_id: "organizer-user-456",
          status: "pending",
          settings: expect.objectContaining({
            default: expect.objectContaining({
              max_sets: 3,
              points_per_set: 6,
              no_ad: true,
              set_type: "tiebreak",
            }),
            stage_1: expect.objectContaining({
              type: "groups",
              advance_per_group: 2,
            }),
          }),
        })
      );

      const confirmBtn = await screen.findByTestId("success-modal-confirm-btn");
      fireEvent.click(confirmBtn);

      expect(mockSuccess).toHaveBeenCalledWith("new-tournament-789");
    });
  });

  describe("MyTournamentsScreen Integration", () => {
    it("guards tournament creation with PRO tier requirement", async () => {
      mockSubscriptionTier = "free";

      render(
        <LanguageProvider>
          <MyTournamentsScreen />
        </LanguageProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("header-create-tournament-btn")).toBeTruthy();
      });

      fireEvent.click(screen.getByTestId("header-create-tournament-btn"));

      expect(Alert.alert).toHaveBeenCalledWith(
        expect.stringMatching(/Plano PRO Necessário|PRO Plan Required/i),
        expect.stringMatching(/exclusiv/i),
        expect.any(Array)
      );
    });

    it("opens CreateTournamentModal when PRO organizer clicks create button", async () => {
      mockSubscriptionTier = "pro";

      render(
        <LanguageProvider>
          <MyTournamentsScreen />
        </LanguageProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("header-create-tournament-btn")).toBeTruthy();
      });

      // Wait for async fetchMyTournaments to set subscriptionTier to "pro"
      await new Promise((resolve) => setTimeout(resolve, 100));

      fireEvent.click(screen.getByTestId("header-create-tournament-btn"));

      await waitFor(() => {
        expect(screen.getByTestId("tournament-name-input")).toBeTruthy();
      });
    });
  });
});
