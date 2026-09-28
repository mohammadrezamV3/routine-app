// ترید — آینه‌ی محلیِ app/api/trade/{accounts,entries,entries/[id],checklists,
// checklists/[id]/items,notes,tags}/route.ts روی arion-trade (features/trade/db.ts).
// شکلِ پاسخ، اعتبارسنجی و پیام‌های خطا عینا همون روت‌های وبه (تستِ parity:
// localApi/handlers.trade.parity.test.ts روی خودِ فایل‌های روتِ وب). گیتِ TRADE
// قبل از این هندلرها در guards.ts اعمال می‌شه (همون requireModule).
//
// قواعدِ CLAUDE.md که این‌جا رعایت می‌شن:
//   • حساب‌محور؛ «حذفِ حساب» یعنی آرشیو (mode=archive، پیش‌فرض)، نه پاکِ تاریخچه.
//   • زمانِ معامله (openedAt/closedAt) UTC ISO؛ جلسه/R سمتِ این هندلر محاسبه
//     می‌شن (نه از ورودیِ کلاینت) — دقیقا مثلِ parseTradeInput ِ وب.
//   • اسنپ‌شاتِ چک‌لیست فقط لحظه‌ی ثبت گرفته می‌شه (متن کپی، نه ارجاع) و بعدش
//     هیچ‌وقت زنده نمی‌شه؛ ناقص/نبودنِ چک‌لیست هیچ‌وقت جلوی ثبت رو نمی‌گیره.
//   • فیلدهای بروکریِ معامله‌ی متاتریدری (externalId) این‌جا اصلا قابلِ ویرایش
//     نیستن — parseTradeInput همون فیلدها رو می‌سازه ولی sync (tradeAdapter)
//     موقعِ push حذفشون می‌کنه؛ محلی فقط هشدار نمی‌ده (UI جلوش رو می‌گیره).
//
// عکس‌ها فقط محلی می‌مونن (db.ts) — سرور فقط imageCount رو می‌شناسه.
import { db, baseRow, touch, type TradeAccountRow, type TradeChecklistItemRow, type TradeChecklistRow, type TradeEntryRow, type TradeNoteRow, type TradeTagRow } from "@m/features/trade/db";
import { newId, nowIso } from "@m/features/trade/lib/id";
import { parseTradeInput, parseAccountInput, isHexColor, type ParsedTradeInput } from "@/lib/tradeServer";
import { shapeAccountSummaries, buildChecklistSnapshotData, serializeNote, type AccountMtLinkRow, type AccountSummaryStatRow } from "@/lib/tradeShapes";
import { clampText, parseDateRange } from "@/lib/validate";
import { MAX_ACCOUNTS, MAX_TAGS, MAX_CHECKLISTS, MAX_CHECKLIST_ITEMS, MIN_CHECKLIST_ITEMS } from "@/lib/tradeTypes";
import { json } from "../respond";
import { readCached } from "../cache";
import { services } from "../services";
import type { LocalCtx } from "../types";

const notFound = (msg: string) => json({ error: msg }, 404);
const badRequest = (msg: string) => json({ error: msg }, 400);
const userId = (): string => services().tokens.getUser()?.id ?? "";

/** ردیفِ تازه — baseRow() + createdAt (فقط‌خواندنی، مثلِ createdAt ِ سرور) */
function newRow() {
  const now = nowIso();
  return { id: newId(), updatedAt: now, deletedAt: null as string | null, dirty: 1 as const, createdAt: now };
}

async function readBody(req: Request): Promise<any> {
  return req.json().catch(() => null);
}

// ─── برچسب‌ها (تگ‌های حساب/معامله/یادداشت مشترک) ─────────────────────────

async function tagsOf(ids: string[] | undefined): Promise<{ id: string; name: string; color: string }[]> {
  if (!ids?.length) return [];
  const out: { id: string; name: string; color: string }[] = [];
  for (const id of ids) {
    const t = await db.tags.get(id);
    if (t && !t.deletedAt) out.push({ id: t.id, name: t.name, color: t.color });
  }
  return out;
}

async function ownedTagIds(raw: unknown): Promise<string[]> {
  const ids = Array.isArray(raw) ? raw.filter((t: unknown): t is string => typeof t === "string").slice(0, 20) : [];
  if (!ids.length) return [];
  const out: string[] = [];
  for (const id of ids) {
    const t = await db.tags.get(id);
    if (t && !t.deletedAt) out.push(id);
  }
  return out;
}

