// بخش‌های اصلی آریون روی زیردامنه‌ها: routine / trade / workout — قرارداد کامل در docs/sections.md
//
// خالص و بدون import سروری: هم middleware (edge)، هم سرور، هم کلاینت از همین فایل می‌خونن.
// همه‌چیز پشت یک env  عمومیه: NEXT_PUBLIC_SECTION_BASE_DOMAIN (مثلا arionapp.ir). تا ست نشده
// زیردامنه‌ای در کار نیست، هیچ ریدایرکتی نمی‌شه و دامنه‌ی اصلی دقیقا مثل قبل همه‌ی بخش‌ها رو داره.
// دامنه‌ی اصلی (apex/www) همیشه «همه‌ی بخش‌ها»ست (section = null)؛ زیردامنه‌ها متمرکزن.
import { tr } from "@/lib/i18n";

export const SECTION_KEYS = ["routine", "trade", "workout"] as const;
export type SectionKey = (typeof SECTION_KEYS)[number];

/** هدری که middleware روی درخواست می‌ذاره تا سرور (layout، صفحه‌ها) بخش رو بدونه */
export const SECTION_HEADER = "x-arion-section";

export function isSectionKey(v: unknown): v is SectionKey {
  return typeof v === "string" && (SECTION_KEYS as readonly string[]).includes(v);
}

// ─── بخش موثر (کوکی انتخاب کاربر) ───────────────────────────────────────────
// هر سه بخش روی هر میزبان در دسترسن (تا اپ نصب‌شده‌ی PWA با عوض‌شدن دامنه از scope بیرون نیفته).
// بخش موثر = کوکی host-only `arion_section` (اگه معتبر باشه) وگرنه بخش میزبان، وگرنه null (دامنه‌ی اصلی).
// کوکی عمدا host-only ـه (نه دامنه‌ی مشترک) تا هر اپ نصب‌شده انتخاب خودش رو یادش بمونه.
export const SECTION_COOKIE = "arion_section";
export const SECTION_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** بخش موثر از روی بخش میزبان و مقدار خام کوکی؛ کوکی نامعتبر نادیده گرفته می‌شه */
export function resolveEffectiveSection(hostSection: SectionKey | null, cookieValue: string | null | undefined): SectionKey | null {
  return isSectionKey(cookieValue) ? cookieValue : hostSection;
}

/** رشته‌ی Set-Cookie / document.cookie برای انتخاب بخش (host-only، یک سال، SameSite=Lax) */
export function serializeSectionCookie(section: SectionKey, secure: boolean): string {
  return `${SECTION_COOKIE}=${section}; Path=/; Max-Age=${SECTION_COOKIE_MAX_AGE}; SameSite=Lax${secure ? "; Secure" : ""}`;
}

/** اگه مسیر روی بخش موثر بسته‌ست، بخشی که باید بهش سوییچ بشه (اولین صاحب مسیر)؛ وگرنه null */
export function sectionToSwitchTo(effective: SectionKey | null, pathname: string): SectionKey | null {
  if (pathAllowedIn(effective, pathname)) return null;
  return sectionsOwningPath(pathname)[0] ?? null;
}

export type SectionMeta = {
  key: SectionKey;
  /** اولین بخش میزبان: routine.arionapp.ir */
  subdomain: string;
  /** متن لاتین کنار لوگو در هدر و سوییچر (ARION | TRADE) */
  wordmark: string;
  readonly label: string;
  readonly tagline: string;
  /** نشان A با گرادیان رنگ همون بخش (شفاف، هر دو تم) */
  icon: string;
  /** گرادیان نشان، از بالا به پایین (نمونه‌برداری از لوگوی رسمی) */
  colors: { from: string; mid: string; to: string };
  /** دسته‌های منتوری که روی این بخش نمایش داده می‌شن (lib/mentorCategories.ts) */
  mentorCategories: string[];
  /** دسته‌های بلاگ مرتبط (lib/blog/categories.ts) */
  blogCategories: string[];
};

