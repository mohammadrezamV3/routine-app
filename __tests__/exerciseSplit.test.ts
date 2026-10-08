import { describe, it, expect } from "vitest";
import { muscleKeysOf, splitRuleIssues, toKeyedSplit, validateUserSplit } from "@/lib/exerciseSplit";

describe("قواعد تقسیم هفتگی", () => {
  it("جلوبازو و پشت‌بازو هم‌روز ممنوع", () => {
    const issues = splitRuleIssues([{ day: "شنبه", muscles: ["biceps", "triceps"] }]);
    expect(issues.join(" ")).toContain("جلوبازو و پشت‌بازو");
  });

  it("عضله‌ی بزرگ دو روز پشت‌سرهم (48 ساعت) — جمعه و شنبه هم", () => {
    const issues = splitRuleIssues([
      { day: "جمعه", muscles: ["chest"] },
      { day: "شنبه", muscles: ["chest", "triceps"] },
    ]);
    expect(issues.join(" ")).toContain("48 ساعت");
  });

  it("تقسیم اصولی PPL هیچ ایرادی نداره", () => {
    expect(splitRuleIssues([
      { day: "شنبه", muscles: ["chest", "shoulders", "triceps"] },
      { day: "دوشنبه", muscles: ["back", "biceps"] },
      { day: "چهارشنبه", muscles: ["quads", "hamstrings", "glutes", "calves"] },
    ], { level: "intermediate" })).toEqual([]);
  });

  it("عضله‌ی اصلی جاافتاده با 3 روز یا بیشتر", () => {
    const issues = splitRuleIssues([
      { day: "شنبه", muscles: ["chest", "triceps"] },
      { day: "دوشنبه", muscles: ["back", "biceps"] },
      { day: "چهارشنبه", muscles: ["chest", "triceps"] },
    ]);
    expect(issues.join(" ")).toContain("در کل هفته تمرین نمی‌شوند");
  });

  it("نام‌های فارسی مدل → کلید (پشت‌بازو با پشت قاطی نمی‌شه)", () => {
    expect(muscleKeysOf("پشت‌بازو")).toEqual(["triceps"]);
    expect(muscleKeysOf("پشت ران")).toEqual(["hamstrings"]);
    expect(muscleKeysOf("پشت")).toEqual(["back"]);
    expect(muscleKeysOf("پا")).toEqual(["quads", "hamstrings", "glutes"]);
    expect(toKeyedSplit([{ day: "شنبه", muscles: ["سینه", "پشت‌بازو"] }])[0].muscles).toEqual(["chest", "triceps"]);
  });

  it("اعتبارسنجی تقسیم کاربر سمت سرور", () => {
    expect(validateUserSplit([{ day: "شنبه", muscles: ["chest"] }], ["شنبه"]).ok).toBe(true);
    expect(validateUserSplit([{ day: "شنبه", muscles: ["chest"] }], ["شنبه", "دوشنبه"]).ok).toBe(false);
    expect(validateUserSplit([{ day: "جمعه", muscles: ["chest"] }], ["شنبه"]).ok).toBe(false);
    expect(validateUserSplit([{ day: "شنبه", muscles: ["wings"] }], ["شنبه"]).ok).toBe(false);
    expect(validateUserSplit([{ day: "شنبه", muscles: [] }], ["شنبه"]).ok).toBe(false);
  });
});
