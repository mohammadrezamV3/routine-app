// پلاگین PostCSS برای مرورگرهای قدیمی‌تر موبایل (iOS Safari 13، کروم/وب‌ویو 70+).
//
// اصل کار: برای هر قابلیت جدید، یک «اعلام جایگزین» *قبل* از اعلام اصلی در همون
// قاعده گذاشته می‌شه. مرورگر مدرن اعلام اصلی (که دیرتر میاد) رو می‌بینه و همون
// می‌بره؛ مرورگر قدیمی اعلام اصلی رو نمی‌شناسه و دور می‌ریزه و جایگزین می‌مونه.
// پس ظاهر مرورگرهای مدرن هیچ تغییری نمی‌کنه.
//
//  - inset: به top/right/bottom/left باز می‌شه (سافاری قبل از 14.1)
//  - ویژگی‌های منطقی (margin-inline-start، padding-inline، inset-inline-end، ...):
//    به معادل فیزیکی با فرض rtl (کل اپ dir=rtl ـه) باز می‌شه
//  - :is(a, b): مرورگر بدون :is کل قاعده رو دور می‌ریزه، پس یک نسخه‌ی باز‌شده
//    قبل از قاعده‌ی اصلی گذاشته می‌شه (قاعده‌هایی که :where دارن یا باز‌کردنشون
//    امن نیست دست‌نخورده می‌مونن)
//  - واحدهای dvh/svh/lvh: نسخه‌ی vh قبلش گذاشته می‌شه (اگه از قبل دستی نباشه)
const valueParser = require("postcss-value-parser");
const postcssApi = require("postcss");

// تقسیم مقدار به اجزای سطح‌بالا (جدا شده با فاصله)؛ توابع مثل calc() یک جزء‌اند
function parts(value) {
  const out = [];
  let cur = "";
  const nodes = valueParser(value).nodes;
  for (const n of nodes) {
    if (n.type === "space") {
      if (cur) out.push(cur);
      cur = "";
    } else {
      cur += valueParser.stringify(n);
    }
  }
  if (cur) out.push(cur);
  return out;
}

const SIDE = { "inline-start": "right", "inline-end": "left", "block-start": "top", "block-end": "bottom" };
const LOGICAL_RE = /^(margin|padding|inset|border)-(inline|block)(?:-(start|end))?(?:-(color|width|style))?$/;

function physicalProp(base, side, suffix) {
  if (base === "inset") return side;
  return `${base}-${side}${suffix ? "-" + suffix : ""}`;
}

function insertBefore(decl, prop, value) {
  decl.cloneBefore({ prop, value });
}

function expandInset(decl) {
  const p = parts(decl.value);
  if (!p.length || p.length > 4) return;
  if (/^(inherit|initial|unset|revert)/.test(p[0])) return;
  const top = p[0];
  const right = p.length >= 2 ? p[1] : top;
  const bottom = p.length >= 3 ? p[2] : top;
  const left = p.length >= 4 ? p[3] : right;
  insertBefore(decl, "top", top);
  insertBefore(decl, "right", right);
  insertBefore(decl, "bottom", bottom);
  insertBefore(decl, "left", left);
}

// جایگزین فیزیکی ویژگی منطقی فقط برای مرورگری که خود ویژگی منطقی رو نمی‌شناسه:
// داخل `@supports not (<prop>: inherit)` درست بعد از همون قاعده (هم‌سلکتور، هم‌جا
// در آبشار). قبلا جایگزین مستقیم قبل از اعلام منطقی گذاشته می‌شد؛ در rtl بی‌ضرر
// بود ولی در چیدمان انگلیسی (ltr، docs/i18n.md) مرورگر مدرن هر دو رو اعمال
// می‌کرد — مثلا `left:18px` جایگزین + `inset-inline-end:18px` (یعنی right) با هم.
function fallbackTarget(decl) {
  const rule = decl.parent;
  if (!rule || rule.type !== "rule") return null;
  let p = rule.parent;
  while (p) { if (p.type === "atrule" && /keyframes/i.test(p.name)) return null; p = p.parent; }
  if (!rule.__arionFb) rule.__arionFb = new Map();
  const cond = `not (${decl.prop}: inherit)`;
  let target = rule.__arionFb.get(cond);
  if (!target) {
    const at = postcssApi.atRule({ name: "supports", params: cond });
    target = postcssApi.rule({ selector: rule.selector });
    target.__arionIs = true;
    at.append(target);
    const last = rule.__arionFbLast || rule;
    last.after(at);
    rule.__arionFbLast = at;
    rule.__arionFb.set(cond, target);
  }
  return target;
}

function addFallback(decl, prop, value) {
  const target = fallbackTarget(decl);
  if (!target) { insertBefore(decl, prop, value); return; }
  const d = postcssApi.decl({ prop, value, important: decl.important });
  d.__arionDone = true;
  target.append(d);
}