// GET /api/trade/tags
export async function getTags(): Promise<Response> {
  const rows = (await db.tags.filter((r) => !r.deletedAt).toArray()).sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
  return json({ tags: rows.map((t) => ({ id: t.id, name: t.name, color: t.color })) });
}

// POST /api/trade/tags { name, color? }
export async function postTag({ req }: LocalCtx): Promise<Response> {
  const body = await readBody(req);
  const name = clampText(String(body?.name || "").trim(), 30);
  if (!name) return badRequest("نام برچسب الزامی است");
  const color = isHexColor(body?.color) ? body.color : "#3E7BFA";

  const count = await db.tags.filter((r) => !r.deletedAt).count();
  if (count >= MAX_TAGS) return badRequest(`حداکثر ${MAX_TAGS} برچسب مجاز است`);

  const existing = await db.tags.filter((r) => !r.deletedAt && r.name === name).first();
  if (existing) return badRequest("برچسبی با این نام از قبل هست");

  const row: TradeTagRow = { ...newRow(), name, color };
  await db.tags.put(row);
  return json({ ok: true, tag: { id: row.id, name: row.name, color: row.color } });
}

// PATCH /api/trade/tags { id, name, color? }
export async function patchTag({ req }: LocalCtx): Promise<Response> {
  const body = await readBody(req);
  const id = String(body?.id || "");
  const name = clampText(String(body?.name || "").trim(), 30);
  if (!id || !name) return badRequest("اطلاعات ناقص است");

  const duplicate = await db.tags.filter((r) => !r.deletedAt && r.id !== id && r.name === name).first();
  if (duplicate) return badRequest("برچسبی با این نام از قبل هست");

  const existing = await db.tags.get(id);
  if (existing && !existing.deletedAt) {
    await db.tags.put(touch({ ...existing, name, ...(isHexColor(body?.color) ? { color: body.color } : {}) }));
  }
  return json({ ok: true });
}

// DELETE /api/trade/tags?id=...
export async function deleteTag({ url }: LocalCtx): Promise<Response> {
  const id = url.searchParams.get("id");
  if (!id) return badRequest("id الزامی است");
  await db.transaction("rw", [db.tags, db.accounts, db.trades, db.notes], async () => {
    const existing = await db.tags.get(id);
    if (existing && !existing.deletedAt) await db.tags.put(touch({ ...existing, deletedAt: nowIso() }));
    const without = (arr: string[] | undefined) => (arr ?? []).filter((x) => x !== id);
    await db.accounts.filter((r) => (r.tagIds ?? []).includes(id)).modify((r) => void (r.tagIds = without(r.tagIds)));
    await db.trades.filter((r) => (r.tagIds ?? []).includes(id)).modify((r) => void (r.tagIds = without(r.tagIds)));
    await db.notes.filter((r) => (r.tagIds ?? []).includes(id)).modify((r) => void (r.tagIds = without(r.tagIds)));
  });
  return json({ ok: true });
}

// ─── حساب‌ها ──────────────────────────────────────────────────────────────

function accountJson(row: TradeAccountRow, tags: { id: string; name: string; color: string }[]) {
  return {
    id: row.id, name: row.name, broker: row.broker, type: row.type, currency: row.currency,
    initialBalance: row.initialBalance, leverage: row.leverage, color: row.color, note: row.note,
    goalType: row.goalType, goalValue: row.goalValue, archived: row.archived, order: row.order, tags,
  };
}

/** وضعیتِ اتصالِ متاتریدر — اول کشِ تازه‌ی /api/trade/metatrader?accountId=…، وگرنه
 *  همون چیزی که آخرین pull ِ سینک روی خودِ حساب گذاشته (remoteAccount ِ tradeAdapter). */
async function mtStatusFor(row: TradeAccountRow): Promise<AccountMtLinkRow> {
  const uid = userId();
  const cached = uid ? await readCached(`/api/trade/metatrader?accountId=${row.id}`, uid) : null;
  if (cached) {
    try {
      const data = JSON.parse(cached.body) as { link: { connected: boolean; lastSyncAt: string | null } | null };
      return {
        tokenHash: data.link?.connected ? "x" : null,
        revokedAt: null,
        lastSyncAt: data.link?.lastSyncAt ? new Date(data.link.lastSyncAt) : null,
      };
    } catch {
      /* پاسخِ خراب — به fallback زیر برو */
    }
  }
  return { tokenHash: row.mtConnected ? "x" : null, revokedAt: null, lastSyncAt: row.mtLastSyncAt ? new Date(row.mtLastSyncAt) : null };
}

