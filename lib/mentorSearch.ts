// جستجوی هوشمندِ منتور — منطقِ خالص (بدونِ Prisma) تا هم تست‌پذیر باشه هم
// سمتِ سرور (lib/mentorSearchServer.ts) روی یک مجموعه‌ی محدودِ نامزد اجرا بشه.
//
// مراحل:
//   ۱) یکسان‌سازیِ متن (normalizeFa): ی/ي/ى، ک/ك، ه/ە/ة/ۀ، أ/إ/آ/ٱ → ا، حذفِ
//      تطویل و اعراب، نیم‌فاصله و فاصله‌های عجیب → فاصله، ارقامِ فارسی/عربی →
//      لاتین، حروفِ کوچک، علائم → فاصله.
//   ۲) توکن‌سازی و حذفِ کلماتِ ربطیِ بی‌اثر («و»، «در»، «برای» …).
//   ۳) هم‌معنی‌ها (SYNONYM_GROUPS) و فینگلیش (LATIN_ALIASES) — «کنکور» با
//      «آزمون سراسری» و «konkur» هم پیدا می‌شه.
//   ۴) تطبیقِ تقریبیِ هر توکن: برابر، پیشوند، فاصله‌ی دامرو-لونشتاین با آستانه‌ی
//      وابسته به طول (با هزینه‌ی کمتر برای حروفِ هم‌صدا مثلِ ک/گ، س/ص/ث)، و
//      شباهتِ سه‌حرفی (trigram) به‌عنوانِ پشتیبان.
//   ۵) امتیازِ مرتبط‌بودن ۰..۱ با وزنِ هر فیلد (نام > تخصص/نقش > عنوان > بیو).
//      منتوری که به اندازه‌ی کافی مرتبط نیست (زیرِ RELEVANCE_MIN) اصلاً نمیاد —
//      امتیازِ شایستگی فقط ترتیبِ *نتایجِ مرتبط* رو عوض می‌کنه (blendScore).

// ───────────────────────── یکسان‌سازی ─────────────────────────

const CHAR_MAP: Record<string, string> = {
  "ي": "ی", "ى": "ی", "ئ": "ی", "ې": "ی", "ێ": "ی",
  "ك": "ک", "ڪ": "ک",
  "ە": "ه", "ة": "ه", "ۀ": "ه", "ھ": "ه", "ہ": "ه",
  "أ": "ا", "إ": "ا", "آ": "ا", "ٱ": "ا", "ٲ": "ا", "ٳ": "ا",
  "ؤ": "و", "ۆ": "و",
  "ء": "",
};

// اعراب/تنوین/مد (U+064B..U+065F)، الفِ کوچک (U+0670)، تطویل (U+0640)، و
// کاراکترهای جهت/نامرئی — حذف
const STRIP_RE = /[\u064B-\u065F\u0670\u0640\u200E\u200F\u202A-\u202E\u2066-\u2069\uFEFF\u00AD]/g;
// نیم‌فاصله (ZWNJ/ZWJ) و فاصله‌های یونیکدی → فاصله
const SPACE_RE = /[\u200B-\u200D\u00A0\u2000-\u200A\u202F\u205F\u3000\s]+/g;
// هر چیزی جز حرف/رقم → فاصله (حروفِ فارسی/عربی + لاتین + رقم؛ «،» «؛» «؟» هم علامت‌اند)
const NON_WORD_RE = /[^0-9a-z\u0621-\u063A\u0641-\u064A\u066E-\u06D3\u06D5\u06FA-\u06FF]+/g;

/** یکسان‌سازیِ متنِ فارسی/عربی/لاتین برای مقایسه (نه برای نمایش) */
export function normalizeFa(input: string | null | undefined): string {
  if (!input) return "";
  let s = String(input).normalize("NFKC").toLowerCase();
  s = s.replace(STRIP_RE, "");
  let out = "";
  for (const ch of s) {
    const code = ch.charCodeAt(0);
    if (code >= 0x06f0 && code <= 0x06f9) out += String(code - 0x06f0);
    else if (code >= 0x0660 && code <= 0x0669) out += String(code - 0x0660);
    else out += CHAR_MAP[ch] ?? ch;
  }
  return out.replace(SPACE_RE, " ").replace(NON_WORD_RE, " ").replace(/ +/g, " ").trim();
}

