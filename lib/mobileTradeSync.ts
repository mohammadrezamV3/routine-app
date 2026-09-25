// منطقِ خالصِ همگام‌سازیِ ماژولِ ترید برای اپ موبایل (بدونِ دیتابیس) —
// تست‌پذیر در __tests__/mobileTradeSync.test.ts. بخشِ دیتابیسی در
// lib/mobileTradeSyncStore.ts، قرارداد در lib/mobileTradeContract.ts.
//
// قاعده‌ی تعارض همون LWWِ lib/mobileSync.ts ـه (effectiveEditedAt/decideLww
// از همون‌جا reuse می‌شن)، با سه نکته‌ی مخصوصِ ترید:
//
//  ۱) حذف‌ها tombstone دارن (جدولِ TradeSyncTombstone که trigger پرش می‌کنه)
//     چون روت‌های وب hard-delete می‌کنن. upsertی که بعد از حذف برسه با
//     `deletedAt`ِ tombstone مقایسه می‌شه (decideAgainstTombstone).
//  ۲) چک‌لیست با آیتم‌هاش یک رکوردِ واحده؛ تیک‌زدنِ یک آیتم از وب فقط
//     updatedAtِ همون آیتم رو جلو می‌بره، پس زمانِ ویرایشِ مؤثرِ چک‌لیست
//     بیشینه‌ی این دوئه (checklistEditedAt).
//  ۳) هیچ مقدارِ مشتق‌شده‌ای از کلاینت قبول نمی‌شه: جلسه‌ی معاملاتی
//     (sessionsAt با DSTِ واقعی) و R (computeR) سمتِ سرور حساب می‌شن — همون
//     parseTradeInputِ روتِ وب — و اسنپ‌شاتِ چک‌لیست فقط موقعِ ساختِ معامله
//     و از روی چک‌لیستِ ذخیره‌شده ساخته می‌شه.

import type { Prisma } from "@prisma/client";
import {
  TRADE_ENTRY_BROKER_FIELDS,
  TRADE_SYNC_MAX_BATCH,
  TRADE_SYNC_SETTING_KEYS,
  type TradeAccountRecord,
  type TradeChecklistRecord,
  type TradeChecklistSnapshotItem,
  type TradeDeletableEntity,
  type TradeEntryBrokerField,
  type TradeEntryRecord,
  type TradeNoteRecord,
  type TradeSettingRecord,
  type TradeSyncEntity,
  type TradeSyncRejectCode,
  type TradeSyncSettingKey,
  type TradeTagRecord,
  type TradeTombstoneRecord,
} from "@/lib/mobileTradeContract";
import {
  clampClientTimestamp,
  effectiveEditedAt,
  isValidClientId,
  parseIsoDateTime,
  validateSettingValue,
  type SyncTimestamps,
} from "@/lib/mobileSync";
import { isUserSettingKey } from "@/lib/userSettingKeys";
import { clampText } from "@/lib/validate";
import { isHexColor, parseAccountInput, parseTradeInput } from "@/lib/tradeServer";
import { computeR } from "@/lib/tradeSymbols";
import { MAX_CHECKLIST_ITEMS, MIN_CHECKLIST_ITEMS } from "@/lib/tradeTypes";

export { TRADE_SYNC_MAX_BATCH };

const MAX_TAG_IDS = 20; // هم‌سقفِ parseTradeInput
const MAX_CHECKLIST_STATE_KEYS = 100;
const MAX_ORDER = 10_000;

type V<T> = { ok: true; value: T } | { ok: false; error: string; code?: TradeSyncRejectCode };

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

const SETTING_KEY_SET = new Set<string>(TRADE_SYNC_SETTING_KEYS);

export function isTradeSyncSettingKey(key: unknown): key is TradeSyncSettingKey {
  // هم در لیستِ ترید، هم در allowlistِ عمومیِ /api/settings (نه کلیدِ سرور-مدیریت)
  return typeof key === "string" && SETTING_KEY_SET.has(key) && isUserSettingKey(key);
}

