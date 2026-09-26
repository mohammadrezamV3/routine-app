// تنظیماتِ کلید/مقدار — آینه‌ی محلیِ app/api/settings/[key]/route.ts روی
// arion-mobile.settings. همون allowlist (isUserSettingKey) و همون سقفِ حجم
// (MAX_SETTING_VALUE_BYTES) — اپ نباید چیزی رو محلی قبول کنه که سرور موقعِ
// push رد می‌کنه. نوشتن dirty=1 می‌ذاره ← هوکِ onLocalWrite سینکِ debounced
// رو راه می‌ندازه (SyncProvider).
import { db, nowIso } from "@m/db/db";
import { readJsonBody } from "@/lib/validate";
import { isUserSettingKey, MAX_SETTING_VALUE_BYTES } from "@/lib/userSettingKeys";
import { json } from "../respond";
import type { LocalCtx } from "../types";

const rejectUnknownKey = () => json({ error: "کلید تنظیمات نامعتبر است" }, 400);

// GET /api/settings/:key → { value, updatedAt }
export async function getSettingHandler({ params }: LocalCtx): Promise<Response> {
  const key = params.key;
  if (!isUserSettingKey(key)) return rejectUnknownKey();
  const row = await db.settings.get(key);
  // حذف‌شده (value=null روی سرور) همون «مقدارِ null» ِ وبه
  const value = row && !row.deletedAt ? (row.value ?? null) : null;
  return json({ value, updatedAt: row?.updatedAt ?? null });
}

// POST /api/settings/:key  { value }
export async function postSettingHandler({ req, params }: LocalCtx): Promise<Response> {
  const key = params.key;
  if (!isUserSettingKey(key)) return rejectUnknownKey();
  const parsed = await readJsonBody<{ value?: unknown }>(req, MAX_SETTING_VALUE_BYTES);
  if (!parsed.ok) return json({ error: parsed.error }, parsed.status);
  const value = parsed.body?.value ?? null;
  if (new TextEncoder().encode(JSON.stringify(value ?? null)).length > MAX_SETTING_VALUE_BYTES) {
    return json({ error: "حجم مقدار بیش از حد مجاز است" }, 413);
  }
  const now = nowIso();
  await db.settings.put({
    key,
    value,
    updatedAt: now,
    // null ← tombstone (قراردادِ سینک: setting با value=null = حذف)
    deletedAt: value === null ? now : null,
    dirty: 1,
  });
  return json({ ok: true });
}
