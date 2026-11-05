import { describe, expect, it } from "vitest";
import { validatePassword } from "@/lib/auth/passwordValidation";

describe("Mobile validatePassword", () => {
  it("rejects passwords shorter than 8 characters", () => {
    const res = validatePassword("Ab1!");
    expect(res.isValid).toBe(false);
    expect(res.errors.minLength).toBe(false);
  });

  it("rejects passwords missing symbols or numbers", () => {
    expect(validatePassword("Abcdefgh").isValid).toBe(false);
    expect(validatePassword("Abcdefg1").isValid).toBe(false);
    expect(validatePassword("abcdef1!").isValid).toBe(false);
    expect(validatePassword("ABCDEF1!").isValid).toBe(false);
  });

  it("accepts a password meeting all criteria", () => {
    const res = validatePassword("SecurePass123!");
    expect(res.isValid).toBe(true);
  });
});
