// کدِ وب (app/ components/ lib/) با وابستگی‌های node_modulesِ mobile/ باندل
// می‌شه — پس نسخه‌ی هر وابستگیِ مشترک باید دقیقا همونی باشه که وب باهاش
// تست/بیلد می‌شه (framer-motion 11 ↔ 12 مثلا API انیمیشن رو عوض کرده بود).
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (p: string) => JSON.parse(fs.readFileSync(path.resolve(__dirname, p), "utf8"));
const root = read("../../../package.json");
const mobile = read("../../package.json");

/** وابستگی‌های runtimeِ وب که کدِ کلاینتیِ روت‌شده import می‌کنه */
const REQUIRED_SHARED = ["react", "react-dom", "framer-motion", "lucide-react", "animejs", "clsx", "tailwind-merge", "zxcvbn", "@types/zxcvbn"];

describe("shared dependency parity (mobile ↔ web)", () => {
  it.each(REQUIRED_SHARED)("%s is a mobile dependency with the web's exact range", (dep) => {
    expect(root.dependencies[dep], `root package.json lacks ${dep}`).toBeDefined();
    expect(mobile.dependencies[dep]).toBe(root.dependencies[dep]);
  });

  it("every dependency present in both package.json files uses the same range", () => {
    const mismatches = Object.keys(mobile.dependencies)
      .filter((d) => d in root.dependencies && root.dependencies[d] !== mobile.dependencies[d])
      .map((d) => `${d}: web ${root.dependencies[d]} ≠ mobile ${mobile.dependencies[d]}`);
    expect(mismatches).toEqual([]);
  });

  // caret همون range ـه ولی نسخه‌ی نصب‌شده می‌تونه جلو بزنه (lucide-react 1.48 آیکونِ
  // سبدِ خرید رو عوض کرده بود ← diffِ پیکسلی با وب). lockها باید همون نسخه رو قفل کنن.
  it.each(REQUIRED_SHARED)("%s is locked to the web's resolved version", (dep) => {
    const rootLock = read("../../../package-lock.json");
    const mobileLock = read("../../package-lock.json");
    expect(mobileLock.packages[`node_modules/${dep}`]?.version).toBe(rootLock.packages[`node_modules/${dep}`]?.version);
  });

  it("tailwindcss majors match (same preset/content semantics)", () => {
    const major = (r: string) => r.replace(/^[^\d]*/, "").split(".")[0];
    expect(major(mobile.devDependencies.tailwindcss)).toBe(major(root.devDependencies.tailwindcss));
  });
});
