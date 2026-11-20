import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";

const VALID_NOTIFICATION_COLUMNS = new Set([
  "id",
  "user_id",
  "title",
  "body",
  "data",
  "read_at",
  "created_at",
]);

describe("notifications query schema alignment", () => {
  it("selects only existing columns from public.notifications in notifications.tsx", () => {
    const filePath = path.resolve(__dirname, "../../src/app/(tabs)/notifications.tsx");
    const source = fs.readFileSync(filePath, "utf8");
    const selectMatch = source.match(
      /\.from\("notifications"\)[\s\S]*?\.select\("([^"]+)"\)/
    );

    expect(selectMatch).not.toBeNull();
    const columns = selectMatch![1]
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);

    expect(columns.length).toBeGreaterThan(0);
    for (const col of columns) {
      expect(VALID_NOTIFICATION_COLUMNS.has(col)).toBe(true);
    }
    expect(columns).not.toContain("type");
  });
});
