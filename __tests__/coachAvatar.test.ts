import { describe, it, expect } from "vitest";
import { AVATAR_PAIRS, avatarPair } from "@/lib/avatarGradient";

describe("avatarPair", () => {
  it("is stable for the same id", () => {
    expect(avatarPair("user_123")).toEqual(avatarPair("user_123"));
  });
  it("always returns one of the fixed pairs, even for empty ids", () => {
    for (const id of ["", "a", "b", "cm0xyz", "😀", "x".repeat(200)]) {
      expect(AVATAR_PAIRS).toContainEqual(avatarPair(id));
    }
  });
  it("spreads ids over several pairs", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 60; i++) seen.add(avatarPair(`u${i}`).join());
    expect(seen.size).toBeGreaterThan(2);
  });
});
