// نگهبان مرز کلاینت/سرور — با `node scripts/check-client-imports.js`.
//
// از هر فایل 'use client' (app/ components/ lib/) گراف ایمپورت‌ها رو دنبال
// می‌کنه و اگه به ماژول سروری برسه شکست می‌خوره: lib/prisma، lib/auth،
// ایمپورت غیر-type از @prisma/client، next/server، next/headers.
// (دقیقا همین نشتی اتفاق افتاده بود: صفحه‌های گزارش هفتگی Domain/DOMAINS رو
// از lib/weeklyReport/metrics می‌گرفتن که خودش prisma ایمپورت می‌کرد — حالا
// از lib/weeklyReport/domains می‌گیرن.) `import type` / `export type` نادیده
// گرفته می‌شن چون در بیلد پاک می‌شن.

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const SCAN_ROOTS = ["app", "components", "lib"];
const EXTS = [".ts", ".tsx", ".js", ".jsx", ".mjs"];

const FORBIDDEN_FILES = new Set(["lib/prisma", "lib/auth"]);
const FORBIDDEN_PACKAGES = new Set(["@prisma/client", "next/server", "next/headers"]);

function rel(p) {
  return path.relative(ROOT, p).split(path.sep).join("/");
}

function resolveFile(base) {
  if (fs.existsSync(base) && fs.statSync(base).isFile()) return base;
  for (const e of EXTS) if (fs.existsSync(base + e)) return base + e;
  for (const e of EXTS) {
    const idx = path.join(base, "index" + e);
    if (fs.existsSync(idx)) return idx;
  }
  return null;
}

// بلوک‌کامنت‌ها و کامنت‌های خطی رو حذف می‌کنه تا ایمپورت‌های کامنت‌شده حساب نشن.
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");
}

// هر spec که واقعا در runtime ایمپورت می‌شه (نه type-only).
function runtimeSpecs(src) {
  const out = [];
  const code = stripComments(src);
  // import ... from "x" / export ... from "x"
  const re = /\b(import|export)\s+([^'";]*?)\s*from\s*["']([^"']+)["']/g;
  for (const m of code.matchAll(re)) {
    const clause = m[2].trim();
    if (/^type\b/.test(clause)) continue;
    // import { type A, type B } from "x" — اگه همه‌ی اسامی type باشن، type-only‌ه.
    const braces = clause.match(/^\{([\s\S]*)\}$/);
    if (braces) {
      const names = braces[1].split(",").map((s) => s.trim()).filter(Boolean);
      if (names.length && names.every((n) => /^type\s/.test(n))) continue;
    }
    out.push(m[3]);
  }
  // side-effect import "x"
  for (const m of code.matchAll(/\bimport\s*["']([^"']+)["']/g)) out.push(m[1]);
  // dynamic import("x") / require("x")
  for (const m of code.matchAll(/\b(?:import|require)\s*\(\s*["']([^"']+)["']\s*\)/g)) out.push(m[1]);
  return out;
}

function isClientFile(src) {
  const head = stripComments(src).trimStart();
  return /^["']use client["']/.test(head);
}

const files = [];
function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === ".next" || e.name === "__tests__") continue;
      walk(p);
    } else if (/\.(ts|tsx|js|jsx)$/.test(e.name) && !/\.(test|spec)\.[tj]sx?$/.test(e.name)) {
      files.push(p);
    }
  }
}
SCAN_ROOTS.forEach((d) => walk(path.join(ROOT, d)));

const srcCache = new Map();
function read(p) {
  if (!srcCache.has(p)) srcCache.set(p, fs.readFileSync(p, "utf8"));
  return srcCache.get(p);
}

const violations = [];

function check(entry) {
  // BFS با نگه‌داشتن مسیر برای گزارش خوانا
  const seen = new Map([[entry, null]]);
  const queue = [entry];
  while (queue.length) {
    const cur = queue.shift();
    for (const spec of runtimeSpecs(read(cur))) {
      let target = null;
      if (spec.startsWith("@/")) target = resolveFile(path.join(ROOT, spec.slice(2)));
      else if (spec.startsWith(".")) target = resolveFile(path.resolve(path.dirname(cur), spec));
      else {
        const pkg = spec;
        if (FORBIDDEN_PACKAGES.has(pkg)) {
          violations.push({ entry, chain: chainOf(seen, cur).concat(pkg) });
        }
        continue;
      }
      if (!target) continue;
      const r = rel(target).replace(/\.(ts|tsx|js|jsx|mjs)$/, "");
      if (FORBIDDEN_FILES.has(r)) {
        violations.push({ entry, chain: chainOf(seen, cur).concat(rel(target)) });
        continue;
      }
      if (!seen.has(target)) {
        seen.set(target, cur);
        queue.push(target);
      }
    }
  }
}

function chainOf(seen, node) {
  const chain = [];
  for (let n = node; n; n = seen.get(n)) chain.unshift(rel(n));
  return chain;
}

let clientCount = 0;
for (const f of files) {
  if (!isClientFile(read(f))) continue;
  clientCount++;
  check(f);
}

if (violations.length) {
  console.error(`✗ ${violations.length} server-only import(s) reachable from 'use client' files:`);
  const shown = new Set();
  for (const v of violations) {
    const line = v.chain.join(" → ");
    if (shown.has(line)) continue;
    shown.add(line);
    console.error("  " + line);
  }
  process.exit(1);
}

console.log(`✓ ${clientCount} 'use client' files — no server-only imports reachable`);