function expandLogical(decl) {
  const m = LOGICAL_RE.exec(decl.prop);
  if (!m) return;
  const [, base, axis, edge, suffix] = m;
  const val = decl.value;
  if (/^(inherit|initial|unset|revert)$/.test(val.trim())) return;
  const insertBefore = addFallback;
  if (edge) {
    insertBefore(decl, physicalProp(base, SIDE[`${axis}-${edge}`], suffix), val);
    return;
  }
  const a = axis === "inline" ? ["right", "left"] : ["top", "bottom"]; // [start, end] در rtl
  if (base === "border" && !suffix) {
    // border-inline: 1px solid x — همه‌ی اجزا برای هر دو سمت
    insertBefore(decl, `border-${a[0]}`, val);
    insertBefore(decl, `border-${a[1]}`, val);
    return;
  }
  const p = parts(val);
  if (!p.length || p.length > 2) return;
  insertBefore(decl, physicalProp(base, a[0], suffix), p[0]);
  insertBefore(decl, physicalProp(base, a[1], suffix), p.length === 2 ? p[1] : p[0]);
}

const VIEWPORT_UNIT_RE = /(\d)(dvh|svh|lvh)\b/g;

function dvhFallback(decl) {
  if (decl.prop.startsWith("--")) return;
  if (!VIEWPORT_UNIT_RE.test(decl.value)) { VIEWPORT_UNIT_RE.lastIndex = 0; return; }
  VIEWPORT_UNIT_RE.lastIndex = 0;
  // اگه قبلش همین ویژگی دستی (معمولا با vh) اعلام شده، دست نزن
  let prev = decl.prev();
  while (prev) {
    if (prev.type === "decl" && prev.prop === decl.prop) return;
    prev = prev.prev();
  }
  insertBefore(decl, decl.prop, decl.value.replace(VIEWPORT_UNIT_RE, "$1vh"));
}

// ── باز‌کردن :is() ──────────────────────────────────────────────
function splitTop(str) {
  const out = [];
  let depth = 0, cur = "", q = "";
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (q) { cur += ch; if (ch === q && str[i - 1] !== "\\") q = ""; continue; }
    if (ch === '"' || ch === "'") { q = ch; cur += ch; continue; }
    if (ch === "(" || ch === "[") depth++;
    else if (ch === ")" || ch === "]") depth--;
    if (ch === "," && depth === 0) { out.push(cur); cur = ""; } else cur += ch;
  }
  out.push(cur);
  return out;
}

// یک انتخابگر ساده → لیست انتخابگرهای باز‌شده، یا null اگه امن نیست
function expandSelector(sel, depthGuard) {
  const idx = sel.indexOf(":is(");
  if (idx === -1) return [sel];
  if (depthGuard > 6) return null;
  let depth = 0, end = -1;
  for (let i = idx + 3; i < sel.length; i++) {
    if (sel[i] === "(") depth++;
    else if (sel[i] === ")") { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end === -1) return null;
  const before = sel.slice(0, idx);
  const after = sel.slice(end + 1);
  const args = splitTop(sel.slice(idx + 4, end)).map((a) => a.trim()).filter(Boolean);
  if (!args.length) return null;
  const glued = before.length > 0 && !/[\s>+~]$/.test(before); // چسبیده به بخش قبلی
  const out = [];
  for (const a of args) {
    if (/[\s>+~]/.test(splitOutsideParens(a)) && before.trim() !== "" && !/\s$/.test(before)) return null;
    if (glued && /^[a-zA-Z*]/.test(a)) return null;
    const sub = expandSelector(before + a + after, depthGuard + 1);
    if (!sub) return null;
    out.push(...sub);
  }
  return out;
}

// فقط بخش بیرون پرانتز/براکت برای تشخیص ترکیب‌کننده
function splitOutsideParens(a) {
  let depth = 0, o = "";
  for (const ch of a) {
    if (ch === "(" || ch === "[") depth++;
    else if (ch === ")" || ch === "]") depth--;
    else if (depth === 0) o += ch;
  }
  return o;
}

function expandIsRule(rule) {
  if (rule.__arionIs) return;
  rule.__arionIs = true;
  const sel = rule.selector;
  if (!sel || sel.indexOf(":is(") === -1 || sel.indexOf(":where(") !== -1) return;
  let p = rule.parent;
  while (p) { if (p.type === "atrule" && /keyframes/i.test(p.name)) return; p = p.parent; }
  const all = [];
  for (const one of splitTop(sel)) {
    const r = expandSelector(one.trim(), 0);
    if (!r) return;
    all.push(...r);
  }
  const clone = rule.clone({ selector: all.join(",\n") });
  clone.__arionIs = true;
  rule.before(clone);
}

module.exports = () => ({
  postcssPlugin: "arion-compat",
  Rule(rule) { expandIsRule(rule); },
  Declaration(decl) {
    if (decl.__arionDone) return;
    decl.__arionDone = true;
    const prop = decl.prop;
    if (prop === "inset") expandInset(decl);
    else if (LOGICAL_RE.test(prop)) expandLogical(decl);
    else if (/(dvh|svh|lvh)/.test(decl.value)) dvhFallback(decl);
  },
});
module.exports.postcss = true;
