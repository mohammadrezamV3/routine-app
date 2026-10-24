import { parseIsoDate } from "@/lib/validate";
import { tr } from "@/lib/i18n";
import { isExportModule, type ExportFormat, type ExportTarget } from "./modules";

export type ExportParams = {
  target: ExportTarget;
  format: ExportFormat;
  from: Date | null;
  /** روز پایان *شامل* خودش (نیمه‌شب UTC همان روز) */
  to: Date | null;
  accountId: string | null;
};

/** بیشترین طول شناسه‌ی حساب که می‌پذیریم (cuid حدود 25 نویسه‌ست) */
const MAX_ID = 64;

export function parseExportParams(sp: URLSearchParams): { ok: true; value: ExportParams } | { ok: false; error: string } {
  const m = sp.get("module");
  const target = m === "all" ? "all" : isExportModule(m) ? m : null;
  if (!target) return { ok: false, error: tr("ماژول نامعتبر است", "Invalid module") };
  const f = sp.get("format") ?? (target === "all" ? "json" : "csv");
  if (f !== "csv" && f !== "json") return { ok: false, error: tr("قالب نامعتبر است", "Invalid format") };
  if (target === "all" && f !== "json") return { ok: false, error: tr("خروجی همه‌ی داده‌ها فقط JSON است", "The full export is JSON only") };

  const fromRaw = sp.get("from"), toRaw = sp.get("to");
  const from = fromRaw ? parseIsoDate(fromRaw) : null;
  const to = toRaw ? parseIsoDate(toRaw) : null;
  if ((fromRaw && !from) || (toRaw && !to)) return { ok: false, error: tr("تاریخ نامعتبر است (قالب درست: YYYY-MM-DD)", "Invalid date (correct format: YYYY-MM-DD)") };
  if (from && to && from > to) return { ok: false, error: tr("شروع بازه بعد از پایان آن است", "The range starts after it ends") };

  const acc = sp.get("accountId");
  if (acc && (acc.length > MAX_ID || !/^[A-Za-z0-9_-]+$/.test(acc))) return { ok: false, error: tr("حساب نامعتبر است", "Invalid account") };
  return { ok: true, value: { target, format: f, from, to, accountId: acc || null } };
}

/** where برای ستون @db.Date */
export function dateWhere(p: Pick<ExportParams, "from" | "to">): { gte?: Date; lte?: Date } | undefined {
  if (!p.from && !p.to) return undefined;
  return { ...(p.from ? { gte: p.from } : {}), ...(p.to ? { lte: p.to } : {}) };
}

/** where برای ستون DateTime (روز پایان شامل خودش) */
export function dateTimeWhere(p: Pick<ExportParams, "from" | "to">): { gte?: Date; lt?: Date } | undefined {
  if (!p.from && !p.to) return undefined;
  return { ...(p.from ? { gte: p.from } : {}), ...(p.to ? { lt: new Date(p.to.getTime() + 86_400_000) } : {}) };
}