// GET /api/trade/accounts?archived=1
export async function getAccounts({ url }: LocalCtx): Promise<Response> {
  const includeArchived = url.searchParams.get("archived") === "1";
  const all = await db.accounts.filter((r) => !r.deletedAt && (includeArchived || !r.archived)).toArray();
  all.sort((a, b) => (a.archived === b.archived ? 0 : a.archived ? 1 : -1) || a.order - b.order || a.updatedAt.localeCompare(b.updatedAt));

  const ids = new Set(all.map((a) => a.id));
  const stats: AccountSummaryStatRow[] = (await db.trades.filter((r) => !r.deletedAt && ids.has(r.accountId)).toArray()).map((e) => ({
    accountId: e.accountId, status: e.status, pnl: e.pnl, rMultiple: e.rMultiple, openedAt: new Date(e.openedAt),
  }));

  const rows = await Promise.all(
    all.map(async (row) => ({ ...accountJson(row, await tagsOf(row.tagIds)), mtLink: await mtStatusFor(row) }))
  );
  const accounts = shapeAccountSummaries(rows, stats);
  return json({ accounts });
}

// POST /api/trade/accounts
export async function postAccount({ req }: LocalCtx): Promise<Response> {
  const body = await readBody(req);
  const parsed = parseAccountInput(body);
  if (typeof parsed === "string") return badRequest(parsed);

  const active = await db.accounts.filter((r) => !r.deletedAt && !r.archived).count();
  if (active >= MAX_ACCOUNTS) return badRequest(`حداکثر ${MAX_ACCOUNTS} حساب فعال می‌توانی داشته باشی`);

  const tagIds = await ownedTagIds(body?.tagIds);
  const row: TradeAccountRow = { ...newRow(), ...(parsed as Record<string, unknown>), archived: false, archivedAt: null, order: active, tagIds } as TradeAccountRow;
  await db.accounts.put(row);
  return json({ ok: true, account: accountJson(row, await tagsOf(tagIds)) });
}

// PATCH /api/trade/accounts { id, ...fields }
export async function patchAccount({ req }: LocalCtx): Promise<Response> {
  const body = await readBody(req);
  const id = String(body?.id || "");
  if (!id) return badRequest("id الزامی است");
  const parsed = parseAccountInput(body);
  if (typeof parsed === "string") return badRequest(parsed);

  const existing = await db.accounts.get(id);
  if (!existing || existing.deletedAt) return notFound("حساب پیدا نشد");

  const tagIds = await ownedTagIds(body?.tagIds);
  const row: TradeAccountRow = touch({ ...existing, ...(parsed as Record<string, unknown>), tagIds } as TradeAccountRow);
  await db.accounts.put(row);
  return json({ ok: true, account: accountJson(row, await tagsOf(tagIds)) });
}

// DELETE /api/trade/accounts?id=...  (بدونِ mode=purge — همون در router.ts
// جدا شده و ONLINE+barrier رفته، چون قراردادِ سینک حذفِ واقعیِ حساب رو تعریف
// نمی‌کنه؛ محلی‌کردنش یعنی hard-deleteِ بدونِ tombstone که قانونِ صریحِ
// CLAUDE.md رو می‌شکنه. این‌جا فقط toggleِ آرشیو — «حذفِ حساب» ِ پیش‌فرض.)
export async function deleteAccount({ url }: LocalCtx): Promise<Response> {
  const id = url.searchParams.get("id");
  if (!id) return badRequest("id الزامی است");

  const existing = await db.accounts.get(id);
  if (!existing || existing.deletedAt) return notFound("حساب پیدا نشد");

  const archived = !existing.archived;
  await db.accounts.put(touch({ ...existing, archived, archivedAt: archived ? nowIso() : null }));
  return json({ ok: true, archived });
}

// ─── معاملات ──────────────────────────────────────────────────────────────