// ─── LWW ─────────────────────────────────────────────────────────────────

/**
 * زمانِ ویرایشِ مؤثرِ چک‌لیست با آیتم‌هاش. نوشتنِ موبایل updatedAtِ آیتم‌ها
 * رو برابرِ updatedAtِ خودِ چک‌لیست می‌ذاره، پس فقط آیتمی که *بعد* از آخرین
 * نوشتنِ چک‌لیست عوض شده (تیکِ وب — /api/trade/checklists/[id]/items)
 * زمانِ مؤثر رو جلو می‌بره.
 */
export function checklistEditedAt(row: SyncTimestamps & { items: { updatedAt: Date }[] }): Date {
  let t = effectiveEditedAt(row).getTime();
  const own = row.updatedAt.getTime();
  for (const i of row.items) {
    const it = i.updatedAt.getTime();
    if (it > own && it > t) t = it;
  }
  return new Date(t);
}

/** upsert/delete روی شناسه‌ای که قبلا حذف شده: فقط اگه بعد از حذف ویرایش شده باشه برنده‌ست */
export function decideAgainstTombstone(tombstone: { deletedAt: Date } | null, clientAt: Date): "apply" | "stale" {
  if (!tombstone) return "apply";
  return clientAt.getTime() > tombstone.deletedAt.getTime() ? "apply" : "stale";
}

/** archivedAt سمتِ سرور: لحظه‌ی آرشیو حفظ می‌شه، برگشت از آرشیو پاکش می‌کنه */
export function nextArchivedAt(existing: { archived: boolean; archivedAt: Date | null } | null, archived: boolean, clientAt: Date): Date | null {
  if (!archived) return null;
  if (existing?.archived) return existing.archivedAt ?? clientAt;
  return clientAt;
}

// ─── اعتبارسنجیِ داده‌ی هر موجودیت ────────────────────────────────────────

function parseTagIds(v: unknown): V<string[]> {
  if (v === undefined || v === null) return { ok: true, value: [] };
  if (!Array.isArray(v) || v.length > MAX_TAG_IDS || !v.every((t) => typeof t === "string" && t.length <= 64)) {
    return { ok: false, error: `برچسب‌ها باید آرایه‌ای از حداکثر ${MAX_TAG_IDS} شناسه باشند` };
  }
  return { ok: true, value: Array.from(new Set(v as string[])) };
}

function parseOrder(v: unknown): V<number | undefined> {
  if (v === undefined || v === null) return { ok: true, value: undefined };
  if (!Number.isInteger(v) || (v as number) < 0 || (v as number) > MAX_ORDER) return { ok: false, error: "ترتیب نامعتبر است" };
  return { ok: true, value: v as number };
}

function optBool(v: unknown, field: string): V<boolean | undefined> {
  if (v === undefined || v === null) return { ok: true, value: undefined };
  if (typeof v !== "boolean") return { ok: false, error: `${field} باید true/false باشد` };
  return { ok: true, value: v };
}

function optRefId(v: unknown, field: string): V<string | null> {
  if (v === undefined || v === null || v === "") return { ok: true, value: null };
  if (typeof v !== "string" || v.length > 64) return { ok: false, error: `${field} نامعتبر است` };
  return { ok: true, value: v };
}

export type ParsedAccountData = Exclude<ReturnType<typeof parseAccountInput>, string> & {
  archived: boolean;
  order: number | undefined;
  tagIds: string[];
};

export function validateAccountData(data: unknown): V<ParsedAccountData> {
  if (!isPlainObject(data)) return { ok: false, error: "داده‌ی حساب نامعتبر است" };
  // همون اعتبارسنجیِ روتِ وب (POST/PATCH /api/trade/accounts)
  const parsed = parseAccountInput(data);
  if (typeof parsed === "string") return { ok: false, error: parsed };
  const archived = optBool(data.archived, "archived");
  if (!archived.ok) return archived;
  const order = parseOrder(data.order);
  if (!order.ok) return order;
  const tagIds = parseTagIds(data.tagIds);
  if (!tagIds.ok) return tagIds;
  return { ok: true, value: { ...parsed, archived: archived.value ?? false, order: order.value, tagIds: tagIds.value } };
}

