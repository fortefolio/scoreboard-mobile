import { describe, expect, it } from "vitest";
import { MAX_PASSWORD_LENGTH, validatePassword } from "@/lib/auth/passwordValidation";

describe("Mobile validatePassword", () => {
  it("rejects passwords shorter than 8 characters", () => {
    expect(validatePassword("Ab1!").isValid).toBe(false);
    expect(validatePassword("1234567").isValid).toBe(false);
  });

  it("accepts passphrases without uppercase, digits, or symbols (ASVS V6.2.5)", () => {
    expect(validatePassword("correct horse battery staple").isValid).toBe(true);
    expect(validatePassword("abcdefgh").isValid).toBe(true);
  });

  it("rejects passwords exceeding maximum length", () => {
    expect(validatePassword("a".repeat(MAX_PASSWORD_LENGTH + 1)).isValid).toBe(false);
  });
});
