// بلاک پالت‌های آماده‌ی app/palette-themes.css (amethyst/sunset/graphite) رو از lib/palette.ts می‌سازه.
// اجرا: npx tsx scripts/gen-palette-css.ts
// تست __tests__/palette.test.ts مطمئن می‌شه فایل با خروجی همین تابع هم‌خوانه.
import { readFileSync, writeFileSync } from "fs";
import path from "path";
import { generatedPresetBlock, PRESET_BLOCK_START, PRESET_BLOCK_END } from "../lib/palette";

const file = path.join(__dirname, "..", "app", "palette-themes.css");
const css = readFileSync(file, "utf8");
const a = css.indexOf(PRESET_BLOCK_START);
const b = css.indexOf(PRESET_BLOCK_END);
const block = generatedPresetBlock();
if (a === -1 || b === -1) {
  writeFileSync(file, css.replace(/\s*$/, "\n\n") + block);
} else {
  writeFileSync(file, css.slice(0, a) + block + css.slice(b + PRESET_BLOCK_END.length).replace(/^\n?/, "\n"));
}
console.log("palette-themes.css updated");