export type ParsedTagData = { name: string; color: string };

export function validateTagData(data: unknown): V<ParsedTagData> {
  if (!isPlainObject(data)) return { ok: false, error: "داده‌ی برچسب نامعتبر است" };
  const name = clampText(typeof data.name === "string" ? data.name.trim() : "", 30);
  if (!name) return { ok: false, error: "نام برچسب الزامی است" };
  return { ok: true, value: { name, color: isHexColor(data.color) ? (data.color as string) : "#3E7BFA" } };
}

export type ParsedChecklistData = {
  name: string;
  color: string;
  required: boolean;
  archived: boolean;
  order: number | undefined;
  note: string | null;
  items: { id: string; text: string; order: number; checked: boolean }[];
};

export function validateChecklistData(data: unknown): V<ParsedChecklistData> {
  if (!isPlainObject(data)) return { ok: false, error: "داده‌ی چک‌لیست نامعتبر است" };
  const name = clampText(typeof data.name === "string" ? data.name.trim() : "", 60);
  if (!name) return { ok: false, error: "نام چک‌لیست الزامی است" };
  const required = optBool(data.required, "required");
  if (!required.ok) return required;
  const archived = optBool(data.archived, "archived");
  if (!archived.ok) return archived;
  const order = parseOrder(data.order);
  if (!order.ok) return order;
  let note: string | null = null;
  if (data.note !== undefined && data.note !== null) {
    if (typeof data.note !== "string") return { ok: false, error: "یادداشتِ چک‌لیست نامعتبر است" };
    note = data.note.trim() ? clampText(data.note.trim(), 2000) : null;
  }
  if (!Array.isArray(data.items)) return { ok: false, error: "items باید آرایه باشد" };
  if (data.items.length < MIN_CHECKLIST_ITEMS || data.items.length > MAX_CHECKLIST_ITEMS) {
    return { ok: false, error: `چک‌لیست باید ${MIN_CHECKLIST_ITEMS} تا ${MAX_CHECKLIST_ITEMS} مورد داشته باشد` };
  }
  const seen = new Set<string>();
  const items: ParsedChecklistData["items"] = [];
  for (const [i, raw] of data.items.entries()) {
    if (!isPlainObject(raw) || !isValidClientId(raw.id) || seen.has(raw.id)) return { ok: false, error: "شناسه‌ی موردِ چک‌لیست نامعتبر است" };
    const text = typeof raw.text === "string" ? clampText(raw.text.trim(), 200) : "";
    if (!text) return { ok: false, error: "متنِ موردِ چک‌لیست خالی است" };
    const checked = optBool(raw.checked, "checked");
    if (!checked.ok) return checked;
    seen.add(raw.id);
    items.push({ id: raw.id, text, order: i, checked: checked.value ?? false });
  }
  return {
    ok: true,
    value: {
      name,
      color: isHexColor(data.color) ? (data.color as string) : "#3E7BFA",
      required: required.value ?? false,
      archived: archived.value ?? false,
      order: order.value,
      note,
      items,
    },
  };
}

export type ParsedNoteData = {
  title: string;
  content: string;
  color: string;
  pinned: boolean;
  accountId: string | null;
  entryId: string | null;
  tagIds: string[];
};

