import { describe, it, expect } from "vitest";
import { buildInviteUrl, cleanOrigin, requestOrigin } from "@/lib/inviteLink";

const h = (o: Record<string, string>) => ({ get: (k: string) => o[k.toLowerCase()] ?? null });

describe("inviteLink", () => {
  it("builds /?ref=CODE without double slashes", () => {
    expect(buildInviteUrl("https://arionapp.ir/", "abcd12")).toBe("https://arionapp.ir/?ref=ABCD12");
    expect(buildInviteUrl("https://trade.arionapp.ir", "ABCD")).toBe("https://trade.arionapp.ir/?ref=ABCD");
  });
  it("falls back to origin for invalid code", () => {
    expect(buildInviteUrl("https://a.ir", "a b")).toBe("https://a.ir/");
    expect(buildInviteUrl("https://a.ir", null)).toBe("https://a.ir/");
  });
  it("cleans origin", () => {
    expect(cleanOrigin("javascript:alert(1)")).toBe("");
    expect(cleanOrigin(undefined)).toBe("");
  });
  it("uses forwarded host, ignores internal hosts", () => {
    expect(requestOrigin(h({ "x-forwarded-host": "workout.arionapp.ir", "x-forwarded-proto": "https" }), "https://x.ir")).toBe("https://workout.arionapp.ir");
    expect(requestOrigin(h({ host: "localhost:3000" }), "https://arionapp.ir/")).toBe("https://arionapp.ir");
  });
});
