import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LanguageProvider } from "@/lib/i18n";
import { GuestLandingHero } from "@/components/home/GuestLandingHero";
import { TechnicalCapabilitiesSection } from "@/components/home/TechnicalCapabilitiesSection";
import MatchesFeedScreen from "../../src/app/(tabs)/index";

const mockPush = vi.fn();
vi.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/components/AuthProvider", () => ({
  useAuth: () => ({ user: null, signOut: vi.fn() }),
}));

vi.mock("@/lib/hooks/useFollow", () => ({
  useFollow: () => ({
    isFollowing: () => false,
    toggleFollow: vi.fn(),
    updatingIds: new Set(),
  }),
}));

const mockGuestMatchesData = [
  // 2 matches in t1 (1 scheduled, 1 ongoing -> ongoing should win!)
  {
    id: "m-t1-sched",
    sport_type: "Tennis",
    status: "scheduled",
    tournament_id: "t1",
    tournaments: { name: "Tournament One" },
    organizer: { username: "org1" },
    participants: [{ name: "T1SchedA" }, { name: "T1SchedB" }],
    created_at: "2026-11-18T10:00:00Z",
    scores: {},
  },
  {
    id: "m-t1-live",
    sport_type: "Tennis",
    status: "ongoing",
    tournament_id: "t1",
    tournaments: { name: "Tournament One" },
    organizer: { username: "org1" },
    participants: [{ name: "T1LiveA" }, { name: "T1LiveB" }],
    created_at: "2026-11-18T08:00:00Z",
    scores: { tennis: { games: [3, 2], points: [1, 0], sets: [] } },
  },
  // 6 standalone matches so total > 6 to test cap at 6
  {
    id: "m-s1",
    sport_type: "Football",
    status: "ongoing",
    tournament_id: null,
    participants: [{ name: "StandaloneLive1" }, { name: "SL1Opp" }],
    created_at: "2026-11-18T09:00:00Z",
    scores: { current: { home: 1, away: 0 } },
  },
  {
    id: "m-s2",
    sport_type: "Basketball",
    status: "scheduled",
    tournament_id: null,
    participants: [{ name: "StandaloneSched2" }, { name: "SS2Opp" }],
    created_at: "2026-11-18T07:00:00Z",
    scores: {},
  },
  {
    id: "m-s3",
    sport_type: "Padel",
    status: "scheduled",
    tournament_id: null,
    participants: [{ name: "StandaloneSched3" }, { name: "SS3Opp" }],
    created_at: "2026-11-18T06:00:00Z",
    scores: {},
  },
  {
    id: "m-s4",
    sport_type: "Volleyball",
    status: "scheduled",
    tournament_id: null,
    participants: [{ name: "StandaloneSched4" }, { name: "SS4Opp" }],
    created_at: "2026-11-18T05:00:00Z",
    scores: {},
  },
  {
    id: "m-s5",
    sport_type: "Tennis",
    status: "completed",
    tournament_id: null,
    participants: [{ name: "StandaloneDone5" }, { name: "SD5Opp" }],
    created_at: "2026-11-18T04:00:00Z",
    scores: {},
  },
  {
    id: "m-s6",
    sport_type: "Football",
    status: "completed",
    tournament_id: null,
    participants: [{ name: "StandaloneDone6" }, { name: "SD6Opp" }],
    created_at: "2026-11-18T03:00:00Z",
    scores: {},
  },
];

vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    from: (table: string) => ({
      select: () => ({
        order: () => ({
          limit: () =>
            Promise.resolve({
              data: table === "matches" ? mockGuestMatchesData : [],
              error: null,
            }),
        }),
      }),
    }),
    channel: () => ({
      on: () => ({ subscribe: vi.fn() }),
    }),
    removeChannel: vi.fn(),
  },
}));

describe("Guest Landing Experience (!user)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GuestLandingHero renders updated headline, telemetry badge, and triggers CTAs", () => {
    const onGetStarted = vi.fn();
    const onWatchLiveFeeds = vi.fn();

    render(
      <LanguageProvider>
        <GuestLandingHero
          onGetStarted={onGetStarted}
          onWatchLiveFeeds={onWatchLiveFeeds}
        />
      </LanguageProvider>
    );

    expect(screen.getByText(/Don't just follow the score\./)).toBeInTheDocument();
    expect(screen.getByText(/Real-time telemetry sync|Sincronização em tempo real/)).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("guest-get-started-btn"));
    expect(onGetStarted).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId("guest-watch-live-btn"));
    expect(onWatchLiveFeeds).toHaveBeenCalledTimes(1);
  });

  it("TechnicalCapabilitiesSection renders divider, Crowd Overview row, and stadium OBS bug", () => {
    render(
      <LanguageProvider>
        <TechnicalCapabilitiesSection />
      </LanguageProvider>
    );

    expect(screen.getByText(/TECHNICAL CAPABILITIES|CAPACIDADES TÉCNICAS/)).toBeInTheDocument();
    expect(screen.getByText(/Umpire-to-Crowd Instant Sync|Sincronização Instantânea/)).toBeInTheDocument();
    expect(screen.getByText(/Crowd Overview|Vista do Público/)).toBeInTheDocument();
    expect(screen.getByText("S1 · 4-3")).toBeInTheDocument();
    expect(screen.getByText(/Automated Tournament Engine|Motor de Torneios Automático/)).toBeInTheDocument();
    expect(screen.getByText(/Broadcast Overlays \(OBS \/ vMix\)|Overlays de Transmissão/)).toBeInTheDocument();
    expect(screen.getByText("SLB")).toBeInTheDocument();
    expect(screen.getByText("FCP")).toBeInTheDocument();
    expect(screen.getByText("128")).toBeInTheDocument();
    expect(screen.getByText("127")).toBeInTheDocument();
    expect(screen.getByText("/match/[id]/overlay")).toBeInTheDocument();
  });

  it("MatchesFeedScreen (!user) shows flat 1-per-tournament feed capped at 6 with showFavorite=false and no FeedHeader/Pagination", async () => {
    render(
      <LanguageProvider>
        <MatchesFeedScreen />
      </LanguageProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("T1LiveA")).toBeInTheDocument();
    });

    // Ongoing match from t1 was picked; second match from same tournament t1 was excluded
    expect(screen.queryByText("T1SchedA")).not.toBeInTheDocument();

    // Standalone matches fill up to 6 total (T1 Live + S1 + S2 + S3 + S4 + S5 = 6), 7th excluded
    expect(screen.getByText("StandaloneLive1")).toBeInTheDocument();
    expect(screen.getByText("StandaloneDone5")).toBeInTheDocument();
    expect(screen.queryByText("StandaloneDone6")).not.toBeInTheDocument();

    // No GroupedMatchList headers, no favorite stars, no FeedHeader/Pagination
    expect(screen.queryByText(/Standalone Matches|Jogos Isolados/)).not.toBeInTheDocument();
    expect(screen.queryByTestId("icon-star-outline")).not.toBeInTheDocument();
    expect(screen.queryByTestId("header-create-match-btn")).not.toBeInTheDocument();
    expect(screen.queryByTestId("pagination-next-btn")).not.toBeInTheDocument();
  });
});