// کلماتِ ربطی که در جستجو اثری ندارن (بعد از یکسان‌سازی)
const STOPWORDS = new Set([
  "و", "در", "به", "از", "با", "برای", "که", "را", "یا", "تا", "این", "ان", "های", "ها", "ی",
  "منتور", "مربی", "مشاور", "استاد", // عنوانِ عمومی — تقریباً روی همه هست و فقط نویز می‌سازه
  "the", "and", "for", "of", "in",
]);

/** توکن‌های معنادارِ یک متن (یکسان‌شده، بدونِ کلماتِ ربطی) */
export function tokenize(input: string | null | undefined, keepStopwords = false): string[] {
  const n = normalizeFa(input);
  if (!n) return [];
  const toks = n.split(" ").filter(Boolean);
  return keepStopwords ? toks : toks.filter((t) => !STOPWORDS.has(t));
}

// ───────────────────────── هم‌معنی‌ها ─────────────────────────

/**
 * گروه‌های هم‌معنی (هر عضو می‌تونه چندکلمه‌ای باشه). جستجوی هر عضو، بقیه‌ی
 * اعضای گروه رو هم با وزنِ کمی کمتر (SYNONYM_FACTOR) پیدا می‌کنه.
 */
export const SYNONYM_GROUPS: string[][] = [
  ["کنکور", "آزمون سراسری", "کنکوری", "konkur", "konkoor", "concour"],
  ["بدنسازی", "فیتنس", "باشگاه", "بدن سازی", "fitness", "bodybuilding", "gym"],
  ["تغذیه", "رژیم", "رژیم غذایی", "کالری", "دایت", "diet", "nutrition"],
  ["ریاضی", "حسابان", "هندسه", "math", "riazi"],
  ["برنامه ریزی", "برنامه‌ریزی", "روتین", "planning", "routine"],
  ["مشاوره", "مشاوره تحصیلی", "مشاور تحصیلی", "moshaver"],
  ["زبان", "انگلیسی", "آیلتس", "تافل", "english", "ielts", "toefl"],
  ["کاهش وزن", "لاغری", "چربی سوزی", "کاهش چربی"],
  ["افزایش حجم", "حجم", "عضله سازی"],
  ["تمرین اصلاحی", "حرکات اصلاحی"],
];

/** برچسب‌ها/کلیدواژه‌های هر حوزه — تا «بدنسازی» منتوری رو که فقط دسته‌اش FITNESS ـه هم پیدا کنه */
export const CATEGORY_KEYWORDS: Record<string, string> = {
  ROUTINE: "روتین و برنامه ریزی روتین برنامه ریزی",
  FITNESS: "بدنسازی فیتنس ورزش تمرین",
  NUTRITION: "تغذیه رژیم",
};

const SYNONYM_FACTOR = 0.9;

type Alt = { tokens: string[]; factor: number };

const NORMALIZED_GROUPS: string[][] = SYNONYM_GROUPS.map((g) => g.map((x) => normalizeFa(x)).filter(Boolean));

/** همه‌ی شکل‌های قابلِ جستجوی یک عبارت: خودش + هم‌معنی‌هایی که با آن (تقریباً) برابرند */
export function expandSynonyms(term: string): Alt[] {
  const t = normalizeFa(term);
  const out: Alt[] = [{ tokens: t.split(" ").filter(Boolean), factor: 1 }];
  const seen = new Set([t]);
  for (const group of NORMALIZED_GROUPS) {
    // عضوِ تک‌کلمه‌ای با تحملِ غلطِ املایی (کنکر → کنکور)، چندکلمه‌ای فقط برابر
    const hit = group.some((m) => m === t || (!m.includes(" ") && !t.includes(" ") && tokenSimilarity(t, m) >= 0.66));
    if (!hit) continue;
    for (const m of group) {
      if (seen.has(m)) continue;
      seen.add(m);
      out.push({ tokens: m.split(" ").filter(Boolean), factor: SYNONYM_FACTOR });
    }
  }
  return out;
}

