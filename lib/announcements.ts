import { tr } from "./i18n";
// اطلاعیه‌های سراسری اپ — اعتبارسنجی مشترک روت‌های ادمین + منطق خالص انتخاب.
// هیچ import سروری این‌جا نیست تا صفحه‌ی ادمین، NotificationPanel و
// AnnouncementDelivery هم بتونن از همین سقف‌ها و همین قواعد استفاده کنن.
// متن همیشه ساده‌ست و فقط به‌صورت text رندر می‌شه.

export const ANNOUNCEMENT_TITLE_MAX = 120;
export const ANNOUNCEMENT_BODY_MAX = 4000;
/** چندتا اطلاعیه‌ی فعال به کاربر نشون داده بشه */
export const ANNOUNCEMENT_PUBLIC_LIMIT = 20;
/** سقف idهای «خوانده‌شده» که در تنظیم کاربر نگه داشته می‌شه */
export const ANNOUNCEMENT_READ_KEEP = 100;

export type PublicAnnouncement = { id: string; title: string; body: string; createdAt: string };

// ── گزینه‌های نمایش (هم‌نام enumهای prisma) ──
export const ANNOUNCEMENT_DISPLAYS = ["NONE", "POPUP", "BANNER"] as const;
export const ANNOUNCEMENT_POSITIONS = ["TOP", "BOTTOM", "TOP_RIGHT", "TOP_LEFT", "BOTTOM_RIGHT", "BOTTOM_LEFT"] as const;
export const ANNOUNCEMENT_AUDIENCES = ["ALL", "USERS", "GUESTS", "PAID", "FREE"] as const;
export const ANNOUNCEMENT_TONES = ["INFO", "SUCCESS", "WARNING", "PROMO"] as const;
export const ANNOUNCEMENT_FREQUENCIES = ["ONCE", "UNTIL_DISMISSED"] as const;
export type AnnouncementDisplay = (typeof ANNOUNCEMENT_DISPLAYS)[number];
export type AnnouncementPosition = (typeof ANNOUNCEMENT_POSITIONS)[number];
export type AnnouncementAudience = (typeof ANNOUNCEMENT_AUDIENCES)[number];
export type AnnouncementTone = (typeof ANNOUNCEMENT_TONES)[number];
export type AnnouncementFrequency = (typeof ANNOUNCEMENT_FREQUENCIES)[number];

// برچسب‌ها getter ان: زبان موقع خواندن (رندر) انتخاب می‌شه، نه موقع بارگذاری ماژول
export const ANNOUNCEMENT_DISPLAY_LABELS: Record<AnnouncementDisplay, string> = {
  get NONE() { return tr("فقط اعلان", "Notification only"); },
  get POPUP() { return tr("پاپ‌آپ", "Popup"); },
  get BANNER() { return tr("بنر روی سایت", "Banner on the site"); },
};
export const ANNOUNCEMENT_POSITION_LABELS: Record<AnnouncementPosition, string> = {
  get TOP() { return tr("نوار بالا", "Top bar"); },
  get BOTTOM() { return tr("نوار پایین", "Bottom bar"); },
  get TOP_RIGHT() { return tr("بالا راست", "Top right"); },
  get TOP_LEFT() { return tr("بالا چپ", "Top left"); },
  get BOTTOM_RIGHT() { return tr("پایین راست", "Bottom right"); },
  get BOTTOM_LEFT() { return tr("پایین چپ", "Bottom left"); },
};
export const ANNOUNCEMENT_AUDIENCE_LABELS: Record<AnnouncementAudience, string> = {
  get ALL() { return tr("همه", "Everyone"); },
  get USERS() { return tr("کاربران واردشده", "Logged-in users"); },
  get GUESTS() { return tr("مهمان‌ها", "Guests"); },
  get PAID() { return tr("دارای پلن پولی", "Paid plan users"); },
  get FREE() { return tr("بدون پلن پولی", "No paid plan"); },
};
export const ANNOUNCEMENT_TONE_LABELS: Record<AnnouncementTone, string> = {
  get INFO() { return tr("اطلاع", "Info"); },
  get SUCCESS() { return tr("موفقیت", "Success"); },
  get WARNING() { return tr("هشدار", "Warning"); },
  get PROMO() { return tr("تبلیغ", "Promo"); },
};
export const ANNOUNCEMENT_FREQUENCY_LABELS: Record<AnnouncementFrequency, string> = {
  get ONCE() { return tr("فقط یک بار", "Only once"); },
  get UNTIL_DISMISSED() { return tr("هر بار تا بسته شود", "Every time until dismissed"); },
};