export function validateNoteData(data: unknown): V<ParsedNoteData> {
  if (!isPlainObject(data)) return { ok: false, error: "داده‌ی یادداشت نامعتبر است" };
  // همون قواعدِ parseNoteِ /api/trade/notes
  const title = typeof data.title === "string" ? data.title.trim() : "";
  if (!title) return { ok: false, error: "عنوان یادداشت الزامی است" };
  if (data.content !== undefined && data.content !== null && typeof data.content !== "string") {
    return { ok: false, error: "متنِ یادداشت نامعتبر است" };
  }
  const pinned = optBool(data.pinned, "pinned");
  if (!pinned.ok) return pinned;
  const accountId = optRefId(data.accountId, "accountId");
  if (!accountId.ok) return accountId;
  const entryId = optRefId(data.entryId, "entryId");
  if (!entryId.ok) return entryId;
  const tagIds = parseTagIds(data.tagIds);
  if (!tagIds.ok) return tagIds;
  return {
    ok: true,
    value: {
      title: clampText(title, 120),
      content: clampText(typeof data.content === "string" ? data.content : "", 20_000),
      color: isHexColor(data.color) ? (data.color as string) : "#3E7BFA",
      pinned: pinned.value ?? false,
      accountId: accountId.value,
      entryId: entryId.value,
      tagIds: tagIds.value,
    },
  };
}

// ─── معامله ──────────────────────────────────────────────────────────────

/** فیلدهای دستیِ کاربر — تنها چیزی که روی معامله‌ی متاتریدری از موبایل عوض می‌شه */
export const TRADE_ENTRY_MANUAL_FIELDS = [
  "timeframe",
  "riskFree",
  "riskAmount",
  "setup",
  "entryReasons",
  "exitReasons",
  "entryReasonNote",
  "exitReasonNote",
  "note",
  "emotionBefore",
  "emotionAfter",
  "confidence",
  "followedPlan",
] as const;

type BrokerSnapshot = {
  externalId: string | null;
  accountId: string;
  symbol: string;
  direction: string;
  volume: number;
  volumeUnit: string;
  openedAt: Date;
  closedAt: Date | null;
  status: string;
  result: string;
  pnl: number;
  entryPrice: number | null;
  exitPrice: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  commission: number | null;
  swap: number | null;
};

/**
 * فیلدهای بروکری که کلاینت با مقداری غیر از مقدارِ سرور فرستاده.
 * فیلدِ نفرستاده (undefined) یعنی «دست نزدم» و ایرادی نداره. مقایسه روی
 * مقدارِ خام انجام می‌شه نه نرمال‌شده — نمادِ EA مثلِ «XAUUSD.m» نباید با
 * بزرگ‌کردنِ حروف «تغییر» حساب بشه.
 */
export function findBrokerFieldEdits(existing: BrokerSnapshot, raw: Record<string, unknown>): TradeEntryBrokerField[] {
  const edits: TradeEntryBrokerField[] = [];
  for (const f of TRADE_ENTRY_BROKER_FIELDS) {
    const v = raw[f];
    if (v === undefined) continue;
    const cur = existing[f];
    let same: boolean;
    if (cur instanceof Date || f === "closedAt" || f === "openedAt") {
      const d = v === null ? null : parseIsoDateTime(v);
      same = cur === null ? v === null : d !== null && d.getTime() === (cur as Date).getTime();
    } else {
      same = v === cur;
    }
    if (!same) edits.push(f);
  }
  return edits;
}

// برای معامله‌ی متاتریدری فقط فیلدهای دستی از parseTradeInput رد می‌شن؛
// فیلدهای بروکری با مقادیرِ خنثی جایگزین می‌شن تا اعتبارسنجیِ وب (که برای
// ورودیِ دستیِ انسان نوشته شده — مثلا الگوی نماد) روی داده‌ی EA که قبلا
// ذخیره شده بی‌دلیل خطا نده. خروجیِ این مقادیرِ خنثی هیچ‌وقت نوشته نمی‌شه.
const NEUTRAL_BROKER_BODY = {
  symbol: "EURUSD",
  direction: "BUY",
  volume: 1,
  volumeUnit: "LOT",
  openedAt: "2020-01-01T00:00:00.000Z",
  closedAt: null,
  status: "CLOSED",
  result: "BREAKEVEN",
  pnl: 0,
  entryPrice: null,
  exitPrice: null,
  stopLoss: null,
  takeProfit: null,
  commission: null,
  swap: null,
};

type EntryData = Omit<Prisma.TradeEntryUncheckedCreateInput, "userId" | "id">;

