// نگهبان allowlist تنظیمات — با `node scripts/check-setting-keys.js`.
//
// `/api/settings/[key]` فقط کلیدهای داخل `lib/userSettingKeys.ts` رو قبول
// می‌کنه. اگه یه فیچر جدید کلیدی بسازه و یادش بره اون‌جا ثبتش کنه، همون فیچر
// در production با ۴۰۰ می‌شکنه — بی‌سروصدا، چون فقط یه fetch ناموفقه.
// (دقیقا همین اتفاق افتاد: شش کلید trade/bodyMetrics جا افتاده بودن و فقط
// تست مرورگری گرفتشون.) این اسکریپت همون بررسی رو ارزون و بدون مرورگر
// انجام می‌ده.

const fs = require("fs");
const path = require("path");

const ROOTS = ["app", "lib", "components"];
const ALLOWLIST_FILE = "lib/userSettingKeys.ts";

// lib/appSettings.ts تنظیمات *سراسری اپ* (مدل AppSetting) رو مدیریت می‌کنه،
// نه تنظیمات کاربر — کلیدهاش هیچ‌وقت از `/api/settings/[key]` رد نمی‌شن، پس
// allowlist این‌جا اصلا بهشون ربطی نداره. فقط چون تابع داخلی خودش هم
// اتفاقی getSetting نام داره توی الگو گیر می‌افتاد.
const SKIP_FILES = new Set(["lib/appSettings.ts"]);

const allowSrc = fs.readFileSync(ALLOWLIST_FILE, "utf8");
const allowed = new Set([...allowSrc.matchAll(/^\s*(\w+):\s*"([^"]+)"/gm)].map((m) => m[2]));
const serverManaged = new Set(
  [...(allowSrc.match(/SERVER_MANAGED_SETTING_KEYS[\s\S]*?\]\)/) || [""])[0].matchAll(/"([^"]+)"/g)].map((m) => m[1])
);

// کلیدها از دو راه به این API می‌رسن: wrapperهای getSetting/setSetting، و
// fetch مستقیم /api/settings/<key>.
const PATTERNS = [
  /(?:getSetting|setSetting)\s*(?:<[^(]*?>)?\s*\(\s*"([^"]+)"/g,
  /["'`]\/api\/settings\/([a-zA-Z][a-zA-Z0-9_]*)/g,
];

const found = new Map(); // key -> "file:line"

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === ".next") continue;
      walk(p);
    } else if (/\.(ts|tsx)$/.test(e.name) && p !== ALLOWLIST_FILE && !SKIP_FILES.has(p.split(path.sep).join("/"))) {
      const src = fs.readFileSync(p, "utf8");
      for (const re of PATTERNS) {
        for (const m of src.matchAll(re)) {
          const line = src.slice(0, m.index).split("\n").length;
          if (!found.has(m[1])) found.set(m[1], `${p}:${line}`);
        }
      }
    }
  }
}

ROOTS.forEach(walk);

const missing = [...found].filter(([k]) => !allowed.has(k) && !serverManaged.has(k));

if (missing.length) {
  console.error("✖ این کلیدها استفاده می‌شن ولی توی allowlist نیستن — در production با ۴۰۰ می‌شکنن:\n");
  for (const [k, where] of missing) console.error(`  "${k}"  (${where})`);
  console.error(`\nهرکدوم رو به SETTING_KEYS در ${ALLOWLIST_FILE} اضافه کن.`);
  process.exit(1);
}

console.log(`✔ هر ${found.size} کلید تنظیمات استفاده‌شده در allowlist ثبت شده.`);
