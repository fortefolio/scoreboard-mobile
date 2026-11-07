import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Alert } from "react-native";
import { LanguageProvider } from "@/lib/i18n";
import TournamentDetailScreen from "../../src/app/tournament/[id]/index";
import TournamentTeamsScreen from "../../src/app/tournament/[id]/teams";
import { TournamentSettingsModal } from "../../src/components/tournament/TournamentSettingsModal";

// Mock router
const mockPush = vi.fn();
const mockBack = vi.fn();
const mockReplace = vi.fn();

vi.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ id: "tournament-xyz-100" }),
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
    replace: mockReplace,
  }),
}));

// Mock Auth
let mockUser: any = {
  id: "organizer-user-100",
  email: "organizer@scoreboard.app",
};

vi.mock("@/components/AuthProvider", () => ({
  useAuth: () => ({
    user: mockUser,
  }),
}));

// Mock Follow hook
vi.mock("@/lib/hooks/useFollow", () => ({
  useFollow: () => ({
    isFollowing: () => false,
    toggleFollow: vi.fn(),
    updatingIds: new Set(),
  }),
}));

// Mock Supabase
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockInsert = vi.fn();
const mockFunctionsInvoke = vi.fn();

let mockTournament = {
  id: "tournament-xyz-100",
  name: "Algarve Padel Open",
  sport_type: "Padel",
  organizer_id: "organizer-user-100",
  status: "pending",
  start_date: "2026-07-01",
  end_date: "2026-07-05",
  visibility: "public",
  settings: {
    max_teams: 16,
    number_of_courts: 2,
  },
};

let mockParticipants = [
  { id: "part-1", name: "Team Alfa", seed: 1 },
  { id: "part-2", name: "Team Beta", seed: 2 },
];

vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      if (table === "tournaments") {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: mockTournament, error: null }),
            }),
          }),
          update: (data: any) => ({
            eq: (col: string, val: any) => {
              mockUpdate(data, col, val);
              return Promise.resolve({ error: null });
            },
          }),
          delete: () => ({
            eq: (col: string, val: any) => {
              mockDelete(col, val);
              return Promise.resolve({ error: null });
            },
          }),
        };
      }
      if (table === "tournament_participants") {
        return {
          select: (fields?: any, opts?: any) => {
            const queryObj: any = {
              order: () => Promise.resolve({ data: mockParticipants, error: null }),
              eq: () => {
                if (opts?.count === "exact") {
                  return Promise.resolve({ data: null, count: mockParticipants.length, error: null });
                }
                return {
                  order: () => Promise.resolve({ data: mockParticipants, error: null }),
                };
              },
            };
            return queryObj;
          },
          insert: (...args: any[]) => {
            mockInsert(...args);
            return Promise.resolve({ error: null });
          },
          delete: () => ({
            eq: (col: string, val: any) => {
              mockDelete(col, val);
              return Promise.resolve({ error: null });
            },
          }),
        };
      }
      return {
        select: () => ({
          eq: () => ({
            order: () => ({
              order: () => Promise.resolve({ data: [], error: null }),
            }),
          }),
        }),
      };
    },
    functions: {
      invoke: (...args: any[]) => mockFunctionsInvoke(...args),
    },
    channel: () => ({
      on: () => ({ subscribe: vi.fn() }),
    }),
    removeChannel: vi.fn(),
  },
}));