export type PreparedEntryWrite = {
  /** داده‌ی نهاییِ ستون‌ها (بدونِ فیلدهای چک‌لیست/برچسب/عکس) */
  data: Partial<EntryData>;
  tagIds: string[];
  /** فقط برای ساختِ معامله — در ویرایش نادیده گرفته می‌شه */
  checklistId: string | null;
  checklistState: Record<string, boolean>;
};

/**
 * آماده‌سازیِ نوشتنِ یک معامله. `existing` ردیفِ فعلی (یا null برای ساخت).
 * همه‌ی اعتبارسنجی و محاسبه‌ی مشتقات (sessions, rMultiple) از parseTradeInput
 * ـِ خودِ وب میاد؛ مقادیرِ sessions/rMultipleِ کلاینت هیچ‌جا خونده نمی‌شن.
 */
export function prepareEntryWrite(existing: BrokerSnapshot | null, raw: unknown): V<PreparedEntryWrite> {
  if (!isPlainObject(raw)) return { ok: false, error: "داده‌ی معامله نامعتبر است" };
  // تاریخ‌ها فقط ISOِ کامل با منطقه‌ی زمانی — parseTradeInput هرچیزی رو که
  // `new Date` بفهمه قبول می‌کنه (مثلا «2026-09-01 10:00» که به ساعتِ محلیِ
  // سرور تفسیر می‌شد و UTCِ ذخیره‌شده رو بی‌صدا جابه‌جا می‌کرد).
  if (raw.openedAt !== undefined && !parseIsoDateTime(raw.openedAt)) return { ok: false, error: "openedAt باید ISO با منطقه‌ی زمانی باشد" };
  if (raw.closedAt !== undefined && raw.closedAt !== null && !parseIsoDateTime(raw.closedAt)) {
    return { ok: false, error: "closedAt باید ISO با منطقه‌ی زمانی باشد" };
  }
  const tagIds = parseTagIds(raw.tagIds);
  if (!tagIds.ok) return tagIds;
  const checklistId = optRefId(raw.checklistId, "checklistId");
  if (!checklistId.ok) return checklistId;
  let checklistState: Record<string, boolean> = {};
  if (raw.checklistState !== undefined && raw.checklistState !== null) {
    if (!isPlainObject(raw.checklistState)) return { ok: false, error: "checklistState نامعتبر است" };
    const entries = Object.entries(raw.checklistState);
    if (entries.length > MAX_CHECKLIST_STATE_KEYS || !entries.every(([, v]) => typeof v === "boolean")) {
      return { ok: false, error: "checklistState نامعتبر است" };
    }
    checklistState = Object.fromEntries(entries) as Record<string, boolean>;
  }
  // عکس‌ها فعلا همگام نمی‌شن — هر چیزی که فرستاده بشه نادیده گرفته می‌شه
  const { images: _images, sessions: _sessions, rMultiple: _r, ...body } = raw;

  if (existing?.externalId) {
    const edits = findBrokerFieldEdits(existing, body);
    if (edits.length) {
      return { ok: false, code: "broker_field_locked", error: `این معامله از متاتریدر همگام شده و این فیلدها قابل ویرایش نیستند: ${edits.join(", ")}` };
    }
    const parsed = parseTradeInput({ ...body, ...NEUTRAL_BROKER_BODY, accountId: existing.accountId, images: [] });
    if (typeof parsed === "string") return { ok: false, error: parsed };
    const data: Partial<EntryData> = {};
    for (const f of TRADE_ENTRY_MANUAL_FIELDS) (data as Record<string, unknown>)[f] = parsed.data[f];
    // R با pnlِ واقعیِ سرور (نه pnlِ خنثی)
    data.rMultiple = computeR(existing.pnl, parsed.data.riskAmount ?? null);
    return { ok: true, value: { data, tagIds: tagIds.value, checklistId: null, checklistState: {} } };
  }

  const parsed = parseTradeInput({ ...body, images: [] });
  if (typeof parsed === "string") return { ok: false, error: parsed };
  return { ok: true, value: { data: parsed.data, tagIds: tagIds.value, checklistId: checklistId.value, checklistState } };
}

