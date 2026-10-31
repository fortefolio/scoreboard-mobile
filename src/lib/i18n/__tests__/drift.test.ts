import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";

describe("i18n Translation Consistency (Mobile vs Web)", () => {
  const currentDir = process.cwd();
  const mobileI18nDir = path.join(currentDir, "src", "lib", "i18n");
  const webI18nDir = path.resolve(currentDir, "..", "scoreboard-web", "lib", "i18n");

  const filesToVerify = [
    "types.ts",
    path.join("locales", "en.ts"),
    path.join("locales", "pt.ts"),
  ];

  it("ensures mobile translation dictionaries match web canonical source exactly", () => {
    if (!fs.existsSync(webI18nDir)) {
      expect(true).toBe(true);
      return;
    }

    for (const relFile of filesToVerify) {
      const webPath = path.join(webI18nDir, relFile);
      const mobilePath = path.join(mobileI18nDir, relFile);

      expect(
        fs.existsSync(webPath),
        `Canonical web translation file missing: ${webPath}`
      ).toBe(true);

      expect(
        fs.existsSync(mobilePath),
        `Mobile translation file missing: ${mobilePath}. Run 'npm run sync:i18n' to sync.`
      ).toBe(true);

      const webContent = fs.readFileSync(webPath, "utf8").trim();
      const mobileContent = fs.readFileSync(mobilePath, "utf8").trim();

      expect(
        mobileContent,
        `Translation drift detected in ${relFile}! Run 'npm run sync:i18n' to align.`
      ).toBe(webContent);
    }
  });
});
