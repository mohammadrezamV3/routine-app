import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import {
  SOCIAL_CHAT_MAX_BODY, SOCIAL_CHAT_MAX_PAGE, SOCIAL_CHAT_REPORT_REASONS, SOCIAL_WEEKLY_DOMAINS, SOCIAL_WEEKLY_DOMAIN_LABELS,
  SOCIAL_ERROR_MODULE_LOCKED,
} from "@/lib/mobileSocialContract";
import { CHAT_PAGE_SIZE, CHAT_REPORT_REASONS, MAX_CHAT_BODY } from "@/lib/tradeChat";
import { DOMAINS, DOMAIN_LABELS_FA } from "@/lib/weeklyReport/metrics";
import { SYNC_ERROR_MODULE_LOCKED } from "@/lib/mobileApiContract";

// lib/mobileSocialContract.ts نسخه‌ی مرجعه؛ اپ اندروید کپیِ عینی‌اش رو در
// mobile/src/lib/social-contract.ts داره.
describe("mobile social API contract", () => {
  const root = path.resolve(__dirname, "..");
  const server = fs.readFileSync(path.join(root, "lib/mobileSocialContract.ts"), "utf8");

  it("mobile/src/lib/social-contract.ts is an exact copy of lib/mobileSocialContract.ts", () => {
    const mobilePath = path.join(root, "mobile/src/lib/social-contract.ts");
    if (!fs.existsSync(mobilePath)) return; // چک‌اوتِ بدونِ پوشه‌ی mobile
    expect(fs.readFileSync(mobilePath, "utf8")).toBe(server);
  });

  it("has no imports (so it can be copied verbatim)", () => {
    expect(server).not.toMatch(/^\s*import\s/m);
  });

  it("mirrored constants stay in sync with the server sources", () => {
    expect(SOCIAL_CHAT_MAX_BODY).toBe(MAX_CHAT_BODY);
    expect(SOCIAL_CHAT_MAX_PAGE).toBe(CHAT_PAGE_SIZE);
    expect(SOCIAL_CHAT_REPORT_REASONS).toEqual(CHAT_REPORT_REASONS.map((r) => ({ value: r.value, label: r.label })));
    expect(SOCIAL_WEEKLY_DOMAINS).toEqual(DOMAINS);
    expect(SOCIAL_WEEKLY_DOMAIN_LABELS).toEqual(DOMAIN_LABELS_FA);
    expect(SOCIAL_ERROR_MODULE_LOCKED).toBe(SYNC_ERROR_MODULE_LOCKED);
  });
});
