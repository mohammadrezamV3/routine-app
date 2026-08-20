// نگهبانِ ضدِ SQL Injection — با `node scripts/check-sql-safety.js`.
//
// امروز این پروژه هیچ SQLِ خامی نداره: همه‌ی دسترسی‌ها از Prisma رد می‌شن و
// Prisma کوئری‌ها رو پارامتری می‌سازه (مقدارِ کاربر هیچ‌وقت با رشته به SQL
// چسبونده نمی‌شه)، پس تزریق ساختاراً ممکن نیست. چیزی که *می‌تونه* این تضمین
// رو بشکنه، اضافه‌شدنِ یکی از APIهای خامِ Prisma در آینده‌ست.
//
// این اسکریپت دقیقاً همون‌ها رو می‌گیره:
//   • $queryRawUnsafe / $executeRawUnsafe — رشته‌ی خام، بدونِ پارامتر.
//     همیشه ممنوع.
//   • $queryRaw / $executeRaw — با tagged template امن‌ن، ولی اگه یه رشته‌ی
//     ساخته‌شده بهشون پاس داده بشه دیگه امن نیستن. این‌جا کلاً علامت می‌خورن
//     تا آدم عمداً بررسیشون کنه.
// اگه روزی واقعاً به SQLِ خام نیاز شد، همون خط رو با
// `// sql-safety-ok: <دلیل>` علامت بزن.

const fs = require("fs");
const path = require("path");

const ROOTS = ["app", "lib", "prisma", "components"];
const PATTERNS = [
  { re: /\$queryRawUnsafe|\$executeRawUnsafe/, msg: "Prisma raw-unsafe API (رشته‌ی خام، پارامتری نیست)" },
  { re: /\$queryRaw|\$executeRaw/, msg: "Prisma raw SQL — باید دستی بررسی بشه" },
];

const findings = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      walk(p);
    } else if (/\.(ts|tsx|js)$/.test(entry.name)) {
      const lines = fs.readFileSync(p, "utf8").split("\n");
      lines.forEach((line, i) => {
        if (line.includes("sql-safety-ok")) return;
        for (const { re, msg } of PATTERNS) {
          if (re.test(line)) findings.push({ file: p, line: i + 1, msg, text: line.trim().slice(0, 120) });
        }
      });
    }
  }
}

ROOTS.forEach(walk);

if (findings.length) {
  console.error("✖ SQLِ خام پیدا شد — هر مورد باید بررسی بشه:\n");
  for (const f of findings) console.error(`  ${f.file}:${f.line}  ${f.msg}\n    ${f.text}`);
  console.error(`\n${findings.length} مورد. اگه واقعاً لازمه، خط رو با "// sql-safety-ok: <دلیل>" علامت بزن.`);
  process.exit(1);
}

console.log("✔ هیچ SQLِ خامی نیست — همه‌ی کوئری‌ها از Prisma و پارامتری‌ان، پس SQL injection ممکن نیست.");