// ───────────────────────── فاصله‌ی ویرایشی ─────────────────────────

// حروفی که هم‌صدا یا در تایپِ سریع جابه‌جا می‌شن — جایگزینی‌شان نصفِ هزینه
const SOUND_ALIKE: string[] = ["کگ", "تط", "سصث", "زذضظ", "هح", "قغ", "اع", "یی"];
const ALIKE = new Map<string, string>();
SOUND_ALIKE.forEach((g, i) => { for (const ch of g) ALIKE.set(ch, String(i)); });

function subCost(a: string, b: string): number {
  if (a === b) return 0;
  const ga = ALIKE.get(a);
  return ga !== undefined && ga === ALIKE.get(b) ? 0.5 : 1;
}

/**
 * فاصله‌ی دامرو-لونشتاین (optimal string alignment) با هزینه‌ی جایگزینیِ
 * کمتر برای حروفِ هم‌صدا. `max` برای قطعِ زودهنگام: اگه کمینه‌ی یک ردیف از
 * آن بیشتر شد، max+1 برمی‌گرده.
 */
export function damerauLevenshtein(a: string, b: string, max = Infinity): number {
  const A = Array.from(a);
  const B = Array.from(b);
  const n = A.length;
  const m = B.length;
  if (n === 0) return m;
  if (m === 0) return n;
  if (Math.abs(n - m) > max) return max + 1;
  let prev2: number[] = new Array(m + 1).fill(0);
  let prev: number[] = Array.from({ length: m + 1 }, (_, j) => j);
  let cur: number[] = new Array(m + 1).fill(0);
  for (let i = 1; i <= n; i++) {
    cur[0] = i;
    let rowMin = cur[0];
    for (let j = 1; j <= m; j++) {
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + subCost(A[i - 1], B[j - 1]));
      if (i > 1 && j > 1 && A[i - 1] === B[j - 2] && A[i - 2] === B[j - 1]) v = Math.min(v, prev2[j - 2] + 1);
      cur[j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    [prev2, prev, cur] = [prev, cur, prev2];
  }
  return prev[m];
}

/** آستانه‌ی خطای مجاز بر اساسِ طولِ کلمه‌ی جستجو */
export function typoThreshold(len: number): number {
  if (len <= 2) return 0;
  if (len === 3) return 0.5; // فقط یک جایگزینیِ هم‌صدا
  if (len <= 5) return 1;
  if (len <= 8) return 2;
  return 3;
}

function trigrams(s: string): Set<string> {
  const p = ` ${s} `;
  const out = new Set<string>();
  const chars = Array.from(p);
  for (let i = 0; i + 3 <= chars.length; i++) out.add(chars.slice(i, i + 3).join(""));
  return out;
}

/** شباهتِ جاکاردِ سه‌حرفی ۰..۱ */
export function trigramSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const A = trigrams(a);
  const B = trigrams(b);
  let inter = 0;
  A.forEach((g) => { if (B.has(g)) inter++; });
  return inter / (A.size + B.size - inter);
}

/**
 * شباهتِ یک توکنِ جستجو (q) با یک توکنِ متن (d)، ۰..۱. صفر یعنی «مطابق نیست».
 *   ۱      برابر
 *   ≤۰٫۹   d با q شروع می‌شه (در حالِ تایپ: «بدنس» → «بدنسازی»)
 *   ≤۰٫۸۸  غلطِ املایی در آستانه‌ی مجاز
 *   ≤۰٫۷   پیشوندِ تقریبی یا شباهتِ سه‌حرفیِ بالا
 */