/** پیشنهادهای آماده‌ی صفحه در فرم ادمین («/» = فقط صفحه‌ی اصلی) */
export const ANNOUNCEMENT_PAGE_PRESETS: { value: string; label: string }[] = [
  { value: "/", get label() { return tr("صفحه‌ی اصلی", "Home page"); } },
  { value: "/dashboard", get label() { return tr("داشبورد", "Dashboard"); } },
  { value: "/weekly", get label() { return tr("برنامه هفتگی", "Weekly plan"); } },
  { value: "/exercise", get label() { return tr("بدنسازی", "Workout"); } },
  { value: "/trade", get label() { return tr("ترید", "Trading"); } },
  { value: "/roadmaps", get label() { return tr("رودمپ‌ها", "Roadmaps"); } },
  { value: "/sleep", get label() { return tr("خواب", "Sleep"); } },
  { value: "/mentor", get label() { return tr("منتور", "Mentor"); } },
];

export const ANNOUNCEMENT_PAGES_MAX = 12;
export const ANNOUNCEMENT_PAGE_MAX_LEN = 80;
export const ANNOUNCEMENT_CTA_LABEL_MAX = 40;
export const ANNOUNCEMENT_URL_MAX = 500;
export const ANNOUNCEMENT_PRIORITY_MIN = -100;
export const ANNOUNCEMENT_PRIORITY_MAX = 100;

/** آنچه کلاینت برای پاپ‌آپ/بنر لازم داره — بدون سازنده/وضعیت داخلی */
export type DisplayAnnouncement = {
  id: string;
  title: string;
  body: string;
  display: Exclude<AnnouncementDisplay, "NONE">;
  position: AnnouncementPosition;
  pages: string[];
  tone: AnnouncementTone;
  priority: number;
  dismissible: boolean;
  frequency: AnnouncementFrequency;
  ctaLabel: string | null;
  ctaUrl: string | null;
  imageUrl: string | null;
  createdAt: string;
};

export type AnnouncementInput = {
  title: string; body: string; active: boolean; expiresAt: Date | null; startsAt: Date | null;
  showInList: boolean; display: AnnouncementDisplay; position: AnnouncementPosition; pages: string[];
  audience: AnnouncementAudience; tone: AnnouncementTone; priority: number; dismissible: boolean;
  frequency: AnnouncementFrequency; ctaLabel: string | null; ctaUrl: string | null; imageUrl: string | null;
};

/** مسیر داخلی امن (/x، نه //host) یا https:// */
export function isSafeAnnouncementUrl(u: string): boolean {
  if (!u || u.length > ANNOUNCEMENT_URL_MAX || /\s/.test(u)) return false;
  if (u.startsWith("/")) return !u.startsWith("//") && !u.startsWith("/\\");
  try {
    const url = new URL(u);
    return url.protocol === "https:" && !!url.hostname;
  } catch {
    return false;
  }
}

export function isExternalUrl(u: string): boolean {
  return /^https:\/\//i.test(u);
}

/** نرمال‌سازی یک پیشوند مسیر؛ نامعتبر → null */
export function normalizePagePrefix(raw: string): string | null {
  let p = raw.trim().toLowerCase();
  if (!p) return null;
  if (!p.startsWith("/")) p = `/${p}`;
  if (p.length > 1) p = p.replace(/\/+$/, "");
  if (!p) p = "/";
  if (p.length > ANNOUNCEMENT_PAGE_MAX_LEN) return null;
  if (!/^\/[a-z0-9\-_/]*$/.test(p) || p.includes("//")) return null;
  return p;
}

// ── انتخاب (خالص — سرور، کلاینت و تست همه از همین استفاده می‌کنن) ──

export type AnnouncementViewer = { loggedIn: boolean; paid: boolean };

/** مخاطب‌هایی که این بیننده جزوشونه («بدون پلن پولی» فقط کاربر واردشده) */
export function audiencesFor(viewer: AnnouncementViewer): AnnouncementAudience[] {
  if (!viewer.loggedIn) return ["ALL", "GUESTS"];
  return ["ALL", "USERS", viewer.paid ? "PAID" : "FREE"];
}