/**
 * اسنپ‌شاتِ چک‌لیست در لحظه‌ی ساختِ معامله — آینه‌ی buildChecklistSnapshotِ
 * /api/trade/entries: متنِ آیتم‌ها از چک‌لیستِ ذخیره‌شده‌ی خودِ کاربر کپی
 * می‌شه، تیک‌ها از state. ناقص‌بودن هیچ‌وقت خطا نیست.
 */
export function buildChecklistSnapshot(
  checklist: { id: string; name: string; items: { id: string; text: string; order: number }[] } | null,
  state: Record<string, boolean>
) {
  if (!checklist) {
    return { checklistId: null, checklistName: null, checklistDone: null, checklistTotal: null, snapshot: null as TradeChecklistSnapshotItem[] | null };
  }
  const snapshot = [...checklist.items].sort((a, b) => a.order - b.order).map((i) => ({ text: i.text, checked: state[i.id] === true }));
  return {
    checklistId: checklist.id,
    checklistName: checklist.name,
    checklistDone: snapshot.filter((i) => i.checked).length,
    checklistTotal: snapshot.length,
    snapshot,
  };
}

// ─── تجزیه‌ی یک تغییرِ push ───────────────────────────────────────────────

export type ParsedTradeChange =
  | { entity: "tradeAccount"; id: string; op: "upsert"; data: ParsedAccountData; clientAt: Date }
  | { entity: "tradeTag"; id: string; op: "upsert"; data: ParsedTagData; clientAt: Date }
  | { entity: "tradeChecklist"; id: string; op: "upsert"; data: ParsedChecklistData; clientAt: Date }
  | { entity: "tradeEntry"; id: string; op: "upsert"; raw: Record<string, unknown>; clientAt: Date }
  | { entity: "tradeNote"; id: string; op: "upsert"; data: ParsedNoteData; clientAt: Date }
  | { entity: TradeDeletableEntity; id: string; op: "delete"; clientAt: Date }
  | { entity: "tradeSetting"; key: TradeSyncSettingKey; op: "upsert"; value: unknown; clientAt: Date }
  | { entity: "tradeSetting"; key: TradeSyncSettingKey; op: "delete"; clientAt: Date };

export type ParseTradeChangeResult =
  | { ok: true; change: ParsedTradeChange }
  | { ok: false; error: string; code: TradeSyncRejectCode; entity: TradeSyncEntity | null; id?: string; key?: string };

const ENTITIES = new Set<TradeSyncEntity>(["tradeAccount", "tradeTag", "tradeChecklist", "tradeEntry", "tradeNote", "tradeSetting"]);

/** مرجعِ خامِ یک تغییر (برای نتیجه‌ی rejected حتی وقتی بقیه‌ش بدشکله) */
export function rawRef(raw: unknown): { entity: TradeSyncEntity | null; id?: string; key?: string } {
  if (!isPlainObject(raw) || !ENTITIES.has(raw.entity as TradeSyncEntity)) return { entity: null };
  const entity = raw.entity as TradeSyncEntity;
  if (entity === "tradeSetting") return { entity, key: typeof raw.key === "string" ? raw.key.slice(0, 64) : undefined };
  return { entity, id: typeof raw.id === "string" ? raw.id.slice(0, 64) : undefined };
}