describe("Tournament Management on Mobile — Feature Parity Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Alert, "alert");
    mockUser = { id: "organizer-user-100", email: "organizer@scoreboard.app" };
    mockTournament = {
      id: "tournament-xyz-100",
      name: "Algarve Padel Open",
      sport_type: "Padel",
      organizer_id: "organizer-user-100",
      status: "pending",
      start_date: "2026-07-01",
      end_date: "2026-07-05",
      visibility: "public",
      settings: {
        max_teams: 16,
        number_of_courts: 2,
      },
    };
    mockParticipants = [
      { id: "part-1", name: "Team Alfa", seed: 1 },
      { id: "part-2", name: "Team Beta", seed: 2 },
    ];
    mockUpdate.mockResolvedValue({ error: null });
    mockDelete.mockResolvedValue({ error: null });
    mockInsert.mockResolvedValue({ error: null });
    mockFunctionsInvoke.mockResolvedValue({ error: null });
  });

  describe("TournamentDetailScreen Organizer Hub", () => {
    it("displays organizer control panel and badge when logged in as organizer", async () => {
      render(
        <LanguageProvider>
          <TournamentDetailScreen />
        </LanguageProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("organizer-controls-section")).toBeTruthy();
        expect(screen.getByTestId("organizer-settings-btn")).toBeTruthy();
        expect(screen.getByTestId("organizer-teams-btn")).toBeTruthy();
        expect(screen.getByTestId("organizer-generate-btn")).toBeTruthy();
      });
    });

    it("hides organizer controls for non-organizer visitors", async () => {
      mockUser = { id: "other-user-999", email: "visitor@scoreboard.app" };

      render(
        <LanguageProvider>
          <TournamentDetailScreen />
        </LanguageProvider>
      );

      await waitFor(() => {
        expect(screen.getAllByText("Algarve Padel Open").length).toBeGreaterThan(0);
      });

      expect(screen.queryByTestId("organizer-controls-section")).toBeNull();
    });

    it("invokes generate-tournament-bracket edge function when organizer confirms bracket generation", async () => {
      // Setup spy on Alert.alert to execute the confirmation button
      vi.spyOn(Alert, "alert").mockImplementation((title, msg, buttons: any) => {
        const generateBtn = buttons?.find((b: any) => b.text === "Gerar" || b.text === "Generate");
        if (generateBtn && generateBtn.onPress) {
          generateBtn.onPress();
        }
      });

      render(
        <LanguageProvider>
          <TournamentDetailScreen />
        </LanguageProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("organizer-generate-btn")).toBeTruthy();
      });

      fireEvent.click(screen.getByTestId("organizer-generate-btn"));

      await waitFor(() => {
        expect(mockFunctionsInvoke).toHaveBeenCalledWith(
          "generate-tournament-bracket",
          expect.objectContaining({
            body: expect.objectContaining({
              tournament_id: "tournament-xyz-100",
              organizer_id: "organizer-user-100",
              sport_type: "Padel",
              teams: ["Team Alfa", "Team Beta"],
            }),
          })
        );
      });
    });
  });

  describe("TournamentSettingsModal", () => {
    it("updates tournament settings on save", async () => {
      const mockSuccess = vi.fn();

      render(
        <LanguageProvider>
          <TournamentSettingsModal
            visible={true}
            onClose={vi.fn()}
            tournament={mockTournament}
            onUpdateSuccess={mockSuccess}
            onDeleteSuccess={vi.fn()}
          />
        </LanguageProvider>
      );

      fireEvent.change(screen.getByTestId("settings-max-teams-input"), {
        target: { value: "32" },
      });
      fireEvent.change(screen.getByTestId("settings-courts-input"), {
        target: { value: "4" },
      });

      fireEvent.click(screen.getByTestId("settings-save-btn"));

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledTimes(1);
      });

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          settings: expect.objectContaining({
            max_teams: 32,
            number_of_courts: 4,
          }),
        }),
        "id",
        "tournament-xyz-100"
      );

      expect(mockSuccess).toHaveBeenCalled();
    });

    it("deletes tournament after confirmation dialog", async () => {
      const mockDeleteSuccess = vi.fn();

      vi.spyOn(Alert, "alert").mockImplementation((title, msg, buttons: any) => {
        const deleteBtn = buttons?.find((b: any) => b.text === "Eliminar" || b.text === "Delete");
        if (deleteBtn && deleteBtn.onPress) {
          deleteBtn.onPress();
        }
      });

      render(
        <LanguageProvider>
          <TournamentSettingsModal
            visible={true}
            onClose={vi.fn()}
            tournament={mockTournament}
            onUpdateSuccess={vi.fn()}
            onDeleteSuccess={mockDeleteSuccess}
          />
        </LanguageProvider>
      );

      fireEvent.click(screen.getByTestId("settings-delete-tournament-btn"));

      await waitFor(() => {
        expect(mockDelete).toHaveBeenCalledWith("id", "tournament-xyz-100");
      });

      expect(mockDeleteSuccess).toHaveBeenCalled();
    });
  });

  describe("TournamentTeamsScreen Organizer Actions", () => {
    it("allows organizer to add a manual team", async () => {
      render(
        <LanguageProvider>
          <TournamentTeamsScreen />
        </LanguageProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("header-add-team-btn")).toBeTruthy();
      });

      fireEvent.click(screen.getByTestId("header-add-team-btn"));

      await waitFor(() => {
        expect(screen.getByTestId("new-team-name-input")).toBeTruthy();
      });

      fireEvent.change(screen.getByTestId("new-team-name-input"), {
        target: { value: "Team Gamma" },
      });

      fireEvent.click(screen.getByTestId("submit-add-team-btn"));

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith(
          expect.objectContaining({
            tournament_id: "tournament-xyz-100",
            name: "Team Gamma",
          })
        );
      });
    });

    it("allows organizer to remove a team with confirmation", async () => {
      vi.spyOn(Alert, "alert").mockImplementation((title, msg, buttons: any) => {
        const removeBtn = buttons?.find((b: any) => b.text === "Remover" || b.text === "Remove");
        if (removeBtn && removeBtn.onPress) {
          removeBtn.onPress();
        }
      });

      render(
        <LanguageProvider>
          <TournamentTeamsScreen />
        </LanguageProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("remove-team-btn-part-1")).toBeTruthy();
      });

      fireEvent.click(screen.getByTestId("remove-team-btn-part-1"));

      await waitFor(() => {
        expect(mockDelete).toHaveBeenCalledWith("id", "part-1");
      });
    });
  });
});