function entryJson(row: TradeEntryRow, tags: { id: string; name: string; color: string }[]) {
  return {
    id: row.id, accountId: row.accountId, symbol: row.symbol, direction: row.direction, timeframe: row.timeframe,
    openedAt: row.openedAt, closedAt: row.closedAt, volume: row.volume, volumeUnit: row.volumeUnit, result: row.result,
    pnl: row.pnl, riskFree: row.riskFree, status: row.status, entryPrice: row.entryPrice, exitPrice: row.exitPrice,
    stopLoss: row.stopLoss, takeProfit: row.takeProfit, commission: row.commission, swap: row.swap,
    riskAmount: row.riskAmount, rMultiple: row.rMultiple, sessions: row.sessions, setup: row.setup,
    entryReasons: row.entryReasons ?? [], exitReasons: row.exitReasons ?? [], entryReasonNote: row.entryReasonNote,
    exitReasonNote: row.exitReasonNote, note: row.note, emotionBefore: row.emotionBefore, emotionAfter: row.emotionAfter,
    confidence: row.confidence, followedPlan: row.followedPlan, checklistId: row.checklistId,
    checklistName: row.checklistName, checklistDone: row.checklistDone ?? null, checklistTotal: row.checklistTotal ?? null,
    tags, imageCount: row.images?.length ?? 0,
  };
}

async function ownedAccount(accountId: string): Promise<TradeAccountRow | undefined> {
  if (!accountId) return undefined;
  const a = await db.accounts.get(accountId);
  return a && !a.deletedAt ? a : undefined;
}

/** فیلدهایِ خامِ `parseTradeInput(...).data` → ستون‌های TradeEntryRow — صریح، تا
 *  ناسازگاریِ تایپِ Prisma.TradeEntryUncheckedCreateInput (لیست‌های اسکالر) با
 *  تایپِ محلی هیچ‌وقت بی‌سروصدا فیلدی رو گم نکنه. */
function entryFields(data: ParsedTradeInput["data"]) {
  const d = data as Record<string, unknown>;
  return {
    accountId: d.accountId as string,
    symbol: d.symbol as string,
    direction: d.direction as TradeEntryRow["direction"],
    timeframe: d.timeframe as string | null,
    openedAt: (d.openedAt as Date).toISOString(),
    closedAt: d.closedAt ? (d.closedAt as Date).toISOString() : null,
    volume: d.volume as number,
    volumeUnit: d.volumeUnit as TradeEntryRow["volumeUnit"],
    result: d.result as TradeEntryRow["result"],
    pnl: d.pnl as number,
    riskFree: !!d.riskFree,
    status: d.status as TradeEntryRow["status"],
    entryPrice: d.entryPrice as number | null,
    exitPrice: d.exitPrice as number | null,
    stopLoss: d.stopLoss as number | null,
    takeProfit: d.takeProfit as number | null,
    commission: d.commission as number | null,
    swap: d.swap as number | null,
    riskAmount: d.riskAmount as number | null,
    rMultiple: d.rMultiple as number | null,
    sessions: d.sessions as TradeEntryRow["sessions"],
    setup: d.setup as string | null,
    entryReasons: (d.entryReasons ?? []) as string[],
    exitReasons: (d.exitReasons ?? []) as string[],
    entryReasonNote: d.entryReasonNote as string | null,
    exitReasonNote: d.exitReasonNote as string | null,
    note: d.note as string | null,
    emotionBefore: (d.emotionBefore ?? null) as string | null,
    emotionAfter: (d.emotionAfter ?? null) as string | null,
    confidence: d.confidence as number | null,
    followedPlan: d.followedPlan as boolean | null,
  };
}

async function checklistSnapshotFor(checklistId: string | null, state: Record<string, boolean>) {
  const checklist = checklistId ? await db.checklists.get(checklistId) : undefined;
  if (!checklist || checklist.deletedAt) return buildChecklistSnapshotData(null, state);
  const items = (await db.checklistItems.where("checklistId").equals(checklist.id).toArray())
    .filter((i) => !i.deletedAt)
    .sort((a, b) => a.order - b.order)
    .map((i) => ({ id: i.id, text: i.text }));
  return buildChecklistSnapshotData({ id: checklist.id, name: checklist.name, items }, state);
}

