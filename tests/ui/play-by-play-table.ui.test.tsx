import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PlayByPlayTable } from "../../src/components/match/PlayByPlayTable";

describe("PlayByPlayTable undo reconciliation & formatting", () => {
  it("removes undone Football goals when correct_goal follows a goal", () => {
    // Events are passed newest-first (matching Supabase created_at DESC order)
    const events = [
      {
        id: "e3",
        created_at: "2026-11-23T15:02:00Z",
        event_data: { type: "correct_goal", side: "home" },
      },
      {
        id: "e2",
        created_at: "2026-11-23T15:01:00Z",
        event_data: { type: "goal", side: "home", minute: 2 },
      },
      {
        id: "e1",
        created_at: "2026-11-23T15:00:00Z",
        event_data: { type: "goal", side: "away", minute: 1 },
      },
    ];

    render(
      <PlayByPlayTable
        events={events}
        teamAName="AAC"
        teamBName="AAV"
        emptyText="No events"
        formatFallback={(team) => `Goal by ${team}`}
      />
    );

    // Home goal at 2' was undone by e3, so only Away goal at 1' remains
    expect(screen.getByText("1'")).toBeInTheDocument();
    expect(screen.queryByText("2'")).not.toBeInTheDocument();
    expect(screen.getByText("Goal by AAV")).toBeInTheDocument();
    expect(screen.queryByText("Goal by AAC")).not.toBeInTheDocument();
  });

  it("formats negative point deltas without a leading plus sign", () => {
    const events = [
      {
        id: "e1",
        created_at: "2026-11-23T15:00:00Z",
        event_data: { type: "point_scored", side: "home", points: -1 },
      },
    ];

    render(
      <PlayByPlayTable
        events={events}
        teamAName="Lakers"
        teamBName="Warriors"
        emptyText="No events"
        formatFallback={(team) => `Point for ${team}`}
      />
    );

    expect(screen.getByText("-1")).toBeInTheDocument();
    expect(screen.queryByText("+-1")).not.toBeInTheDocument();
  });
});
