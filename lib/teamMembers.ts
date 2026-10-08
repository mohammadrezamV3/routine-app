// اعضای تیم Arion Group — منطق خالص (بدون import سروری) تا هم API و هم
// کلاینت ازش استفاده کنن. ذخیره در AppSetting با کلید team_members به‌صورت
// آرایه‌ی مرتب (ترتیب آرایه = ترتیب نمایش در صفحه‌ی درباره).

export const TEAM_KEY = "team_members";
export const TEAM_MAX_MEMBERS = 30;
export const TEAM_NAME_MAX = 60;
export const TEAM_ROLE_MAX = 80;
export const TEAM_ROLES_MAX = 6;
export const TEAM_BIO_MAX = 240;
export const TEAM_PHOTO_MAX_LENGTH = 120_000;

export const TEAM_LINK_KINDS = ["telegram", "instagram", "linkedin", "website"] as const;
export type TeamLinkKind = (typeof TEAM_LINK_KINDS)[number];
export type TeamLinks = Partial<Record<TeamLinkKind, string>>;

export type TeamMember = {
  id: string;
  name: string;
  // یک نفر می‌تونه چند عنوان داشته باشه؛ ردیف‌های قدیمی با فیلد تکی role
  // موقع خواندن به roles تبدیل می‌شن
  roles: string[];
  bio: string;
  photo: string | null;
  links: TeamLinks;
};

const PHOTO_RE = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;
const ID_RE = /^[a-z0-9-]{6,40}$/;
const HANDLE_RE = /^[A-Za-z0-9._]{2,64}$/;

function str(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

function httpsUrl(raw: string): string | null {
  let t = raw.trim();
  if (!t || t.length > 300 || /\s/.test(t)) return null;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(t)) t = `https://${t}`;
  try {
    const u = new URL(t);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    if (!u.hostname.includes(".")) return null;
    return u.toString();
  } catch {
    return null;
  }
}

// تلگرام/اینستاگرام: هم هندل (@name) هم لینک کامل پذیرفته می‌شه
export function normalizeTeamLink(kind: TeamLinkKind, raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const t = raw.trim();
  if (!t) return null;
  if (kind === "telegram" || kind === "instagram") {
    const h = t.replace(/^@/, "");
    if (HANDLE_RE.test(h)) return kind === "telegram" ? `https://t.me/${h}` : `https://instagram.com/${h}`;
  }
  return httpsUrl(t);
}

// عنوان‌ها: هم roles (آرایه) هم role قدیمی (رشته) پذیرفته می‌شه. خالی‌ها و
// تکراری‌ها (بدون حساسیت به حروف) حذف می‌شن و ترتیب حفظ می‌شه. خطا با
// فیلد error برمی‌گرده تا ذخیره‌ی ادمین رد بشه، ولی هیچ‌وقت داده‌ی قدیمی گم نمی‌شه.
export function normalizeTeamRoles(o: { roles?: unknown; role?: unknown }): { roles: string[]; error?: string } {
  const raw: unknown[] = Array.isArray(o.roles) ? o.roles : [];
  if (typeof o.role === "string" && o.role.trim()) raw.push(o.role);
  const roles: string[] = [];
  const seen = new Set<string>();
  for (const r of raw) {
    if (typeof r !== "string") continue;
    const t = r.replace(/\s+/g, " ").trim();
    if (!t) continue;
    if (t.length > TEAM_ROLE_MAX) return { roles, error: "role-too-long" };
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    roles.push(t);
  }
  if (roles.length > TEAM_ROLES_MAX) return { roles: roles.slice(0, TEAM_ROLES_MAX), error: "too-many-roles" };
  return { roles };
}

export type TeamValidation = { ok: true; members: TeamMember[] } | { ok: false; error: string };