export function tokenSimilarity(q: string, d: string): number {
  if (!q || !d) return 0;
  if (q === d) return 1;
  const ql = Array.from(q).length;
  const dl = Array.from(d).length;
  // پیشوند: هرچه کوتاه‌تر، مطمئنیِ کمتر («کن» خیلی چیزها را شروع می‌کند)
  if (ql >= 2 && dl > ql && d.startsWith(q)) return ql >= 4 ? 0.9 : ql === 3 ? 0.8 : 0.7;
  const thr = typoThreshold(Math.min(ql, Math.max(dl, 3)));
  if (thr > 0) {
    const dist = damerauLevenshtein(q, d, thr);
    if (dist <= thr) return 0.88 - 0.2 * (dist / thr);
    // پیشوندِ تقریبی: «کنکو» یا «بدنصاز» در برابرِ «کنکوری»/«بدنسازی»
    if (ql >= 4 && dl > ql) {
      const pd = damerauLevenshtein(q, Array.from(d).slice(0, ql).join(""), 1);
      if (pd <= 1) return 0.68;
    }
  }
  if (ql >= 5 && dl >= 5) {
    const tri = trigramSimilarity(q, d);
    if (tri >= 0.5) return Math.min(0.7, 0.4 + tri * 0.4);
  }
  return 0;
}

// ───────────────────────── سند و امتیاز ─────────────────────────

export type SearchDocInput = {
  name: string;
  username?: string | null;
  headline?: string | null;
  routineRole?: string | null;
  specialties?: string[];
  bio?: string | null;
  categories?: string[];
};

type Field = { weight: number; tokens: string[]; compact: string };

export type SearchDoc = { fields: Field[] };

// وزنِ هر فیلد در امتیاز — نام و تخصص مهم‌ترین، بیو کم‌وزن (متنِ آزادِ طولانی)
export const FIELD_WEIGHTS = { name: 1, specialties: 0.95, routineRole: 0.9, headline: 0.85, categories: 0.8, bio: 0.55 } as const;
const BIO_MAX_CHARS = 800;

function field(weight: number, text: string): Field {
  const tokens = Array.from(new Set(tokenize(text, true)));
  // جفت‌های کنارِ هم هم به‌صورتِ چسبیده اضافه می‌شن: «برنامه ریزی» ↔ «برنامهریزی»
  const base = tokenize(text, true);
  for (let i = 0; i + 1 < base.length; i++) tokens.push(base[i] + base[i + 1]);
  return { weight, tokens, compact: normalizeFa(text).replace(/ /g, "") };
}

/** سندِ قابلِ جستجوی یک منتور — یک‌بار ساخته و برای همه‌ی عبارت‌ها استفاده می‌شه */
export function buildSearchDoc(d: SearchDocInput, categoryLabels: (c: string) => string = () => ""): SearchDoc {
  const fields: Field[] = [field(FIELD_WEIGHTS.name, `${d.name} ${d.username ?? ""}`)];
  if (d.specialties?.length) fields.push(field(FIELD_WEIGHTS.specialties, d.specialties.join(" ، ")));
  if (d.routineRole) fields.push(field(FIELD_WEIGHTS.routineRole, d.routineRole));
  if (d.headline) fields.push(field(FIELD_WEIGHTS.headline, d.headline));
  if (d.categories?.length) {
    fields.push(field(FIELD_WEIGHTS.categories, d.categories.map((c) => `${categoryLabels(c)} ${CATEGORY_KEYWORDS[c] ?? ""}`).join(" ")));
  }
  if (d.bio) fields.push(field(FIELD_WEIGHTS.bio, d.bio.slice(0, BIO_MAX_CHARS)));
  return { fields };
}

export type ParsedQuery = { raw: string; terms: Alt[][]; compact: string };

// سقفِ عبارت‌های جستجو — ورودیِ خیلی بلند نه معنادارتره نه ارزون
const MAX_TERMS = 6;

/**
 * عبارتِ جستجو → فهرستِ «ترم»ها؛ هر ترم چند شکلِ جایگزین (خودش + هم‌معنی‌ها).
 * عبارت‌های چندکلمه‌ایِ هم‌معنی («آزمون سراسری») اول به‌صورتِ یک ترم برداشته می‌شن.
 */