export function parseTradeSyncChange(raw: unknown, now: Date): ParseTradeChangeResult {
  const ref = rawRef(raw);
  const fail = (error: string, code: TradeSyncRejectCode = "invalid"): ParseTradeChangeResult => ({ ok: false, error, code, ...ref });
  if (!isPlainObject(raw)) return fail("تغییر نامعتبر است");
  if (!ref.entity) return fail("نوعِ موجودیت نامعتبر است");
  const entity = ref.entity;

  const op = raw.op;
  if (op !== "upsert" && op !== "delete") return fail("op باید upsert یا delete باشد");
  const clientAt = clampClientTimestamp(raw.clientUpdatedAt, now);
  if (!clientAt) return fail("clientUpdatedAt نامعتبر است");

  if (entity === "tradeSetting") {
    if (!isTradeSyncSettingKey(raw.key)) return fail("کلید تنظیمات نامعتبر است");
    const key = raw.key;
    if (op === "delete") return { ok: true, change: { entity, key, op, clientAt } };
    const v = validateSettingValue(raw.data);
    if (!v.ok) return fail(v.error);
    return { ok: true, change: { entity, key, op, value: v.value, clientAt } };
  }

  if (!isValidClientId(raw.id)) return fail("شناسه نامعتبر است");
  const id = raw.id;

  if (op === "delete") {
    // «حذفِ حساب» در این محصول یعنی آرشیو، نه پاک‌شدنِ تاریخچه — purge فقط
    // از وب و پشتِ تأییدِ تایپی ممکنه.
    if (entity === "tradeAccount") return fail("حساب حذف نمی‌شود — برای آرشیو archived=true بفرست");
    return { ok: true, change: { entity, id, op, clientAt } };
  }

  switch (entity) {
    case "tradeAccount": {
      const d = validateAccountData(raw.data);
      return d.ok ? { ok: true, change: { entity, id, op, data: d.value, clientAt } } : fail(d.error);
    }
    case "tradeTag": {
      const d = validateTagData(raw.data);
      return d.ok ? { ok: true, change: { entity, id, op, data: d.value, clientAt } } : fail(d.error);
    }
    case "tradeChecklist": {
      const d = validateChecklistData(raw.data);
      return d.ok ? { ok: true, change: { entity, id, op, data: d.value, clientAt } } : fail(d.error);
    }
    case "tradeNote": {
      const d = validateNoteData(raw.data);
      return d.ok ? { ok: true, change: { entity, id, op, data: d.value, clientAt } } : fail(d.error);
    }
    case "tradeEntry": {
      // اعتبارسنجیِ کامل به ردیفِ فعلی بستگی داره (معامله‌ی متاتریدری یا
      // نه) — در store با prepareEntryWrite انجام می‌شه.
      if (!isPlainObject(raw.data)) return fail("داده‌ی معامله نامعتبر است");
      return { ok: true, change: { entity, id, op, raw: raw.data, clientAt } };
    }
  }
}

// ─── سریال‌سازیِ ردیف‌ها ──────────────────────────────────────────────────

const iso = (d: Date | null) => (d ? d.toISOString() : null);
const meta = (editedAt: Date, updatedAt: Date) => ({ editedAt: editedAt.toISOString(), updatedAt: updatedAt.toISOString() });

type AccountRow = Prisma.TradeAccountGetPayload<{
  include: { tags: { select: { id: true } }; mtLink: { select: { tokenHash: true; revokedAt: true; lastSyncAt: true } } };
}>;
export function serializeTradeAccount(r: AccountRow): TradeAccountRecord {
  return {
    id: r.id,
    name: r.name,
    broker: r.broker,
    type: r.type,
    currency: r.currency,
    initialBalance: r.initialBalance,
    leverage: r.leverage,
    color: r.color,
    note: r.note,
    goalType: r.goalType,
    goalValue: r.goalValue,
    archived: r.archived,
    archivedAt: iso(r.archivedAt),
    order: r.order,
    tagIds: r.tags.map((t) => t.id),
    // هشِ توکن هیچ‌وقت بیرون نمی‌ره — فقط «متصل هست یا نه»
    mtConnected: !!r.mtLink?.tokenHash && !r.mtLink.revokedAt,
    mtLastSyncAt: iso(r.mtLink?.lastSyncAt ?? null),
    createdAt: r.createdAt.toISOString(),
    ...meta(effectiveEditedAt(r), r.updatedAt),
  };
}

type TagRow = Prisma.TradeTagGetPayload<Record<string, never>>;
export function serializeTradeTag(r: TagRow): TradeTagRecord {
  return { id: r.id, name: r.name, color: r.color, createdAt: r.createdAt.toISOString(), ...meta(effectiveEditedAt(r), r.updatedAt) };
}

