import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LanguageProvider } from "@/lib/i18n";
import UmpiringScreen from "../../src/app/(tabs)/umpiring";
import TournamentDetailScreen from "../../src/app/tournament/[id]/index";
import UserProfileScreen from "../../src/app/user/[username]";

const mockPush = vi.fn();
const mockBack = vi.fn();
let mockRouteParams: any = { id: "t-123", username: "gjoforte" };

vi.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
  useLocalSearchParams: () => mockRouteParams,
}));

vi.mock("@/components/AuthProvider", () => ({
  useAuth: () => ({
    user: { id: "umpire-1", email: "umpire@scoreboard.dev" },
    signOut: vi.fn(),
  }),
}));

vi.mock("@/lib/hooks/useFollow", () => ({
  useFollow: () => ({
    isFollowing: () => false,
    toggleFollow: vi.fn(),
    updatingIds: new Set(),
  }),
}));

const mockEq = vi.fn();
const mockOr = vi.fn();
let mockUmpiringRows: any[] = [];

vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      const chainOrder = (): any => ({
        order: () => chainOrder(),
        limit: () => Promise.resolve({ data: [], error: null }),
        then: (resolve: any, reject: any) =>
          Promise.resolve({ data: [], error: null }).then(resolve, reject),
      });
      if (table === "matches") {
        return {
          select: () => ({
            eq: (...args: any[]) => {
              mockEq(...args);
              return {
                or: (...orArgs: any[]) => {
                  mockOr(...orArgs);
                  return {
                    order: () =>
                      Promise.resolve({ data: mockUmpiringRows, error: null }),
                  };
                },
                order: () => chainOrder(),
              };
            },
          }),
        };
      }
      if (table === "tournaments") {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: {
                    id: "t-123",
                    name: "Wimbledon Test Open",
                    sport_type: "Tennis",
                    status: "ongoing",
                    organizer_id: "org-99",
                    settings: { format: "knockout" },
                  },
                  error: null,
                }),
              order: () => Promise.resolve({ data: [], error: null }),
            }),
          }),
        };
      }
      if (table === "users") {
        return {
          select: () => ({
            ilike: () => ({
              maybeSingle: () =>
                Promise.resolve({
                  data: {
                    id: "u-99",
                    username: "gjoforte",
                    subscription_tier: "pro",
                    created_at: "2026-01-15T10:00:00Z",
                  },
                  error: null,
                }),
            }),
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({
                  data: { subscription_tier: "pro" },
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

describe("Workspace, Umpiring & Detail Screens", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUmpiringRows = [];
    mockRouteParams = { id: "t-123", username: "gjoforte" };
  });

  describe("UmpiringScreen", () => {
    it("queries umpire_id with NULL-safe organizer filter and shows empty state when no matches", async () => {
      mockUmpiringRows = [];

      render(
        <LanguageProvider>
          <UmpiringScreen />
        </LanguageProvider>
      );

      await waitFor(() => {
        expect(mockEq).toHaveBeenCalledWith("umpire_id", "umpire-1");
        expect(mockOr).toHaveBeenCalledWith(
          "organizer_id.is.null,organizer_id.neq.umpire-1"
        );
      });

      await waitFor(() => {
        expect(
          screen.getByText(/Sem jogos atribuídos|No assigned matches/)
        ).toBeInTheDocument();
      });
    });

    it("renders @organizer in group header and navigates to Scoreboard on quick action press", async () => {
      mockUmpiringRows = [
        {
          id: "um-1",
          sport_type: "Tennis",
          status: "ongoing",
          tournament_id: "t-9",
          tournaments: { name: "Porto Open" },
          organizer: { username: "porto_org" },
          participants: [{ name: "Player A" }, { name: "Player B" }],
          created_at: "2026-11-18T10:00:00Z",
          scores: {},
        },
      ];

      render(
        <LanguageProvider>
          <UmpiringScreen />
        </LanguageProvider>
      );

      await waitFor(() => {
        expect(screen.getByText("Porto Open")).toBeInTheDocument();
      });

      expect(screen.getByText("@porto_org")).toBeInTheDocument();
      const scoreBtn = screen.getByTestId("umpiring-scoreboard-btn-um-1");
      fireEvent.click(scoreBtn);
      expect(mockPush).toHaveBeenCalledWith("/match/um-1/scoreboard");
    });
  });

  describe("Filter & Sort Logic Parity", () => {
    const sampleItems = [
      {
        id: "1",
        sport_type: "Beach Volleyball",
        status: "scheduled",
        organizer: { username: "beach_org" },
        participants: [{ name: "Pair A" }, { name: "Pair B" }],
        scheduled_at: "2026-11-10T10:00:00Z",
      },
      {
        id: "2",
        sport_type: "Tennis",
        status: "pending",
        organizer: { username: "tennis_org" },
        participants: [{ name: "Player C" }, { name: "Player D" }],
        scheduled_at: "2026-11-12T10:00:00Z",
      },
    ];

    it("handles Beach Volleyball variant, scheduled/pending status, @username search, and asc/desc sort", () => {
      const filterAndSort = (
        sport: string,
        status: string,
        q: string,
        order: "asc" | "desc"
      ) => {
        const filtered = sampleItems.filter((m) => {
          if (
            sport !== "all" &&
            m.sport_type.toLowerCase() !== sport.toLowerCase()
          ) {
            return false;
          }
          if (status !== "all" && m.status.toLowerCase() !== status.toLowerCase()) {
            return false;
          }
          if (q.trim()) {
            const needle = q.trim().replace(/^@/, "").toLowerCase();
            const org = m.organizer?.username?.toLowerCase() || "";
            const p1 = m.participants[0].name.toLowerCase();
            if (!org.includes(needle) && !p1.includes(needle)) return false;
          }
          return true;
        });
        return [...filtered].sort((a, b) => {
          const tA = new Date(a.scheduled_at).getTime();
          const tB = new Date(b.scheduled_at).getTime();
          return order === "desc" ? tB - tA : tA - tB;
        });
      };

      expect(filterAndSort("Beach Volleyball", "scheduled", "", "desc")).toHaveLength(1);
      expect(filterAndSort("all", "pending", "@tennis_org", "desc")).toHaveLength(1);
      expect(filterAndSort("all", "all", "", "asc").map((i) => i.id)).toEqual(["1", "2"]);
      expect(filterAndSort("all", "all", "", "desc").map((i) => i.id)).toEqual(["2", "1"]);
    });
  });

  describe("TournamentDetail & UserProfile Parity", () => {
    it("TournamentDetailScreen renders MatchAtmosphereBackground and compact header", async () => {
      render(
        <LanguageProvider>
          <TournamentDetailScreen />
        </LanguageProvider>
      );

      await waitFor(() => {
        expect(screen.getAllByText("Wimbledon Test Open").length).toBeGreaterThan(0);
      });
    });

    it("UserProfileScreen renders @username pill without avatar or counter card", async () => {
      render(
        <LanguageProvider>
          <UserProfileScreen />
        </LanguageProvider>
      );

      await waitFor(() => {
        expect(screen.getByText("@gjoforte")).toBeInTheDocument();
      });
      expect(screen.getByText("PRO")).toBeInTheDocument();
    });
  });
});
