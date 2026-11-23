import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LanguageProvider } from "@/lib/i18n";
import ProfileScreen from "../../src/app/(tabs)/profile";

// Mock router
const mockPush = vi.fn();
vi.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock Auth
const mockUser = {
  id: "mobile-user-123",
  email: "mobileplayer@scoreboard.app",
};

const mockSignOut = vi.fn();
vi.mock("@/components/AuthProvider", () => ({
  useAuth: () => ({
    user: mockUser,
    signOut: mockSignOut,
  }),
}));

// Mock Supabase
const mockRpc = vi.fn();
const mockUpdate = vi.fn().mockReturnValue({
  eq: vi.fn().mockResolvedValue({ error: null }),
});

vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () =>
            Promise.resolve({
              data: {
                username: "padelpro",
                display_name: "Padel Pro",
                subscription_tier: "pro",
                preferences: {
                  language: "en",
                  default_sport: "padel",
                  haptics_enabled: true,
                  sound_enabled: true,
                },
              },
              error: null,
            }),
        }),
      }),
      update: (payload: any) => mockUpdate(payload),
    }),
    rpc: (name: string, params: any) => mockRpc(name, params),
    auth: {
      updateUser: vi.fn().mockResolvedValue({ data: {}, error: null }),
      signInWithPassword: vi.fn().mockResolvedValue({ data: {}, error: null }),
    },
    channel: () => ({
      on: () => ({
        subscribe: () => ({}),
      }),
    }),
    removeChannel: vi.fn(),
  },
}));

describe("Mobile Profile & Settings Screen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders user information and settings sections correctly", async () => {
    render(
      <LanguageProvider>
        <ProfileScreen />
      </LanguageProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Padel Pro/i)).toBeInTheDocument();
      expect(screen.getByText(/PRO PLAN • @padelpro/i)).toBeInTheDocument();
      expect(
        screen.getByText(/Profile & Identity|Perfil & Identidade/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Security & Credentials|Segurança & Credenciais/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Danger Zone|Zona de Perigo/i)
      ).toBeInTheDocument();
    });
  });

  it("switches language between English and Portuguese", async () => {
    render(
      <LanguageProvider>
        <ProfileScreen />
      </LanguageProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Padel Pro/i)).toBeInTheDocument();
    });

    // Click the EN language toggle pill
    const enButtons = screen.getAllByText("EN");
    fireEvent.click(enButtons[enButtons.length - 1]);

    await waitFor(() => {
      expect(screen.getByText("Profile & Identity")).toBeInTheDocument();
      expect(screen.getByText("Danger Zone")).toBeInTheDocument();
    });

    // Click the PT language toggle pill
    const ptButtons = screen.getAllByText("PT");
    fireEvent.click(ptButtons[ptButtons.length - 1]);

    await waitFor(() => {
      expect(screen.getByText("Perfil & Identidade")).toBeInTheDocument();
      expect(screen.getByText("Zona de Perigo")).toBeInTheDocument();
    });
  });

  it("triggers GDPR Data Portability export when requested", async () => {
    mockRpc.mockResolvedValueOnce({
      data: {
        profile: { id: "mobile-user-123", username: "padelpro" },
        matches: [],
        tournaments: [],
      },
      error: null,
    });

    render(
      <LanguageProvider>
        <ProfileScreen />
      </LanguageProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Padel Pro/i)).toBeInTheDocument();
    });

    // Switch to EN first
    const enButtons = screen.getAllByText("EN");
    fireEvent.click(enButtons[enButtons.length - 1]);

    await waitFor(() => {
      expect(screen.getByText(/Download My Data \(JSON\)/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Download My Data \(JSON\)/i));

    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith("export_user_data", undefined);
    });
  });

  it("renders notification preferences and saves generic & sport-specific settings", async () => {
    render(
      <LanguageProvider>
        <ProfileScreen />
      </LanguageProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("notification-settings-section")).toBeInTheDocument();
    });

    // Toggle Tennis & Padel Games switch on
    const tennisGamesEl = screen.getByTestId("notif-switch-tennis-games");
    const tennisGamesInput = tennisGamesEl.querySelector("input");
    fireEvent.click(tennisGamesInput || tennisGamesEl);
    // Save preferences
    fireEvent.click(screen.getByTestId("save-notif-prefs-btn"));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          preferences: expect.objectContaining({
            notifications: expect.objectContaining({
              enabled: true,
              umpire_invited: true,
              match_started: true,
              match_ended: true,
              tennis_padel_enabled: true,
              tennis_padel_sets: true,
              tennis_padel_games: true,
              volleyball_enabled: true,
              volleyball_sets: true,
              volleyball_points: false,
              football_enabled: true,
              football_goals: true,
              football_cards: true,
              basketball_enabled: true,
              basketball_points: true,
              basketball_quarters: true,
            }),
          }),
        })
      );
    });
  });
});
