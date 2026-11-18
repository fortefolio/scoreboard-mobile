import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LanguageProvider } from "@/lib/i18n";
import { TopBar } from "@/components/TopBar";
import { BottomTabBar } from "@/components/BottomTabBar";

const mockPush = vi.fn();
let mockPathname = "/";
let mockSegments: string[] = ["(tabs)"];

vi.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => mockPathname,
  useSegments: () => mockSegments,
}));

let mockUser: any = null;
const mockSignOut = vi.fn();

vi.mock("@/components/AuthProvider", () => ({
  useAuth: () => ({
    user: mockUser,
    signOut: mockSignOut,
  }),
}));

let mockTier = "pro";
vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    from: (table: string) => ({
      select: (_cols: string, opts?: any) => {
        if (table === "notifications" && opts?.head) {
          return {
            eq: () => ({
              is: () => Promise.resolve({ count: 2, error: null }),
            }),
          };
        }
        return {
          eq: () => ({
            maybeSingle: () =>
              Promise.resolve({
                data: { subscription_tier: mockTier },
                error: null,
              }),
          }),
        };
      },
    }),
    channel: () => ({
      on: () => ({ subscribe: vi.fn() }),
    }),
    removeChannel: vi.fn(),
  },
}));

describe("Navigation & Shell (TopBar + BottomTabBar)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = null;
    mockTier = "pro";
    mockPathname = "/";
    mockSegments = ["(tabs)"];
  });

  describe("TopBar", () => {
    it("renders Sign In button and no avatar or notification bell when logged out", () => {
      render(
        <LanguageProvider>
          <TopBar />
        </LanguageProvider>
      );

      expect(screen.getByTestId("topbar-signin-btn")).toBeInTheDocument();
      expect(screen.queryByTestId("topbar-avatar-btn")).not.toBeInTheDocument();
      expect(screen.queryByTestId("icon-notifications-outline")).not.toBeInTheDocument();
    });

    it("renders hamburger menu button, PRO/FREE badge, Settings, My Events, and Sign Out when authenticated", async () => {
      mockUser = { id: "u1", email: "umpire@scoreboard.dev" };
      mockTier = "pro";

      render(
        <LanguageProvider>
          <TopBar />
        </LanguageProvider>
      );

      const menuBtn = screen.getByTestId("topbar-avatar-btn");
      expect(menuBtn).toBeInTheDocument();
      expect(screen.getByTestId("icon-menu")).toBeInTheDocument();
      expect(screen.queryByTestId("icon-notifications-outline")).not.toBeInTheDocument();

      fireEvent.click(menuBtn);

      await waitFor(() => {
        expect(screen.getByText("PRO")).toBeInTheDocument();
      });
      expect(screen.getByText("umpire@scoreboard.dev")).toBeInTheDocument();
      expect(screen.getByTestId("menu-settings-btn")).toBeInTheDocument();
      expect(screen.getByTestId("menu-my-matches-btn")).toBeInTheDocument();
      expect(screen.getByTestId("icon-grid-outline")).toBeInTheDocument();
      expect(screen.getByTestId("menu-logout-btn")).toBeInTheDocument();

      fireEvent.click(screen.getByTestId("menu-logout-btn"));
      await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalledTimes(1);
      });
    });

    it("displays FREE badge when user subscription_tier is free", async () => {
      mockUser = { id: "u2", email: "free@scoreboard.dev" };
      mockTier = "free";

      render(
        <LanguageProvider>
          <TopBar />
        </LanguageProvider>
      );

      fireEvent.click(screen.getByTestId("topbar-avatar-btn"));
      await waitFor(() => {
        expect(screen.getByText("FREE")).toBeInTheDocument();
      });
    });
  });

  describe("BottomTabBar", () => {
    it("hides bottom tab bar on Home when user is logged out", () => {
      mockUser = null;
      mockPathname = "/";
      mockSegments = ["(tabs)"];

      const { container } = render(
        <LanguageProvider>
          <BottomTabBar />
        </LanguageProvider>
      );

      expect(container.innerHTML).toBe("");
    });

    it("renders all 5 navigation tabs when user is authenticated", async () => {
      mockUser = { id: "u1", email: "umpire@scoreboard.dev" };
      mockPathname = "/";
      mockSegments = ["(tabs)"];

      render(
        <LanguageProvider>
          <BottomTabBar />
        </LanguageProvider>
      );

      await waitFor(() => {
        expect(screen.getByText("Matches")).toBeInTheDocument();
      });
      expect(screen.getByText("Tournaments")).toBeInTheDocument();
      expect(screen.getByText("Following")).toBeInTheDocument();
      expect(screen.getByText("Notifications")).toBeInTheDocument();
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });
  });
});