export const SECTION_META: Record<SectionKey, SectionMeta> = {
  routine: {
    key: "routine",
    subdomain: "routine",
    wordmark: "ROUTINE",
    get label() { return tr("روتین", "Routine"); },
    get tagline() { return tr("برنامه روزانه، خواب و رودمپ", "Daily plan, sleep and roadmaps"); },
    icon: "/images/sections/icon-routine.png",
    colors: { from: "#34D26B", mid: "#09C796", to: "#00AAB1" },
    mentorCategories: ["ROUTINE"],
    blogCategories: ["routine", "habits", "planning", "sleep"],
  },
  trade: {
    key: "trade",
    subdomain: "trade",
    wordmark: "TRADE",
    get label() { return tr("ترید", "Trade"); },
    get tagline() { return tr("ژورنال، تقویم اقتصادی و متاتریدر", "Journal, economic calendar and MetaTrader"); },
    icon: "/images/sections/icon-trade.png",
    colors: { from: "#00B9F3", mid: "#01A4F2", to: "#0475F5" },
    mentorCategories: ["TRADE"],
    blogCategories: ["trading"],
  },
  workout: {
    key: "workout",
    subdomain: "workout",
    wordmark: "WORKOUT",
    get label() { return tr("ورزش", "Workout"); },
    get tagline() { return tr("برنامه تمرینی، کالری و خواب", "Workout plan, calories and sleep"); },
    icon: "/images/sections/icon-workout.png",
    colors: { from: "#F11834", mid: "#E9133D", to: "#D0084B" },
    mentorCategories: ["FITNESS", "NUTRITION"],
    blogCategories: ["fitness", "nutrition", "sleep"],
  },
};

// ─── مالکیت مسیرها ──────────────────────────────────────────────────────────
// مسیری که در هیچ فهرستی نیست «مشترک»ه و روی همه‌ی میزبان‌ها باز می‌شه (داشبورد، حساب،
// ورود، ادمین، منتورها، آنالیز، بلاگ، درباره، قوانین، اشتراک، استریک، API، ...).
// مسیری که مال یک یا چند بخشه، روی زیردامنه‌ی بخش دیگه به زیردامنه‌ی صاحبش ریدایرکت می‌شه.
const OWNED_PREFIXES: Record<SectionKey, string[]> = {
  routine: ["/weekly", "/sleep", "/roadmaps", "/routine", "/habit-tracker", "/daily-planner", "/ai-planner", "/learning-roadmap", "/account/general/routine", "/streak"],
  trade: ["/trade", "/trading-journal", "/economic-calendar", "/forex-sessions", "/account/general/trade"],
  workout: ["/exercise", "/sleep", "/bodybuilding-program", "/calorie-counter", "/account/general/exercise"],
};

/** صفحه‌های فرود عمومی (بدون داده‌ی کاربر) که روی دامنه‌ی اصلی هم به زیردامنه‌ی صاحبشون ۳۰۸ می‌شن (یکی‌شدن سئو) */
const SEO_LANDING_PATHS: Record<SectionKey, string[]> = {
  routine: ["/routine", "/habit-tracker", "/daily-planner", "/ai-planner", "/learning-roadmap"],
  trade: ["/trading-journal", "/economic-calendar", "/forex-sessions"],
  workout: ["/bodybuilding-program", "/calorie-counter"],
};

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/** بخش‌هایی که این مسیر مال اوناست؛ خالی = مشترک */
export function sectionsOwningPath(pathname: string): SectionKey[] {
  return SECTION_KEYS.filter((k) => OWNED_PREFIXES[k].some((p) => matchesPrefix(pathname, p)));
}

/** آیا این مسیر روی این میزبان باز می‌شه؟ section = null (دامنه‌ی اصلی) همه‌چیز رو باز می‌کنه */
export function pathAllowedIn(section: SectionKey | null, pathname: string): boolean {
  if (!section) return true;
  const owners = sectionsOwningPath(pathname);
  return owners.length === 0 || owners.includes(section);
}

