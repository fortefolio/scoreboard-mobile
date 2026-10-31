import { describe, expect, it } from "vitest";
import {
  calculateVolleyballScore,
  createInitialVolleyballScores,
  generateRallySequenceForMatch,
  type VolleyballRules,
  type VolleyballSetScoreSpec,
} from "@/lib/scoring/volleyball-engine";

export const MATCH_136_SPECS: VolleyballSetScoreSpec[] = [
  { home: 19, away: 25 },
  { home: 25, away: 22 },
  { home: 25, away: 20 },
  { home: 18, away: 25 },
  { home: 15, away: 10 },
];

export const MATCH_136_RULES: VolleyballRules = {
  sport_type: "Volleyball",
  max_sets: 5,
  points_per_set: 25,
  deciding_set_points: 15,
};

describe("Volleyball Scoring Mechanics — Match 136 Simulation", () => {
  it("validates Set 1: Clube Kairós starts serving, VC Viana wins 25-19", () => {
    let state = createInitialVolleyballScores(0);
    expect(state.serving_index).toBe(0);

    const rallies = generateRallySequenceForMatch([MATCH_136_SPECS[0]], MATCH_136_RULES);
    for (const side of rallies) {
      state = calculateVolleyballScore(state, side, MATCH_136_RULES);
    }

    expect(state.sets).toHaveLength(1);
    expect(state.sets[0]).toMatchObject({ home: 19, away: 25 });
    expect(state.final_sets).toEqual([0, 1]);
    expect(state.current_set).toBe(2);
    expect(state.match_won).toBe(false);
  });

  it("validates Set 2: Service rotation, Kairós closes 25-22 to tie 1-1", () => {
    let state = createInitialVolleyballScores(0);

    const rallies = generateRallySequenceForMatch(
      [MATCH_136_SPECS[0], MATCH_136_SPECS[1]],
      MATCH_136_RULES
    );
    for (const side of rallies) {
      state = calculateVolleyballScore(state, side, MATCH_136_RULES);
    }

    expect(state.sets).toHaveLength(2);
    expect(state.sets[1]).toMatchObject({ home: 25, away: 22 });
    expect(state.final_sets).toEqual([1, 1]);
    expect(state.current_set).toBe(3);
    expect(state.match_won).toBe(false);
  });

  it("validates Sets 3 and 4: Sets reached 2-2 to force deciding 5th set", () => {
    let state = createInitialVolleyballScores(0);

    const rallies = generateRallySequenceForMatch(
      MATCH_136_SPECS.slice(0, 4),
      MATCH_136_RULES
    );
    for (const side of rallies) {
      state = calculateVolleyballScore(state, side, MATCH_136_RULES);
    }

    expect(state.sets).toHaveLength(4);
    expect(state.sets[2]).toMatchObject({ home: 25, away: 20 });
    expect(state.sets[3]).toMatchObject({ home: 18, away: 25 });
    expect(state.final_sets).toEqual([2, 2]);
    expect(state.current_set).toBe(5);
    expect(state.volleyball.is_deciding_set).toBe(true);
    expect(state.match_won).toBe(false);
  });

  it("validates deciding set: detects change of ends at 8 points and final victory 3-2", () => {
    let state = createInitialVolleyballScores(0);

    const first4Rallies = generateRallySequenceForMatch(
      MATCH_136_SPECS.slice(0, 4),
      MATCH_136_RULES
    );
    for (const side of first4Rallies) {
      state = calculateVolleyballScore(state, side, MATCH_136_RULES);
    }
    expect(state.sets).toHaveLength(4);

    for (let i = 0; i < 7; i++) {
      state = calculateVolleyballScore(state, "away", MATCH_136_RULES);
      state = calculateVolleyballScore(state, "home", MATCH_136_RULES);
    }
    expect(state.current).toEqual({ home: 7, away: 7 });
    expect(state.volleyball.change_ends).toBe(false);

    state = calculateVolleyballScore(state, "home", MATCH_136_RULES);
    expect(state.current).toEqual({ home: 8, away: 7 });
    expect(state.volleyball.change_ends).toBe(true);

    for (let i = 0; i < 3; i++) {
      state = calculateVolleyballScore(state, "away", MATCH_136_RULES);
    }
    for (let i = 0; i < 7; i++) {
      state = calculateVolleyballScore(state, "home", MATCH_136_RULES);
    }

    expect(state.sets).toHaveLength(5);
    expect(state.sets[4]).toMatchObject({ home: 15, away: 10 });
    expect(state.final_sets).toEqual([3, 2]);
    expect(state.match_won).toBe(true);

    const totalHome = state.sets.reduce((sum, s) => sum + s.home, 0);
    const totalAway = state.sets.reduce((sum, s) => sum + s.away, 0);
    expect(totalHome).toBe(102);
    expect(totalAway).toBe(102);
  });
});