/** صفحه‌هایی که هیچ پاپ‌آپ/بنر اطلاعیه‌ای نمی‌گیرن */
export function isAnnouncementFreePath(path: string): boolean {
  return path === "/admin" || path.startsWith("/admin/") || path === "/auth" || path.startsWith("/auth/");
}

/** pages خالی = همه‌جا؛ «/» فقط خود صفحه‌ی اصلی؛ بقیه پیشوند کامل یک بخش */
export function pathMatches(pages: string[], path: string): boolean {
  if (!pages.length) return true;
  const p = path.length > 1 ? path.replace(/\/+$/, "").toLowerCase() : path;
  return pages.some((pre) => (pre === "/" ? p === "/" : p === pre || p.startsWith(`${pre}/`)));
}

type SelectableRow = {
  id: string; active: boolean; startsAt: Date | string | null; expiresAt: Date | string | null;
  audience: AnnouncementAudience; showInList: boolean; display: AnnouncementDisplay;
  pages: string[]; priority: number; createdAt: Date | string;
};

const ms = (d: Date | string) => (typeof d === "string" ? new Date(d).getTime() : d.getTime());

export function isAnnouncementLive(r: Pick<SelectableRow, "active" | "startsAt" | "expiresAt">, now: Date): boolean {
  return announcementStatus(r, now) === "live";
}

export type AnnouncementStatus = "disabled" | "scheduled" | "live" | "ended";
export function announcementStatus(r: Pick<SelectableRow, "active" | "startsAt" | "expiresAt">, now: Date): AnnouncementStatus {
  if (!r.active) return "disabled";
  if (r.expiresAt && ms(r.expiresAt) <= now.getTime()) return "ended";
  if (r.startsAt && ms(r.startsAt) > now.getTime()) return "scheduled";
  return "live";
}

const byPriority = (a: SelectableRow, b: SelectableRow) => b.priority - a.priority || ms(b.createdAt) - ms(a.createdAt);

/**
 * اطلاعیه‌های قابل‌نمایش برای یک بیننده. mode «list» = لیست زنگوله (جدیدترین
 * اول)، «display» = پاپ‌آپ/بنر (اولویت بالاتر اول، بسته‌شده‌ها حذف). path
 * اختیاریه: بدونش فیلتر صفحه انجام نمی‌شه (کلاینت با همین تابع روی هر
 * ناوبری فیلتر می‌کنه، بدون درخواست دوباره).
 */
export function selectAnnouncements<T extends SelectableRow>(
  rows: T[],
  opts: { mode: "list" | "display"; now: Date; viewer: AnnouncementViewer; dismissed?: Iterable<string>; path?: string },
): T[] {
  const allowed = new Set(audiencesFor(opts.viewer));
  const dismissed = new Set(opts.dismissed ?? []);
  const out = rows.filter((r) => {
    if (!isAnnouncementLive(r, opts.now) || !allowed.has(r.audience)) return false;
    if (opts.mode === "list") return r.showInList;
    if (r.display === "NONE" || dismissed.has(r.id)) return false;
    if (opts.path !== undefined && (isAnnouncementFreePath(opts.path) || !pathMatches(r.pages, opts.path))) return false;
    return true;
  });
  return opts.mode === "list" ? out.sort((a, b) => ms(b.createdAt) - ms(a.createdAt)) : out.sort(byPriority);
}

/**
 * از اطلاعیه‌های نمایشی (مرتب با اولویت) پاپ‌آپ بعدی و بنر هر جایگاه:
 * حداکثر یک پاپ‌آپ در لحظه و یک بنر در هر جایگاه. skip = بسته‌شده در همین بازدید.
 */
export function pickPlacements<T extends { id: string; display: AnnouncementDisplay; position: AnnouncementPosition }>(
  items: T[],
  skip: Iterable<string> = [],
): { popup: T | null; banners: Partial<Record<AnnouncementPosition, T>> } {
  const skipped = new Set(skip);
  let popup: T | null = null;
  const banners: Partial<Record<AnnouncementPosition, T>> = {};
  for (const it of items) {
    if (skipped.has(it.id)) continue;
    if (it.display === "POPUP") {
      if (!popup) popup = it;
    } else if (it.display === "BANNER" && !banners[it.position]) {
      banners[it.position] = it;
    }
  }
  return { popup, banners };
}