/** صاحب صفحه‌ی فرود سئو (برای ریدایرکت از دامنه‌ی اصلی و canonical)، وگرنه null */
export function seoLandingOwner(pathname: string): SectionKey | null {
  for (const k of SECTION_KEYS) if (SEO_LANDING_PATHS[k].some((p) => matchesPrefix(pathname, p))) return k;
  return null;
}

// ─── میزبان‌ها ──────────────────────────────────────────────────────────────

/** دامنه‌ی پایه بدون پورت (arionapp.ir)، یا null یعنی زیردامنه‌ها خاموشن */
export function sectionBaseDomain(): string | null {
  const raw = (process.env.NEXT_PUBLIC_SECTION_BASE_DOMAIN || "").trim().toLowerCase();
  if (!raw) return null;
  return raw.replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^\.+/, "") || null;
}

export function isSectionHostingEnabled(): boolean {
  return sectionBaseDomain() !== null;
}

function stripPort(host: string): string {
  return host.trim().toLowerCase().replace(/:\d+$/, "");
}

/** trade.arionapp.ir → "trade"؛ دامنه‌ی اصلی، www یا میزبان ناشناس → null */
export function sectionFromHost(host: string | null | undefined): SectionKey | null {
  const base = sectionBaseDomain();
  if (!base || !host) return null;
  const h = stripPort(host);
  if (!h.endsWith(`.${base}`)) return null;
  const sub = h.slice(0, -(base.length + 1));
  return SECTION_KEYS.find((k) => SECTION_META[k].subdomain === sub) ?? null;
}

/** میزبان متعلق به خانواده‌ی دامنه‌ی ماست (اصلی، www یا یکی از زیردامنه‌ها)؟ */
export function isOwnHost(host: string | null | undefined): boolean {
  const base = sectionBaseDomain();
  if (!base || !host) return false;
  const h = stripPort(host);
  return h === base || h.endsWith(`.${base}`);
}

/**
 * origin کامل یک بخش (https://trade.arionapp.ir)؛ null = دامنه‌ی اصلی.
 * `current` (اختیاری، مثلا location.origin) پروتکل و پورت رو حفظ می‌کنه تا روی
 * trade.localhost:3000 هم درست کار کنه. وقتی زیردامنه‌ها خاموشن null برمی‌گردونه.
 */
export function sectionOrigin(section: SectionKey | null, current?: string): string | null {
  const base = sectionBaseDomain();
  if (!base) return null;
  let protocol = "https:";
  let port = "";
  if (current) {
    try {
      const u = new URL(current);
      protocol = u.protocol;
      port = u.port ? `:${u.port}` : "";
    } catch {
      // پیش‌فرض https
    }
  }
  const host = section ? `${SECTION_META[section].subdomain}.${base}` : base;
  return `${protocol}//${host}${port}`;
}

/** آدرس یک مسیر روی میزبان یک بخش؛ وقتی زیردامنه‌ها خاموشن همون مسیر نسبی */
export function sectionUrl(section: SectionKey | null, path: string, current?: string): string {
  const origin = sectionOrigin(section, current);
  const clean = path.startsWith("/") ? path : `/${path}`;
  return origin ? `${origin}${clean}` : clean;
}

/**
 * دامنه‌ی کوکی‌های مشترک بین زیردامنه‌ها («.arionapp.ir»)، فقط وقتی میزبان جزو خانواده‌ی
 * دامنه‌ی ماست؛ وگرنه null (کوکی host-only مثل قبل). روی localhost/IP هیچ‌وقت.
 */
export function cookieDomainForHost(host: string | null | undefined): string | null {
  const base = sectionBaseDomain();
  if (!base || !isOwnHost(host)) return null;
  if (base === "localhost" || /^[\d.]+$/.test(base)) return null;
  return `.${base}`;
}

/** پسوند آماده برای document.cookie («; domain=.arionapp.ir» یا خالی) */
export function clientCookieDomainAttr(): string {
  if (typeof window === "undefined") return "";
  const d = cookieDomainForHost(window.location.host);
  return d ? `; domain=${d}` : "";
}