function newId(): string {
  return `m-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

// اعتبارسنجی سخت‌گیر برای ذخیره‌ی ادمین (خطا می‌ده)
export function validateTeamMembers(input: unknown): TeamValidation {
  if (!Array.isArray(input)) return { ok: false, error: "ورودی نامعتبر است" };
  if (input.length > TEAM_MAX_MEMBERS) return { ok: false, error: `حداکثر ${TEAM_MAX_MEMBERS} عضو مجاز است` };
  const seen = new Set<string>();
  const members: TeamMember[] = [];
  for (let i = 0; i < input.length; i++) {
    const m = input[i];
    if (!m || typeof m !== "object") return { ok: false, error: "ورودی نامعتبر است" };
    const o = m as Record<string, unknown>;
    const n = i + 1;
    const name = str(o.name, TEAM_NAME_MAX + 1);
    if (!name) return { ok: false, error: `نام عضو ${n} را وارد کن` };
    if (name.length > TEAM_NAME_MAX) return { ok: false, error: `نام عضو ${n} بیشتر از ${TEAM_NAME_MAX} حرف است` };
    const rr = normalizeTeamRoles(o);
    if (rr.error === "role-too-long") return { ok: false, error: `عنوان عضو ${n} بیشتر از ${TEAM_ROLE_MAX} حرف است` };
    if (rr.error === "too-many-roles") return { ok: false, error: `هر عضو حداکثر ${TEAM_ROLES_MAX} عنوان می‌تونه داشته باشه` };
    const roles = rr.roles;
    const bio = str(o.bio, TEAM_BIO_MAX + 1);
    if (bio.length > TEAM_BIO_MAX) return { ok: false, error: `توضیح عضو ${n} بیشتر از ${TEAM_BIO_MAX} حرف است` };

    let photo: string | null = null;
    if (o.photo != null && o.photo !== "") {
      if (typeof o.photo !== "string" || !PHOTO_RE.test(o.photo)) return { ok: false, error: `عکس عضو ${n} معتبر نیست` };
      if (o.photo.length > TEAM_PHOTO_MAX_LENGTH) return { ok: false, error: `حجم عکس عضو ${n} زیاد است` };
      photo = o.photo;
    }

    const links: TeamLinks = {};
    const rawLinks = o.links && typeof o.links === "object" ? (o.links as Record<string, unknown>) : {};
    for (const kind of TEAM_LINK_KINDS) {
      const raw = rawLinks[kind];
      if (typeof raw !== "string" || !raw.trim()) continue;
      const url = normalizeTeamLink(kind, raw);
      if (!url) return { ok: false, error: `لینک ${kind} عضو ${n} معتبر نیست` };
      links[kind] = url;
    }

    let id = typeof o.id === "string" && ID_RE.test(o.id) ? o.id : newId();
    while (seen.has(id)) id = newId();
    seen.add(id);
    members.push({ id, name, roles, bio, photo, links });
  }
  return { ok: true, members };
}

// خواندن مقدار ذخیره‌شده برای نمایش عمومی: هر ردیف خراب بی‌صدا حذف می‌شه
export function sanitizeTeamMembers(raw: unknown): TeamMember[] {
  if (!Array.isArray(raw)) return [];
  const out: TeamMember[] = [];
  for (const item of raw.slice(0, TEAM_MAX_MEMBERS)) {
    // ردیف قدیمی/دستی با عنوان بلند یا زیاد: به‌جای حذف کل عضو، عنوان‌ها کوتاه می‌شن
    let row = item;
    if (item && typeof item === "object") {
      const o = item as Record<string, unknown>;
      const list: unknown[] = [...(Array.isArray(o.roles) ? o.roles : []), ...(typeof o.role === "string" ? [o.role] : [])];
      const fixed = normalizeTeamRoles({ roles: list.map((r) => (typeof r === "string" ? r.slice(0, TEAM_ROLE_MAX) : r)).slice(0, TEAM_ROLES_MAX * 2) });
      row = { ...o, role: undefined, roles: fixed.roles };
    }
    const v = validateTeamMembers([row]);
    if (v.ok) out.push(v.members[0]);
  }
  return out;
}
