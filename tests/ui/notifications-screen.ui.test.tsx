import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LanguageProvider } from "@/lib/i18n";
import NotificationsScreen from "../../src/app/(tabs)/notifications";

const mockPush = vi.fn();
vi.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/notifications",
  useSegments: () => ["(tabs)", "notifications"],
}));

vi.mock("@/components/AuthProvider", () => ({
  useAuth: () => ({
    user: { id: "user-1", email: "user@scoreboard.dev" },
    signOut: vi.fn(),
  }),
}));

const mockUpdateEq = vi.fn().mockResolvedValue({ error: null });
const mockDeleteEq = vi.fn().mockResolvedValue({ error: null });

let mockNotifications = [
  {
    id: "n1",
    user_id: "user-1",
    type: "match_started",
    title: "Match Started",
    message: "Braga vs Evora is now live.",
    read_at: null,
    created_at: "2026-11-18T10:00:00Z",
    data: { match_id: "m1" },
  },
];

vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      if (table === "notifications") {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: () =>
                  Promise.resolve({ data: mockNotifications, error: null }),
              }),
            }),
          }),
          update: () => ({
            eq: mockUpdateEq,
          }),
          delete: () => ({
            eq: mockDeleteEq,
          }),
        };
      }
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: () =>
              Promise.resolve({ data: { subscription_tier: "free" }, error: null }),
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

describe("NotificationsScreen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNotifications = [
      {
        id: "n1",
        user_id: "user-1",
        type: "match_started",
        title: "Match Started",
        message: "Braga vs Evora is now live.",
        read_at: null,
        created_at: "2026-11-18T10:00:00Z",
        data: { match_id: "m1" },
      },
    ];
  });

  it("renders notifications with Clear all and per-item Mark as read / Delete actions", async () => {
    render(
      <LanguageProvider>
        <NotificationsScreen />
      </LanguageProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Match Started")).toBeInTheDocument();
    });
    expect(screen.getByText("Braga vs Evora is now live.")).toBeInTheDocument();
    expect(screen.getByText(/Clear all|Limpar tudo/i)).toBeInTheDocument();

    // Open 3-dot action menu and click Mark as read
    const menuBtn = screen.getByTestId("notif-menu-n1");
    fireEvent.click(menuBtn);
    const markReadItem = await screen.findByText(/Mark as read|Marcar como lida/i);
    fireEvent.click(markReadItem);
    await waitFor(() => {
      expect(mockUpdateEq).toHaveBeenCalled();
    });
  });
});
