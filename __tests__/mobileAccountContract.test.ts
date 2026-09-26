import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

// lib/mobileAccountContract.ts نسخه‌ی مرجعه؛ اپ اندروید کپیِ عینی‌اش رو در
// mobile/src/lib/account-contract.ts داره (پروژه‌ی Vite جدا، از ریشه import نمی‌کنه).
describe("mobile account API contract", () => {
  const root = path.resolve(__dirname, "..");
  const server = fs.readFileSync(path.join(root, "lib/mobileAccountContract.ts"), "utf8");

  it("mobile/src/lib/account-contract.ts is an exact copy of lib/mobileAccountContract.ts", () => {
    const mobilePath = path.join(root, "mobile/src/lib/account-contract.ts");
    if (!fs.existsSync(mobilePath)) return; // چک‌اوتِ بدونِ پوشه‌ی mobile
    expect(fs.readFileSync(mobilePath, "utf8")).toBe(server);
  });

  it("has no imports (so it can be copied verbatim)", () => {
    expect(server).not.toMatch(/^\s*import\s/m);
  });
});
