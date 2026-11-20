import { describe, it, expect } from "vitest";
import { parseNotificationDeepLink } from "./push";

describe("parseNotificationDeepLink", () => {
  const matchId = "11111111-2222-3333-4444-555555555555";
  const tournamentId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

  it("routes match notifications to the match overview screen", () => {
    expect(parseNotificationDeepLink({ match_id: matchId })).toBe(`/match/${matchId}`);
  });

  it("routes tournament notifications to the tournament overview screen", () => {
    expect(parseNotificationDeepLink({ tournament_id: tournamentId })).toBe(
      `/tournament/${tournamentId}`
    );
  });

  it("accepts allowlisted scoreboard:// URLs and rejects invalid ones", () => {
    expect(
      parseNotificationDeepLink({ url: `scoreboard://match/${matchId}` })
    ).toBe(`/match/${matchId}`);
    expect(parseNotificationDeepLink({ url: "scoreboard://admin/evil" })).toBeNull();
    expect(parseNotificationDeepLink({ match_id: "not-a-uuid" })).toBeNull();
    expect(parseNotificationDeepLink(null)).toBeNull();
  });
});
