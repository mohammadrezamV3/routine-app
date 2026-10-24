import type { ExportFormat, ExportTarget } from "./modules";
import { tr } from "@/lib/i18n";

// دانلود سمت کلاینت: fetch (کوکی نشست همراهه) → blob → کلیک روی لینک موقت.
// خطای سرور (JSON با error) به پیام قابل‌نمایش تبدیل می‌شه.

export type ExportRequest = {
  module: ExportTarget;
  format: ExportFormat;
  from?: string;
  to?: string;
  accountId?: string;
};

export function exportUrl(r: ExportRequest): string {
  const sp = new URLSearchParams({ module: r.module, format: r.format });
  if (r.from) sp.set("from", r.from);
  if (r.to) sp.set("to", r.to);
  if (r.accountId) sp.set("accountId", r.accountId);
  return `/api/export?${sp.toString()}`;
}

function fileNameFrom(res: Response, fallback: string): string {
  const m = /filename="([^"]+)"/.exec(res.headers.get("Content-Disposition") || "");
  return m ? m[1] : fallback;
}

/** خطا → پیام متنی؛ موفق → null */
export async function downloadExport(r: ExportRequest): Promise<string | null> {
  try {
    const res = await fetch(exportUrl(r), { credentials: "same-origin" });
    if (!res.ok) {
      const j = await res.json().catch(() => null);
      return (j && typeof j.error === "string" && j.error) || tr("گرفتن خروجی ناموفق بود", "The export failed");
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileNameFrom(res, `arion-${r.module}.${r.format}`);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    return null;
  } catch {
    return tr("اتصال برقرار نشد", "Could not connect");
  }
}
