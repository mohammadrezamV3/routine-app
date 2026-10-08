import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

// باگ: روی دسکتاپ خانه‌ی «ثبت معامله» در چارت (ردیف سوم گرید با overflow:hidden)
// آن‌قدر کوتاه می‌شد که دکمه‌ی ثبت نصفه بریده دیده می‌شد. ردیف آخر باید کف ثابت داشته باشد.
describe("گرید صفحه‌ی چارت", () => {
  const css = readFileSync(join(__dirname, "..", "app", "globals.css"), "utf8");
  it("ردیف پایینی (ثبت معامله) کف ارتفاع دارد", () => {
    const m = css.match(/\.tv-page\{[^}]*grid-template-rows:([^;]+);/);
    expect(m).not.toBeNull();
    const rows = m![1].trim();
    expect(rows).toMatch(/minmax\(\s*\d+px\s*,[^)]*\)\s*$/);
  });
});