export function parseQuery(q: string): ParsedQuery {
  // عبارتی که فقط از کلماتِ عمومی ساخته شده («مشاور») همان کلمه‌ها را نگه می‌دارد
  let toks = tokenize(q);
  if (toks.length === 0) toks = tokenize(q, true);
  const terms: Alt[][] = [];
  for (let i = 0; i < toks.length && terms.length < MAX_TERMS; i++) {
    // جفتِ کلمه‌ای که خودش عضوِ یک گروهِ هم‌معنیه («آزمون سراسری»، «کاهش وزن»)
    if (i + 1 < toks.length) {
      const pair = `${toks[i]} ${toks[i + 1]}`;
      if (NORMALIZED_GROUPS.some((g) => g.includes(pair))) {
        terms.push(expandSynonyms(pair));
        i++;
        continue;
      }
    }
    terms.push(expandSynonyms(toks[i]));
  }
  return { raw: q, terms, compact: normalizeFa(q).replace(/ /g, "") };
}

function bestTokenMatch(qt: string, f: Field): number {
  let best = 0;
  for (const d of f.tokens) {
    const s = tokenSimilarity(qt, d);
    if (s > best) best = s;
    if (best === 1) break;
  }
  return best;
}

/** امتیازِ یک شکلِ جایگزین در یک فیلد: همه‌ی کلمه‌هایش باید پیدا شوند */
function altFieldScore(alt: Alt, f: Field): number {
  if (alt.tokens.length === 0) return 0;
  let sum = 0;
  for (const t of alt.tokens) {
    const s = bestTokenMatch(t, f);
    if (s === 0) {
      // عبارتِ چندکلمه‌ای که در متن چسبیده نوشته شده («برنامهریزی»)
      if (alt.tokens.length > 1) {
        const joined = alt.tokens.join("");
        return f.compact.includes(joined) ? 0.92 * alt.factor * f.weight : 0;
      }
      return 0;
    }
    sum += s;
  }
  return (sum / alt.tokens.length) * alt.factor * f.weight;
}

function termScore(alts: Alt[], doc: SearchDoc): number {
  let best = 0;
  for (const alt of alts) {
    for (const f of doc.fields) {
      const s = altFieldScore(alt, f);
      if (s > best) best = s;
    }
  }
  return best;
}

/** حداقلِ مرتبط‌بودن برای اینکه منتور در نتیجه بیاد */
export const RELEVANCE_MIN = 0.45;

/**
 * مرتبط‌بودنِ یک سند با عبارت، ۰..۱. همه‌ی ترم‌ها باید پیدا بشن، مگر عبارتِ
 * سه‌ترمی یا بیشتر که یک ترمِ پیدانشده (مثلاً غلطِ خیلی زیاد) رو تحمل می‌کنه —
 * با جریمه. عبارتِ خالی → ۱ (بدونِ فیلترِ متنی).
 */
export function relevance(pq: ParsedQuery, doc: SearchDoc): number {
  if (pq.terms.length === 0) return 1;
  const scores = pq.terms.map((alts) => termScore(alts, doc));
  const matched = scores.filter((s) => s > 0).length;
  const need = pq.terms.length >= 3 ? pq.terms.length - 1 : pq.terms.length;
  if (matched < need) return 0;
  let r = scores.reduce((a, b) => a + b, 0) / pq.terms.length;
  // کلِ عبارت عیناً (بدونِ فاصله) در یک فیلدِ مهم آمده → کمی جلوتر
  if (pq.compact.length >= 3 && doc.fields.some((f) => f.weight >= 0.8 && f.compact.includes(pq.compact))) r = Math.min(1, r + 0.08);
  return Math.max(0, Math.min(1, r));
}

/**
 * ترکیبِ مرتبط‌بودن با امتیازِ شایستگی (۰..۱۰۰) برای ترتیبِ «بهترین نتیجه».
 * مرتبط‌بودن غالبه: منتورِ خیلی خوب ولی کم‌ربط جلوی منتورِ دقیقاً مرتبط نمی‌افته.
 */
