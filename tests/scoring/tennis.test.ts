import { describe, expect, it } from "vitest";
import {
  calculateTennisScore,
  createInitialTennisScores,
  generatePointSequenceForMatch,
  playMCPGameString,
  type SetScoreSpec,
  type TennisRules,
  type TennisScoresState,
} from "@/lib/scoring/tennis-engine";

function simulateMatchInMemory(
  sets: SetScoreSpec[],
  rules: TennisRules = {},
  initialServer: 0 | 1 = 0
): TennisScoresState {
  const points = generatePointSequenceForMatch(sets);
  let state = createInitialTennisScores(initialServer);
  for (const winnerIdx of points) {
    state = calculateTennisScore(state, winnerIdx, rules);
  }
  return state;
}

describe("Tennis Game & Point Mechanics (JeffSackmann/tennis_MatchChartingProject)", () => {
  it("tracks standard service hold (0 -> 15 -> 30 -> 40 -> Game), server_side, and change_ends", () => {
    let state = createInitialTennisScores(0);
    expect(state.serving_index).toBe(0);
    expect(state.tennis.server_side).toBe("deuce");

    // 15-0
    state = calculateTennisScore(state, 0);
    expect(state.tennis.points).toEqual([1, 0]);
    expect(state.tennis.server_side).toBe("ad");
    expect(state.tennis.change_ends).toBe(false);

    // 30-0
    state = calculateTennisScore(state, 0);
    expect(state.tennis.points).toEqual([2, 0]);
    expect(state.tennis.server_side).toBe("deuce");

    // 40-0
    state = calculateTennisScore(state, 0);
    expect(state.tennis.points).toEqual([3, 0]);
    expect(state.tennis.server_side).toBe("ad");

    // Game won -> 1-0 in games, server switches to player 1, change_ends = true
    state = calculateTennisScore(state, 0);
    expect(state.tennis.points).toEqual([0, 0]);
    expect(state.tennis.games).toEqual([1, 0]);
    expect(state.serving_index).toBe(1);
    expect(state.tennis.change_ends).toBe(true);
  });

  it("replays the 2023 Wimbledon Final Set 3 Game 5 marathon (13 deuces / 32 points)", () => {
    let state = createInitialTennisScores(1); // Djokovic serving

    // Reach first Deuce (3-3 / 40-40)
    state = playMCPGameString(state, "SRSRSR");
    expect(state.tennis.points).toEqual([3, 3]);

    // 12 more Deuces
    for (let d = 0; d < 6; d++) {
      state = playMCPGameString(state, "SR");
      expect(state.tennis.points).toEqual([3, 3]);
      state = playMCPGameString(state, "RS");
      expect(state.tennis.points).toEqual([3, 3]);
    }

    // Break point: Alcaraz wins 2 consecutive return points
    state = playMCPGameString(state, "R");
    expect(state.tennis.points).toEqual([4, 3]);
    state = playMCPGameString(state, "R");
    expect(state.tennis.games).toEqual([1, 0]);
    expect(state.tennis.points).toEqual([0, 0]);
    expect(state.serving_index).toBe(0);
  });

  it("supports No-Ad sudden-death scoring at 40-40 (deciding point wins game immediately)", () => {
    const rules: TennisRules = { no_ad: true };
    let state = createInitialTennisScores(0);

    state = playMCPGameString(state, "SRSRSR", rules);
    expect(state.tennis.points).toEqual([3, 3]);

    state = calculateTennisScore(state, 1, rules);
    expect(state.tennis.games).toEqual([0, 1]);
    expect(state.tennis.points).toEqual([0, 0]);
  });

  it("handles tiebreak with 1-2-2-2 serve rotation, change_ends at 6 pts, and next-set server rule", () => {
    let state = createInitialTennisScores(0);

    // Play 12 games to reach 6-6
    for (let g = 0; g < 6; g++) {
      state = playMCPGameString(state, "SSSS");
      state = playMCPGameString(state, "SSSS");
    }
    expect(state.tennis.games).toEqual([6, 6]);
    expect(state.tennis.is_tiebreak).toBe(true);
    expect(state.serving_index).toBe(0);
    expect(state.tennis.tiebreak_initial_server).toBe(0);

    // Point 1: served by Player 0 -> rotates to Player 1
    state = calculateTennisScore(state, 1);
    expect(state.serving_index).toBe(1);

    // Points 2 & 3: served by Player 1 -> rotates to Player 0
    state = calculateTennisScore(state, 1);
    expect(state.serving_index).toBe(1);
    state = calculateTennisScore(state, 1);
    expect(state.serving_index).toBe(0);

    // Play to 3-3 (6 pts -> change_ends)
    state = calculateTennisScore(state, 0);
    state = calculateTennisScore(state, 0);
    state = calculateTennisScore(state, 0);
    expect(state.tennis.change_ends).toBe(true);

    // Play to 6-6 (12 pts -> change_ends)
    state = calculateTennisScore(state, 0); // 4-3
    state = calculateTennisScore(state, 1); // 4-4
    state = calculateTennisScore(state, 0); // 5-4
    state = calculateTennisScore(state, 1); // 5-5
    state = calculateTennisScore(state, 1); // 5-6
    state = calculateTennisScore(state, 0); // 6-6
    expect(state.tennis.points).toEqual([6, 6]);
    expect(state.tennis.change_ends).toBe(true);

    // Alcaraz wins next 2 points -> 8-6 tiebreak victory
    state = calculateTennisScore(state, 0); // 7-6
    expect(state.tennis.is_tiebreak).toBe(true);
    state = calculateTennisScore(state, 0); // 8-6

    expect(state.tennis.sets).toHaveLength(1);
    expect(state.tennis.sets[0]).toMatchObject({
      home: 7,
      away: 6,
      tiebreak: { home: 8, away: 6 },
    });
    // Official Tennis Rule: Since Player 0 served the first point of the tiebreak, Player 1 MUST serve Game 1 of the next set!
    expect(state.serving_index).toBe(1);
  });
});
