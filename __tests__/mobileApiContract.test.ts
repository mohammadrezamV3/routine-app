import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

// lib/mobileApiContract.ts نسخه‌ی مرجعه؛ اپ اندروید یک کپیِ عینی توی
// mobile/src/lib/api-contract.ts داره (پروژه‌ی Vite جدا، نمی‌تونه از ریشه import کنه).
// اگه یکی بدونِ اون یکی عوض بشه، سرور و اپ روی شکلِ داده اختلاف پیدا می‌کنن.
describe("mobile API contract", () => {
  it("mobile/src/lib/api-contract.ts is an exact copy of lib/mobileApiContract.ts", () => {
    const root = path.resolve(__dirname, "..");
    const server = fs.readFileSync(path.join(root, "lib/mobileApiContract.ts"), "utf8");
    const mobilePath = path.join(root, "mobile/src/lib/api-contract.ts");
    if (!fs.existsSync(mobilePath)) return; // چک‌اوتِ بدونِ پوشه‌ی mobile
    expect(fs.readFileSync(mobilePath, "utf8")).toBe(server);
  });
});

describe("roadmap contract mirrors lib/roadmapPlan", () => {
  it("level/hours options match (value + label, same order)", async () => {
    const { LEVEL_OPTIONS, HOURS_OPTIONS } = await import("@/lib/roadmapPlan");
    const { ROADMAP_LEVEL_OPTIONS, ROADMAP_HOURS_OPTIONS } = await import("@/lib/mobileApiContract");
    expect(ROADMAP_LEVEL_OPTIONS.map((o) => [o.value, o.label])).toEqual(LEVEL_OPTIONS.map((o) => [o.value, o.label]));
    expect(ROADMAP_HOURS_OPTIONS.map((o) => [o.value, o.label])).toEqual(HOURS_OPTIONS.map((o) => [o.value, o.label]));
  });
});
