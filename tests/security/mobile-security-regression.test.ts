import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("Mobile Security Regression Invariants", () => {
  const mobileRoot = path.resolve(__dirname, "../../src");

  it("match/[id].tsx calls search_umpires RPC instead of unescaped PostgREST string filter", () => {
    const source = fs.readFileSync(path.join(mobileRoot, "app/match/[id].tsx"), "utf8");

    expect(source).toContain('supabase.rpc("search_umpires"');
    expect(source).not.toContain("username.ilike.%${query.trim()}%");
  });

  it("tournament/[id]/teams.tsx requests only public columns and never wildcard *", () => {
    const source = fs.readFileSync(path.join(mobileRoot, "app/tournament/[id]/teams.tsx"), "utf8");

    expect(source).toContain('.select("id, tournament_id, team_id, name, seed, created_at")');
    expect(source).not.toContain('.from("tournament_participants").select("*")');
  });

  it("AuthProvider.tsx imports clearOfflineQueue and purges queue on SIGNED_OUT", () => {
    const source = fs.readFileSync(path.join(mobileRoot, "components/AuthProvider.tsx"), "utf8");

    expect(source).toContain('import { clearOfflineQueue } from "@/lib/offline/offlineQueue";');
    expect(source).toContain('event === "SIGNED_OUT"');
    expect(source).toContain("clearOfflineQueue");
  });
});
