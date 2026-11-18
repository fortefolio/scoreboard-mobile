import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LanguageProvider } from "@/lib/i18n";
import { FeedHeader } from "@/components/FeedHeader";

const mockPush = vi.fn();
vi.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const sampleMatches = [
  {
    id: "m1",
    sport_type: "Tennis",
    status: "ongoing",
    organizer: { username: "alice_org" },
    participants: [{ name: "Alcaraz" }, { name: "Sinner" }],
  },
  {
    id: "m2",
    sport_type: "Padel",
    status: "scheduled",
    organizer: { username: "alice_padel" },
    participants: [{ name: "Coello" }, { name: "Tapia" }],
  },
];

const sampleTournaments = [
  {
    id: "t1",
    name: "Alice Open 2026",
    sport_type: "Tennis",
    organizer: { username: "alice_org" },
  },
];

describe("FeedHeader & Quick-Jump Search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders search input, clear button when non-empty, and quick-jump @username results", () => {
    const onSearchChange = vi.fn();
    const onViewModeChange = vi.fn();
    const onPrimaryAction = vi.fn();

    render(
      <LanguageProvider>
        <FeedHeader
          selectedSport="all"
          onSportChange={vi.fn()}
          searchQuery="@alice"
          onSearchChange={onSearchChange}
          statusFilter="all"
          onStatusChange={vi.fn()}
          displayCount={2}
          countLabel="Matches"
          viewMode="list"
          onViewModeChange={onViewModeChange}
          showViewToggle={true}
          sortOrder="desc"
          onSortOrderChange={vi.fn()}
          matches={sampleMatches}
          tournaments={sampleTournaments}
          currentTab="matches"
          primaryActionLabel="New Match"
          primaryActionTestID="header-create-match-btn"
          onPrimaryAction={onPrimaryAction}
        />
      </LanguageProvider>
    );

    // Clear button appears when searchQuery is non-empty
    const clearIcon = screen.getByTestId("icon-close-circle");
    expect(clearIcon).toBeInTheDocument();
    fireEvent.click(clearIcon);
    expect(onSearchChange).toHaveBeenCalledWith("");

    // Primary + button triggers onPrimaryAction
    fireEvent.click(screen.getByTestId("header-create-match-btn"));
    expect(onPrimaryAction).toHaveBeenCalledTimes(1);

    // Focus search input to open quick-jump popover
    const searchInput = screen.getByPlaceholderText(/Search|Pesquisar/i);
    fireEvent.focus(searchInput);

    // Quick-jump organizers section matches @alice
    expect(screen.getByText("@alice_org")).toBeInTheDocument();
  });
});