// GET /api/trade/entries?accountId=...&from=YYYY-MM-DD&to=YYYY-MM-DD
export async function getEntries({ url }: LocalCtx): Promise<Response> {
  const accountId = url.searchParams.get("accountId") || "";
  if (!(await ownedAccount(accountId))) return notFound("حساب پیدا نشد");

  const fromRaw = url.searchParams.get("from");
  const toRaw = url.searchParams.get("to");
  let from: number | null = null;
  let to: number | null = null;
  if (fromRaw || toRaw) {
    const range = parseDateRange(fromRaw, toRaw);
    if ("error" in range) return badRequest(range.error);
    from = range.from.getTime();
    to = range.to.getTime() + 86_400_000 - 1;
  }

  let rows = (await db.trades.where("accountId").equals(accountId).filter((r) => !r.deletedAt).toArray());
  if (from !== null && to !== null) rows = rows.filter((r) => new Date(r.openedAt).getTime() >= from! && new Date(r.openedAt).getTime() <= to!);
  rows.sort((a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime());
  rows = rows.slice(0, 2000);

  const entries = await Promise.all(rows.map(async (r) => entryJson(r, await tagsOf(r.tagIds))));
  return json({ entries });
}

// GET /api/trade/entries/:id
export async function getEntryDetail({ params }: LocalCtx): Promise<Response> {
  const row = await db.trades.get(params.id);
  if (!row || row.deletedAt) return notFound("معامله پیدا نشد");
  const tags = await tagsOf(row.tagIds);
  const base = entryJson(row, tags);
  return json({
    entry: {
      ...base,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      images: (row.images ?? []).slice().sort((a, b) => a.order - b.order),
      imageCount: row.images?.length ?? 0,
      checklistSnapshot: row.checklistSnapshot ?? null,
    },
  });
}

// POST /api/trade/entries
export async function postEntry({ req }: LocalCtx): Promise<Response> {
  const body = await readBody(req);
  const parsed = parseTradeInput(body);
  if (typeof parsed === "string") return badRequest(parsed);
  if (!(await ownedAccount(parsed.data.accountId as string))) return notFound("حساب پیدا نشد");

  const checklistId = (body?.checklistId as string | null) ?? null;
  const snapshot = await checklistSnapshotFor(checklistId, parsed.checklistState);
  const tagIds = await ownedTagIds(parsed.tagIds);
  const now = nowIso();

  const row: TradeEntryRow = {
    ...baseRow(),
    createdAt: now,
    ...entryFields(parsed.data),
    checklistId: snapshot.checklistId,
    checklistName: snapshot.checklistName,
    checklistDone: snapshot.checklistDone,
    checklistTotal: snapshot.checklistTotal,
    checklistSnapshot: snapshot.checklistSnapshot,
    checklistState: parsed.checklistState,
    tagIds,
    images: parsed.images.map((img, i) => ({ id: newId(), dataUrl: img.dataUrl, caption: img.caption, order: i })),
  };
  await db.trades.put(row);
  return json({ ok: true, entry: entryJson(row, await tagsOf(tagIds)) });
}

// PATCH /api/trade/entries { id, ...همه‌ی فیلدها }
export async function patchEntry({ req }: LocalCtx): Promise<Response> {
  const body = await readBody(req);
  const id = String(body?.id || "");
  if (!id) return badRequest("id الزامی است");
  const parsed = parseTradeInput(body);
  if (typeof parsed === "string") return badRequest(parsed);

  const existing = await db.trades.get(id);
  if (!existing || existing.deletedAt) return notFound("معامله پیدا نشد");
  if (!(await ownedAccount(parsed.data.accountId as string))) return notFound("حساب پیدا نشد");

  const checklistId = (body?.checklistId as string | null) ?? null;
  const snapshot = await checklistSnapshotFor(checklistId, parsed.checklistState);
  const tagIds = await ownedTagIds(parsed.tagIds);

  const row: TradeEntryRow = touch({
    ...existing,
    ...entryFields(parsed.data),
    checklistId: snapshot.checklistId,
    checklistName: snapshot.checklistName,
    checklistDone: snapshot.checklistDone,
    checklistTotal: snapshot.checklistTotal,
    checklistSnapshot: snapshot.checklistSnapshot,
    checklistState: parsed.checklistState,
    tagIds,
    images: parsed.images.map((img, i) => ({ id: newId(), dataUrl: img.dataUrl, caption: img.caption, order: i })),
  });
  await db.trades.put(row);
  return json({ ok: true, entry: entryJson(row, await tagsOf(tagIds)) });
}

// DELETE /api/trade/entries?id=...
export async function deleteEntry({ url }: LocalCtx): Promise<Response> {
  const id = url.searchParams.get("id");
  if (!id) return badRequest("id الزامی است");
  await db.transaction("rw", [db.trades, db.notes], async () => {
    const existing = await db.trades.get(id);
    if (existing && !existing.deletedAt) await db.trades.put(touch({ ...existing, deletedAt: nowIso() }));
    await db.notes.where("entryId").equals(id).modify({ entryId: null });
  });
  return json({ ok: true });
}

// ─── چک‌لیست‌ها ────────────────────────────────────────────────────────────

const SEED_NAME = "چک‌لیست من";
const SEED_FLAG_KEY = "tradeChecklistSeeded";
const SEED_ITEMS = [
  "سطح H1 با برخورد قبلی معتبره؟",
  "گره معاملاتی در M5 شکل گرفته؟",
  "کندل تاییدی صادر شده؟",
  "DXY همسوئه یا حداقل واگرایی مشکوک نداره؟",
  "خبر مهمی در ۳۰-۶۰ دقیقه آینده نیست؟",
  "حجم پوزیشن بر اساس ریسک محاسبه شده؟",
  "حد ضرر و هدف سود قبل از ورود مشخصه؟",
];

async function checklistJson(row: TradeChecklistRow) {
  const items = (await db.checklistItems.where("checklistId").equals(row.id).toArray())
    .filter((i) => !i.deletedAt)
    .sort((a, b) => a.order - b.order)
    .map((i) => ({ id: i.id, text: i.text, order: i.order, checked: i.checked }));
  return { id: row.id, name: row.name, color: row.color, required: row.required, archived: row.archived, order: row.order, note: row.note, items };
}

function parseItems(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((t) => (typeof t === "string" ? t : (t as any)?.text))
    .filter((t: unknown): t is string => typeof t === "string" && !!t.trim())
    .slice(0, MAX_CHECKLIST_ITEMS)
    .map((t) => clampText(t.trim(), 200));
}

// GET /api/trade/checklists
export async function getChecklists(): Promise<Response> {
  let rows = await db.checklists.filter((r) => !r.deletedAt).toArray();

  if (rows.length === 0) {
    // چک+نوشتنِ سید باید یک تراکنشِ اتمیک باشه — وگرنه دو GET هم‌زمان (مثلا
    // React StrictMode/رندرِ دوباره) هر دو «هنوز صفره» می‌بینن و هرکدوم یک
    // چک‌لیستِ پیش‌فرضِ جدا می‌سازن (باگِ واقعی که با تستِ E2E پیدا شد).
    // تراکنش‌های Dexie روی همون جدول‌ها سریالایز می‌شن، پس فقط اولی سید می‌کنه.
    await db.transaction("rw", [db.checklists, db.checklistItems, db.meta], async () => {
      const count = await db.checklists.count();
      const seeded = await db.meta.get(SEED_FLAG_KEY);
      if (count > 0 || seeded) return;
      const now = nowIso();
      const checklistRow: TradeChecklistRow = { ...newRow(), name: SEED_NAME, color: "#3E7BFA", required: false, archived: false, order: 0, note: null };
      const itemRows: TradeChecklistItemRow[] = SEED_ITEMS.map((text, i) => ({ ...baseRow(), checklistId: checklistRow.id, text, order: i, checked: false, updatedAt: now }));
      await db.checklists.put(checklistRow);
      await db.checklistItems.bulkPut(itemRows);
      await db.meta.put({ key: SEED_FLAG_KEY, value: true });
    });
    rows = await db.checklists.filter((r) => !r.deletedAt).toArray();
  }

  rows.sort((a, b) => (a.archived === b.archived ? 0 : a.archived ? 1 : -1) || a.order - b.order || a.updatedAt.localeCompare(b.updatedAt));
  const checklists = await Promise.all(rows.map(checklistJson));
  return json({ checklists });
}

// POST /api/trade/checklists { name, color?, required?, items?, note?, duplicateOf? }
export async function postChecklist({ req }: LocalCtx): Promise<Response> {
  const body = await readBody(req);
  const count = await db.checklists.filter((r) => !r.deletedAt && !r.archived).count();
  if (count >= MAX_CHECKLISTS) return badRequest(`حداکثر ${MAX_CHECKLISTS} چک‌لیست مجاز است`);

  let items = parseItems(body?.items);
  let name = clampText(String(body?.name || "").trim(), 60);
  let color = isHexColor(body?.color) ? body.color : "#3E7BFA";
  let note = typeof body?.note === "string" && body.note.trim() ? clampText(body.note.trim(), 2000) : null;

  if (body?.duplicateOf) {
    const src = await db.checklists.get(String(body.duplicateOf));
    if (!src || src.deletedAt) return notFound("چک‌لیست پیدا نشد");
    const srcItems = (await db.checklistItems.where("checklistId").equals(src.id).toArray()).filter((i) => !i.deletedAt).sort((a, b) => a.order - b.order);
    items = srcItems.map((i) => i.text);
    name = name || clampText(`${src.name} (کپی)`, 60);
    color = src.color;
    note = src.note;
  }

  if (!name) return badRequest("نام چک‌لیست الزامی است");
  if (items.length < MIN_CHECKLIST_ITEMS) return badRequest(`چک‌لیست باید حداقل ${MIN_CHECKLIST_ITEMS} مورد داشته باشد`);

  const row: TradeChecklistRow = { ...newRow(), name, color, required: !!body?.required, archived: false, order: count, note };
  const itemRows: TradeChecklistItemRow[] = items.map((text, i) => ({ ...baseRow(), checklistId: row.id, text, order: i, checked: false }));
  await db.transaction("rw", [db.checklists, db.checklistItems], async () => {
    await db.checklists.put(row);
    await db.checklistItems.bulkPut(itemRows);
  });
  return json({ ok: true, checklist: await checklistJson(row) });
}

// PATCH /api/trade/checklists { id, name?, color?, required?, archived?, items?, note? }
export async function patchChecklist({ req }: LocalCtx): Promise<Response> {
  const body = await readBody(req);
  const id = String(body?.id || "");
  if (!id) return badRequest("id الزامی است");
  const existing = await db.checklists.get(id);
  if (!existing || existing.deletedAt) return notFound("چک‌لیست پیدا نشد");

  const patch: Partial<TradeChecklistRow> = {};
  if (typeof body.name === "string" && body.name.trim()) patch.name = clampText(body.name.trim(), 60);
  if (isHexColor(body.color)) patch.color = body.color;
  if (typeof body.required === "boolean") patch.required = body.required;
  if (typeof body.archived === "boolean") patch.archived = body.archived;
  if (typeof body.note === "string") patch.note = body.note.trim() ? clampText(body.note.trim(), 2000) : null;

  const hasItems = Array.isArray(body.items);
  const items = hasItems ? parseItems(body.items) : [];
  if (hasItems && items.length < MIN_CHECKLIST_ITEMS) return badRequest(`چک‌لیست باید حداقل ${MIN_CHECKLIST_ITEMS} مورد داشته باشد`);

  const row = touch({ ...existing, ...patch });
  await db.transaction("rw", [db.checklists, db.checklistItems], async () => {
    if (hasItems) {
      const now = nowIso();
      await db.checklistItems.where("checklistId").equals(id).delete();
      if (items.length) await db.checklistItems.bulkPut(items.map((text, i) => ({ ...baseRow(), checklistId: id, text, order: i, checked: false, updatedAt: now })));
    }
    await db.checklists.put(row);
  });
  return json({ ok: true, checklist: await checklistJson(row) });
}

// DELETE /api/trade/checklists?id=...
export async function deleteChecklist({ url }: LocalCtx): Promise<Response> {
  const id = url.searchParams.get("id");
  if (!id) return badRequest("id الزامی است");
  await db.transaction("rw", [db.checklists, db.checklistItems, db.trades], async () => {
    const existing = await db.checklists.get(id);
    if (existing && !existing.deletedAt) await db.checklists.put(touch({ ...existing, deletedAt: nowIso() }));
    await db.checklistItems.where("checklistId").equals(id).delete();
    await db.trades.where("checklistId").equals(id).modify({ checklistId: null });
  });
  return json({ ok: true });
}

// PATCH /api/trade/checklists/:id/items { itemId, checked } | { resetAll: true }
export async function patchChecklistItems({ req, params }: LocalCtx): Promise<Response> {
  const checklist = await db.checklists.get(params.id);
  if (!checklist || checklist.deletedAt) return notFound("چک‌لیست پیدا نشد");
  const body = await readBody(req);

  if (body?.resetAll === true) {
    const now = nowIso();
    await db.checklistItems.where("checklistId").equals(params.id).modify({ checked: false, updatedAt: now, dirty: 1 });
    return json({ ok: true });
  }

  const itemId = typeof body?.itemId === "string" ? body.itemId : "";
  if (!itemId || typeof body?.checked !== "boolean") return badRequest("درخواست نامعتبر است");

  const item = await db.checklistItems.get(itemId);
  if (!item || item.checklistId !== params.id) return notFound("آیتم پیدا نشد");
  await db.checklistItems.put(touch({ ...item, checked: body.checked }));
  return json({ ok: true });
}

// ─── یادداشت‌ها ────────────────────────────────────────────────────────────

function parseNote(body: any): string | { title: string; content: string; color: string; pinned: boolean } {
  if (!body || typeof body !== "object") return "بدنه‌ی درخواست نامعتبر است";
  const title = String(body.title || "").trim();
  if (!title) return "عنوان یادداشت الزامی است";
  return {
    title: clampText(title, 120),
    content: clampText(String(body.content || ""), 20_000),
    color: isHexColor(body.color) ? body.color : "#3E7BFA",
    pinned: !!body.pinned,
  };
}

async function noteJson(row: TradeNoteRow) {
  return serializeNoteLocal(row, await tagsOf(row.tagIds));
}

function serializeNoteLocal(row: TradeNoteRow, tags: { id: string; name: string; color: string }[]) {
  return serializeNote({
    id: row.id, title: row.title, content: row.content, color: row.color, pinned: row.pinned,
    accountId: row.accountId, entryId: row.entryId, tags,
    createdAt: new Date(row.updatedAt), updatedAt: new Date(row.updatedAt),
  });
}

// GET /api/trade/notes?q=...&tags=id1,id2&accountId=...
export async function getNotes({ url }: LocalCtx): Promise<Response> {
  const q = (url.searchParams.get("q") || "").trim().slice(0, 100).toLowerCase();
  const tagIds = (url.searchParams.get("tags") || "").split(",").map((t) => t.trim()).filter(Boolean).slice(0, 10);
  const accountId = url.searchParams.get("accountId") || undefined;

  let rows = await db.notes.filter((r) => !r.deletedAt).toArray();
  if (q) rows = rows.filter((r) => r.title.toLowerCase().includes(q) || r.content.toLowerCase().includes(q));
  if (tagIds.length) rows = rows.filter((r) => (r.tagIds ?? []).some((t) => tagIds.includes(t)));
  if (accountId) rows = rows.filter((r) => r.accountId === accountId);
  rows.sort((a, b) => (a.pinned === b.pinned ? 0 : a.pinned ? -1 : 1) || b.updatedAt.localeCompare(a.updatedAt));
  rows = rows.slice(0, 300);

  const notes = await Promise.all(rows.map(noteJson));
  return json({ notes });
}

export async function postNote({ req }: LocalCtx): Promise<Response> {
  const body = await readBody(req);
  const parsed = parseNote(body);
  if (typeof parsed === "string") return badRequest(parsed);

  const count = await db.notes.filter((r) => !r.deletedAt).count();
  if (count >= 300) return badRequest("حداکثر 300 یادداشت مجاز است");

  const accountId = body?.accountId ? (await ownedAccount(String(body.accountId)))?.id ?? null : null;
  const entryRow = body?.entryId ? await db.trades.get(String(body.entryId)) : undefined;
  const entryId = entryRow && !entryRow.deletedAt ? entryRow.id : null;
  const tagIds = await ownedTagIds(body?.tagIds);

  const row: TradeNoteRow = { ...newRow(), ...parsed, accountId, entryId, tagIds };
  await db.notes.put(row);
  return json({ ok: true, note: await noteJson(row) });
}

export async function patchNote({ req }: LocalCtx): Promise<Response> {
  const body = await readBody(req);
  const id = String(body?.id || "");
  if (!id) return badRequest("id الزامی است");
  const parsed = parseNote(body);
  if (typeof parsed === "string") return badRequest(parsed);

  const existing = await db.notes.get(id);
  if (!existing || existing.deletedAt) return notFound("یادداشت پیدا نشد");

  const tagIds = await ownedTagIds(body?.tagIds);
  const row = touch({ ...existing, ...parsed, tagIds });
  await db.notes.put(row);
  return json({ ok: true, note: await noteJson(row) });
}

export async function deleteNote({ url }: LocalCtx): Promise<Response> {
  const id = url.searchParams.get("id");
  if (!id) return badRequest("id الزامی است");
  const existing = await db.notes.get(id);
  if (existing && !existing.deletedAt) await db.notes.put(touch({ ...existing, deletedAt: nowIso() }));
  return json({ ok: true });
}