function parseDate(v: unknown, label: string): { ok: true; v: Date | null } | { ok: false; error: string } {
  if (v === null || v === "") return { ok: true, v: null };
  if (typeof v !== "string") return { ok: false, error: tr(`${label} معتبر نیست`, `${label} is not valid`) };
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return { ok: false, error: tr(`${label} معتبر نیست`, `${label} is not valid`) };
  return { ok: true, v: d };
}

function pickEnum<T extends string>(v: unknown, list: readonly T[]): T | undefined {
  return typeof v === "string" && (list as readonly string[]).includes(v) ? (v as T) : undefined;
}

/**
 * اعتبارسنجی ورودی ساخت/ویرایش. در حالت partial (PATCH) فیلد نفرستاده
 * دست نمی‌خوره. expiresAt/startsAt: null/"" یعنی بدون محدودیت.
 */
export function parseAnnouncementInput(
  raw: unknown,
  partial: boolean,
): { ok: true; data: Partial<AnnouncementInput> } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") return { ok: false, error: tr("درخواست نامعتبر است", "Invalid request") };
  const b = raw as Record<string, unknown>;
  const data: Partial<AnnouncementInput> = {};

  if (!partial || b.title !== undefined) {
    const t = typeof b.title === "string" ? b.title.trim() : "";
    if (!t) return { ok: false, error: tr("عنوان لازمه", "A title is required") };
    if (t.length > ANNOUNCEMENT_TITLE_MAX) return { ok: false, error: tr(`عنوان حداکثر ${ANNOUNCEMENT_TITLE_MAX} کاراکتر`, `The title can be at most ${ANNOUNCEMENT_TITLE_MAX} characters`) };
    data.title = t;
  }
  if (!partial || b.body !== undefined) {
    const t = typeof b.body === "string" ? b.body.trim() : "";
    if (!t) return { ok: false, error: tr("متن اطلاعیه لازمه", "The announcement text is required") };
    if (t.length > ANNOUNCEMENT_BODY_MAX) return { ok: false, error: tr(`متن حداکثر ${ANNOUNCEMENT_BODY_MAX} کاراکتر`, `The text can be at most ${ANNOUNCEMENT_BODY_MAX} characters`) };
    data.body = t;
  }
  if (b.active !== undefined) {
    if (typeof b.active !== "boolean") return { ok: false, error: tr("وضعیت نامعتبر است", "Invalid status") };
    data.active = b.active;
  } else if (!partial) {
    data.active = true;
  }
  if (b.expiresAt !== undefined) {
    const r = parseDate(b.expiresAt, tr("تاریخ انقضا", "Expiry date"));
    if (!r.ok) return r;
    if (r.v && r.v.getTime() <= Date.now()) return { ok: false, error: tr("تاریخ انقضا باید در آینده باشد", "The expiry date must be in the future") };
    data.expiresAt = r.v;
  } else if (!partial) {
    data.expiresAt = null;
  }
  if (b.startsAt !== undefined) {
    const r = parseDate(b.startsAt, tr("زمان شروع", "Start time"));
    if (!r.ok) return r;
    data.startsAt = r.v;
  } else if (!partial) {
    data.startsAt = null;
  }

  for (const key of ["showInList", "dismissible"] as const) {
    if (b[key] !== undefined) {
      if (typeof b[key] !== "boolean") return { ok: false, error: tr("مقدار نامعتبر است", "Invalid value") };
      data[key] = b[key] as boolean;
    } else if (!partial) {
      data[key] = true;
    }
  }

  const enums = [
    ["display", ANNOUNCEMENT_DISPLAYS, "NONE", tr("نوع نمایش", "Display type")],
    ["position", ANNOUNCEMENT_POSITIONS, "TOP", tr("جایگاه", "Position")],
    ["audience", ANNOUNCEMENT_AUDIENCES, "ALL", tr("مخاطب", "Audience")],
    ["tone", ANNOUNCEMENT_TONES, "INFO", tr("حالت رنگ", "Color tone")],
    ["frequency", ANNOUNCEMENT_FREQUENCIES, "UNTIL_DISMISSED", tr("تکرار", "Repeat")],
  ] as const;
  for (const [key, list, def, label] of enums) {
    if (b[key] !== undefined) {
      const v = pickEnum(b[key], list as readonly string[]);
      if (!v) return { ok: false, error: tr(`${label} نامعتبر است`, `${label} is invalid`) };
      (data as Record<string, unknown>)[key] = v;
    } else if (!partial) {
      (data as Record<string, unknown>)[key] = def;
    }
  }

  if (b.pages !== undefined) {
    if (!Array.isArray(b.pages)) return { ok: false, error: tr("صفحه‌ها نامعتبر است", "Invalid pages") };
    if (b.pages.length > ANNOUNCEMENT_PAGES_MAX) return { ok: false, error: tr(`حداکثر ${ANNOUNCEMENT_PAGES_MAX} صفحه`, `At most ${ANNOUNCEMENT_PAGES_MAX} pages`) };
    const pages: string[] = [];
    for (const raw of b.pages) {
      const p = typeof raw === "string" ? normalizePagePrefix(raw) : null;
      if (!p) return { ok: false, error: tr("آدرس صفحه نامعتبر است (مثلا /dashboard)", "Invalid page address (e.g. /dashboard)") };
      if (!pages.includes(p)) pages.push(p);
    }
    data.pages = pages;
  } else if (!partial) {
    data.pages = [];
  }

  if (b.priority !== undefined) {
    const n = b.priority;
    if (typeof n !== "number" || !Number.isInteger(n) || n < ANNOUNCEMENT_PRIORITY_MIN || n > ANNOUNCEMENT_PRIORITY_MAX) {
      return { ok: false, error: tr(`اولویت باید عدد صحیح بین ${ANNOUNCEMENT_PRIORITY_MIN} و ${ANNOUNCEMENT_PRIORITY_MAX} باشد`, `Priority must be a whole number between ${ANNOUNCEMENT_PRIORITY_MIN} and ${ANNOUNCEMENT_PRIORITY_MAX}`) };
    }
    data.priority = n;
  } else if (!partial) {
    data.priority = 0;
  }

  if (b.ctaLabel !== undefined) {
    if (b.ctaLabel === null || b.ctaLabel === "") data.ctaLabel = null;
    else if (typeof b.ctaLabel !== "string") return { ok: false, error: tr("متن دکمه نامعتبر است", "Invalid button text") };
    else {
      const t = b.ctaLabel.trim();
      if (t.length > ANNOUNCEMENT_CTA_LABEL_MAX) return { ok: false, error: tr(`متن دکمه حداکثر ${ANNOUNCEMENT_CTA_LABEL_MAX} کاراکتر`, `The button text can be at most ${ANNOUNCEMENT_CTA_LABEL_MAX} characters`) };
      data.ctaLabel = t || null;
    }
  } else if (!partial) {
    data.ctaLabel = null;
  }
  for (const [key, label] of [["ctaUrl", tr("لینک دکمه", "Button link")], ["imageUrl", tr("آدرس تصویر", "Image address")]] as const) {
    const v = b[key];
    if (v !== undefined) {
      if (v === null || v === "") data[key] = null;
      else if (typeof v !== "string" || !isSafeAnnouncementUrl(v.trim())) {
        return { ok: false, error: tr(`${label} باید مسیر داخلی (/...) یا https:// باشد`, `${label} must be an internal path (/...) or https://`) };
      } else data[key] = v.trim();
    } else if (!partial) {
      data[key] = null;
    }
  }
  return { ok: true, data };
}

/**
 * قوانین ترکیبی روی مقدار نهایی (بعد از ادغام PATCH با ردیف موجود):
 * حداقل یک مقصد، شروع قبل از پایان، دکمه یا کامل یا خالی.
 */
export function validateAnnouncementMerged(m: {
  showInList: boolean; display: AnnouncementDisplay; startsAt: Date | null; expiresAt: Date | null;
  ctaLabel: string | null; ctaUrl: string | null;
}): string | null {
  if (!m.showInList && m.display === "NONE") return tr("حداقل یکی از لیست اعلان‌ها، پاپ‌آپ یا بنر را انتخاب کنید", "Choose at least one of the notification list, popup or banner");
  if (m.startsAt && m.expiresAt && m.startsAt.getTime() >= m.expiresAt.getTime()) return tr("زمان شروع باید قبل از پایان باشد", "The start time must be before the end time");
  if (!!m.ctaLabel !== !!m.ctaUrl) return tr("برای دکمه هم متن و هم لینک لازمه", "A button needs both text and a link");
  return null;
}
