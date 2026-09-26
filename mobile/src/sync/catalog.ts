// کاتالوگِ مرجعِ آفلاین (غذاها، حرکات، فهرستِ عکس‌ها) از GET /api/mobile/catalog
// با ETag/If-None-Match، ذخیره در Dexieِ جدا (arion-catalog). صفحه‌های ورزش/کالری
// اگه کاتالوگِ دانلودشده باشه از اون استفاده می‌کنن، وگرنه از seedِ داخلِ باندل.
// عکسِ حرکات تنبل (فقط وقتی کارتِ حرکت باز می‌شه) از /catalog/media و کش می‌شه.
import Dexie, { type Table } from "dexie";
import { useEffect, useState } from "react";
import type { CatalogExercise, CatalogFood, MobileCatalogMediaResponse, MobileCatalogResponse } from "@m/lib/api-contract";
import { useLiveQuery } from "dexie-react-hooks";
import { ApiClient } from "./apiClient";

type CatalogRow = {
  key: "catalog";
  version: string;
  etag: string | null;
  foods: CatalogFood[];
  exercises: CatalogExercise[];
  exerciseMedia: { key: string; updatedAt: string }[] | null;
  checkedAt: string;
};

type MediaRow = { key: string; dataUrl: string; updatedAt: string; etag: string | null };

class CatalogDb extends Dexie {
  meta!: Table<CatalogRow, string>;
  media!: Table<MediaRow, string>;
  constructor() {
    super("arion-catalog");
    this.version(1).stores({ meta: "key", media: "key" });
  }
}

export const catalogDb = new CatalogDb();

/** حداقل فاصله‌ی دو بررسیِ کاتالوگ */
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

/** کلیدِ نرمال‌شده‌ی عکس — آینه‌ی mediaKey/normalizeFa ِ سرور (lib/exerciseMedia.ts) */
export function mediaKey(name: string): string {
  return name
    .replace(/[يی]/g, "ی")
    .replace(/[كک]/g, "ک")
    .replace(/[‌​]/g, " ")
    .trim()
    .toLowerCase();
}

/** دانلود/به‌روزرسانیِ کاتالوگ (اگه از آخرین بررسی گذشته باشه یا force). خطا throw نمی‌کنه. */
export async function refreshCatalog(api: ApiClient, opts: { force?: boolean } = {}): Promise<"updated" | "unchanged" | "skipped" | "failed"> {
  try {
    const cur = await catalogDb.meta.get("catalog");
    if (!opts.force && cur && Date.now() - Date.parse(cur.checkedAt) < CHECK_INTERVAL_MS) return "skipped";
    const res = await api.authedRaw("GET", "/api/mobile/catalog", undefined, {
      headers: cur?.etag ? { "If-None-Match": cur.etag } : {},
    });
    const checkedAt = new Date().toISOString();
    if (res.status === 304 && cur) {
      await catalogDb.meta.update("catalog", { checkedAt });
      return "unchanged";
    }
    if (!res.ok) return "failed";
    const body = (await ApiClient.readJson(res)) as MobileCatalogResponse | null;
    if (!body || !Array.isArray(body.foods) || !Array.isArray(body.exercises)) return "failed";
    await catalogDb.meta.put({
      key: "catalog",
      version: body.version,
      etag: res.headers.get("ETag"),
      foods: body.foods,
      exercises: body.exercises,
      exerciseMedia: body.exerciseMedia,
      checkedAt,
    });
    return "updated";
  } catch {
    return "failed";
  }
}

export async function getCatalogFoods(): Promise<CatalogFood[] | null> {
  try {
    const row = await catalogDb.meta.get("catalog");
    return row?.foods?.length ? row.foods : null;
  } catch {
    return null;
  }
}

/** حرکاتِ کاتالوگِ دانلودشده، یا fallback (seedِ باندل) تا وقتی دانلود نشده */
export function useCatalogExercises<T>(fallback: T[]): T[] {
  const rows = useLiveQuery(() => catalogDb.meta.get("catalog"), []);
  return rows?.exercises?.length ? (rows.exercises as unknown as T[]) : fallback;
}

/** عکسِ یک حرکت: از کش، یا (آنلاین + واردشده) دانلود و کش. null = عکسی نیست. */
export async function getExerciseMedia(api: ApiClient | null, name: string): Promise<string | null> {
  const key = mediaKey(name);
  const meta = await catalogDb.meta.get("catalog");
  const listed = meta?.exerciseMedia?.find((m) => m.key === key);
  const cached = await catalogDb.media.get(key);
  if (cached && (!listed || cached.updatedAt === listed.updatedAt)) return cached.dataUrl;
  if (!listed || !api || !api.tokens.isLoggedIn()) return cached?.dataUrl ?? null;
  try {
    const res = await api.authedRaw("GET", `/api/mobile/catalog/media?key=${encodeURIComponent(key)}`, undefined, {
      headers: cached?.etag ? { "If-None-Match": cached.etag } : {},
    });
    if (res.status === 304 && cached) {
      await catalogDb.media.update(key, { updatedAt: listed.updatedAt });
      return cached.dataUrl;
    }
    if (!res.ok) return cached?.dataUrl ?? null;
    const body = (await ApiClient.readJson(res)) as MobileCatalogMediaResponse | null;
    if (!body?.dataUrl || !/^data:image\/(jpeg|png|webp);/.test(body.dataUrl)) return null;
    await catalogDb.media.put({ key, dataUrl: body.dataUrl, updatedAt: body.updatedAt, etag: res.headers.get("ETag") });
    return body.dataUrl;
  } catch {
    return cached?.dataUrl ?? null;
  }
}

/** هوکِ عکسِ حرکت — undefined = در حالِ بارگذاری، null = عکسی نیست */
export function useExerciseMedia(api: ApiClient | null, name: string, enabled: boolean): string | null | undefined {
  const [url, setUrl] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setUrl(undefined);
    void getExerciseMedia(api, name).then((u) => {
      if (!cancelled) setUrl(u);
    });
    return () => {
      cancelled = true;
    };
  }, [api, name, enabled]);
  return url;
}