export function blendScore(rel: number, merit0to100: number): number {
  const m = Math.max(0, Math.min(100, merit0to100 || 0)) / 100;
  return rel * 0.75 + m * 0.25;
}

// ───────────────────────── فیلترها (کلاینت و سرور) ─────────────────────────
// همان کلیدها در نشانیِ صفحه (/mentors?…، قابلِ اشتراک) و در GET /api/mentors.

export type MentorSort = "best" | "rating" | "new";
export const MENTOR_SORTS: MentorSort[] = ["best", "rating", "new"];
export const MIN_RATING_OPTIONS = [4, 4.5] as const;
export const MAX_RESPONSE_OPTIONS = [12, 24, 48] as const;
export const SEARCH_QUERY_MAX = 60;

export type MentorFilters = {
  q: string;
  /** "" = همه‌ی حوزه‌ها */
  category: string;
  sort: MentorSort;
  /** فقط منتورهای دارای مدرکِ تأییدشده (در حوزه‌ی انتخاب‌شده، یا هر حوزه) */
  cert: boolean;
  /** فقط منتورهایی که همین الان درخواست می‌پذیرند */
  open: boolean;
  /** ۰ = بدونِ حداقل */
  minRating: number;
  /** ۰ = مهم نیست؛ وگرنه زمانِ معمولِ پاسخِ اعلام‌شده حداکثر این‌قدر ساعت */
  maxResponse: number;
};

export const DEFAULT_FILTERS: MentorFilters = { q: "", category: "", sort: "best", cert: false, open: false, minRating: 0, maxResponse: 0 };

type ParamReader = { get(key: string): string | null };

/** نشانی/کوئری → فیلترِ معتبر (مقدارِ نامعتبر = پیش‌فرض) */
export function filtersFromParams(sp: ParamReader, isCategory: (v: string) => boolean): MentorFilters {
  const q = (sp.get("q") ?? "").replace(/\s+/g, " ").trim().slice(0, SEARCH_QUERY_MAX);
  const catRaw = sp.get("cat") ?? sp.get("category") ?? "";
  const sortRaw = sp.get("sort");
  const rating = Number(sp.get("rating"));
  const resp = Number(sp.get("resp"));
  return {
    q,
    category: isCategory(catRaw) ? catRaw : "",
    sort: sortRaw === "rating" || sortRaw === "new" ? sortRaw : "best",
    cert: sp.get("cert") === "1",
    open: sp.get("open") === "1",
    minRating: (MIN_RATING_OPTIONS as readonly number[]).includes(rating) ? rating : 0,
    maxResponse: (MAX_RESPONSE_OPTIONS as readonly number[]).includes(resp) ? resp : 0,
  };
}

/** فیلتر → کوئری (فقط مقدارهای غیرپیش‌فرض، تا نشانی کوتاه بماند) */
export function filtersToParams(f: MentorFilters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.category) p.set("cat", f.category);
  if (f.sort !== "best") p.set("sort", f.sort);
  if (f.cert) p.set("cert", "1");
  if (f.open) p.set("open", "1");
  if (f.minRating) p.set("rating", String(f.minRating));
  if (f.maxResponse) p.set("resp", String(f.maxResponse));
  return p;
}

/** چند فیلترِ غیرپیش‌فرض فعال است (جستجو و ترتیب شمرده نمی‌شوند) */
export function activeFilterCount(f: MentorFilters): number {
  return [!!f.category, f.cert, f.open, f.minRating > 0, f.maxResponse > 0].filter(Boolean).length;
}

/** هیچ جستجو/فیلتر/ترتیبِ غیرپیش‌فرضی نیست → ویترینِ «محبوب/تازه» نمایش داده می‌شود */
export function isDefaultView(f: MentorFilters): boolean {
  return !f.q && activeFilterCount(f) === 0 && f.sort === "best";
}