type ChecklistRow = Prisma.TradeChecklistGetPayload<{ include: { items: true } }>;
export function serializeTradeChecklist(r: ChecklistRow): TradeChecklistRecord {
  return {
    id: r.id,
    name: r.name,
    color: r.color,
    required: r.required,
    archived: r.archived,
    order: r.order,
    note: r.note,
    items: [...r.items].sort((a, b) => a.order - b.order).map((i) => ({ id: i.id, text: i.text, order: i.order, checked: i.checked })),
    createdAt: r.createdAt.toISOString(),
    ...meta(checklistEditedAt(r), r.updatedAt),
  };
}

function snapshotOf(v: unknown): TradeChecklistSnapshotItem[] | null {
  if (!Array.isArray(v)) return null;
  return v
    .filter((i): i is { text: unknown; checked: unknown } => isPlainObject(i))
    .map((i) => ({ text: String(i.text ?? ""), checked: i.checked === true }));
}

type EntryRow = Prisma.TradeEntryGetPayload<{ include: { tags: { select: { id: true } }; _count: { select: { images: true } } } }>;
export function serializeTradeEntry(r: EntryRow): TradeEntryRecord {
  return {
    id: r.id,
    accountId: r.accountId,
    symbol: r.symbol,
    direction: r.direction,
    timeframe: r.timeframe,
    openedAt: r.openedAt.toISOString(),
    closedAt: iso(r.closedAt),
    volume: r.volume,
    volumeUnit: r.volumeUnit === "USD" ? "USD" : "LOT",
    result: r.result,
    pnl: r.pnl,
    riskFree: r.riskFree,
    status: r.status,
    entryPrice: r.entryPrice,
    exitPrice: r.exitPrice,
    stopLoss: r.stopLoss,
    takeProfit: r.takeProfit,
    commission: r.commission,
    swap: r.swap,
    riskAmount: r.riskAmount,
    rMultiple: r.rMultiple,
    sessions: r.sessions,
    setup: r.setup,
    entryReasons: r.entryReasons,
    exitReasons: r.exitReasons,
    entryReasonNote: r.entryReasonNote,
    exitReasonNote: r.exitReasonNote,
    note: r.note,
    emotionBefore: r.emotionBefore,
    emotionAfter: r.emotionAfter,
    confidence: r.confidence,
    followedPlan: r.followedPlan,
    checklistId: r.checklistId,
    checklistName: r.checklistName,
    checklistDone: r.checklistDone,
    checklistTotal: r.checklistTotal,
    checklistSnapshot: snapshotOf(r.checklistSnapshot),
    tagIds: r.tags.map((t) => t.id),
    imageCount: r._count.images,
    externalId: r.externalId,
    externalSource: r.externalSource,
    createdAt: r.createdAt.toISOString(),
    ...meta(effectiveEditedAt(r), r.updatedAt),
  };
}

type NoteRow = Prisma.TradeNoteGetPayload<{ include: { tags: { select: { id: true } } } }>;
export function serializeTradeNote(r: NoteRow): TradeNoteRecord {
  return {
    id: r.id,
    title: r.title,
    content: r.content,
    color: r.color,
    pinned: r.pinned,
    accountId: r.accountId,
    entryId: r.entryId,
    tagIds: r.tags.map((t) => t.id),
    createdAt: r.createdAt.toISOString(),
    ...meta(effectiveEditedAt(r), r.updatedAt),
  };
}

export function serializeTradeSetting(r: SyncTimestamps & { key: string; value: unknown }): TradeSettingRecord {
  return { key: r.key as TradeSyncSettingKey, value: r.value ?? null, ...meta(effectiveEditedAt(r), r.updatedAt) };
}

export function serializeTombstone(r: { entity: string; entityId: string; deletedAt: Date; updatedAt: Date }): TradeTombstoneRecord {
  return {
    entity: r.entity as TradeTombstoneRecord["entity"],
    id: r.entityId,
    deleted: true,
    ...meta(r.deletedAt, r.updatedAt),
  };
}
