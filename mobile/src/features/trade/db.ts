// دیتابیس آفلاین ماژول ترید موبایل — Dexie مستقل («arion-trade»)، جدا از
// هر DB دیگری که بقیه‌ی تیم روی mobile/src/db/* می‌سازند (این فایل به آن‌ها
// دست نمی‌زند). هر ردیف یک قرارداد مشترک sync دارد:
//   id          — شناسه‌ی کلاینت (newId()) یا همان cuid سرور بعد از pull.
//   updatedAt   — ISO؛ زمان آخرین تغییرِ *محلی* (یا زمانی که از سرور آمده).
//   deletedAt   — ISO یا null؛ حذف نرم (حساب هیچ‌وقت واقعا حذف نمی‌شود، فقط
//                 آرشیو — archived boolean جدا از deletedAt است).
//   dirty       — 1 یعنی از آخرین sync موفق تغییر کرده و باید push شود.
import Dexie, { type Table } from "dexie";
import { newId, nowIso } from "./lib/id";
import type {
  TradeAccountType,
  TradeGoalType,
  TradeDirection,
  TradeStatus,
  TradeResult,
  TradeSession,
  VolumeUnit,
  TradeChecklistSnapshotItem,
  TradeImage,
} from "./lib/types";

export interface SyncRow {
  id: string;
  updatedAt: string;
  deletedAt: string | null;
  dirty: 0 | 1;
}

export interface TradeAccountRow extends SyncRow {
  name: string;
  broker: string | null;
  type: TradeAccountType;
  currency: string;
  initialBalance: number;
  leverage: number | null;
  color: string;
  note: string | null;
  goalType: TradeGoalType;
  goalValue: number;
  archived: boolean;
  archivedAt: string | null;
  order: number;
  tagIds: string[];
}

export interface TradeEntryRow extends SyncRow {
  accountId: string;
  symbol: string;
  direction: TradeDirection;
  timeframe: string | null;
  openedAt: string; // UTC ISO
  closedAt: string | null; // UTC ISO
  volume: number;
  volumeUnit: VolumeUnit;
  result: TradeResult;
  pnl: number;
  riskFree: boolean;
  status: TradeStatus;
  entryPrice: number | null;
  exitPrice: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  commission: number | null;
  swap: number | null;
  riskAmount: number | null;
  rMultiple: number | null;
  sessions: TradeSession[];
  setup: string | null;
  entryReasonNote: string | null;
  exitReasonNote: string | null;
  note: string | null;
  emotionBefore: string | null;
  emotionAfter: string | null;
  confidence: number | null;
  followedPlan: boolean | null;
  // چک‌لیست: ارجاع (برای فیلتر) + اسنپ‌شات لحظه‌ی ثبت (هیچ‌وقت بعدا زنده
  // نمی‌شود — این قانون صریح CLAUDE.md است).
  checklistId: string | null;
  checklistName: string | null;
  checklistSnapshot: TradeChecklistSnapshotItem[] | null;
  tagIds: string[];
  images: TradeImage[];
}

export interface TradeChecklistRow extends SyncRow {
  name: string;
  color: string;
  required: boolean;
  archived: boolean;
  order: number;
  note: string | null;
}

export interface TradeChecklistItemRow extends SyncRow {
  checklistId: string;
  text: string;
  order: number;
  checked: boolean;
}

export interface TradeNoteRow extends SyncRow {
  title: string;
  content: string;
  color: string;
  pinned: boolean;
  accountId: string | null;
  entryId: string | null;
  tagIds: string[];
}

export interface TradeTagRow extends SyncRow {
  name: string;
  color: string;
}

class ArionTradeDb extends Dexie {
  accounts!: Table<TradeAccountRow, string>;
  trades!: Table<TradeEntryRow, string>;
  checklists!: Table<TradeChecklistRow, string>;
  checklistItems!: Table<TradeChecklistItemRow, string>;
  notes!: Table<TradeNoteRow, string>;
  tags!: Table<TradeTagRow, string>;

  constructor() {
    super("arion-trade");
    // توجه: IndexedDB فقط number/string/Date/Array را به‌عنوان کلید ایندکس
    // قبول می‌کند — بولین (archived/pinned) عمدا ایندکس نشده، فیلترشان با
    // .filter() روی نتیجه‌ی toArray انجام می‌شود (حجم داده‌ی این جداول کم است).
    this.version(1).stores({
      accounts: "id, dirty, updatedAt",
      trades: "id, accountId, status, openedAt, dirty, updatedAt, [accountId+openedAt]",
      checklists: "id, dirty, updatedAt",
      checklistItems: "id, checklistId, dirty, updatedAt",
      notes: "id, accountId, entryId, dirty, updatedAt",
      tags: "id, name, dirty, updatedAt",
    });
  }
}

export const db = new ArionTradeDb();

// ── کمکی‌های عمومی روی هر ردیف ───────────────────────────────────────────
export function baseRow(): SyncRow {
  return { id: newId(), updatedAt: nowIso(), deletedAt: null, dirty: 1 };
}

export function touch<T extends SyncRow>(row: T): T {
  return { ...row, updatedAt: nowIso(), dirty: 1 };
}

// ── قرارداد sync ──────────────────────────────────────────────────────────
export type SyncEntity = "accounts" | "trades" | "checklists" | "checklistItems" | "notes" | "tags";

function tableFor(entity: SyncEntity): Table<any, string> {
  return (db as any)[entity];
}

/** همه‌ی ردیف‌های «کثیف» (تغییر محلی که هنوز push نشده) برای یک موجودیت، یا همه‌شان اگر entity داده نشود. */
export async function getDirty(): Promise<Record<SyncEntity, SyncRow[]>>;
export async function getDirty(entity: SyncEntity): Promise<SyncRow[]>;
export async function getDirty(entity?: SyncEntity): Promise<any> {
  const entities: SyncEntity[] = entity ? [entity] : ["accounts", "trades", "checklists", "checklistItems", "notes", "tags"];
  const out: Record<string, SyncRow[]> = {};
  for (const e of entities) {
    out[e] = await tableFor(e).where("dirty").equals(1).toArray();
  }
  return entity ? out[entity] : out;
}

/** بعد از push موفق یک ردیف: dirty را پاک کن و updatedAt را با زمانِ سرور جایگزین کن. */
export async function markClean(entity: SyncEntity, id: string, serverUpdatedAt: string): Promise<void> {
  await tableFor(entity).update(id, { dirty: 0, updatedAt: serverUpdatedAt } as any);
}

/**
 * اعمال یک رکورد که از سرور آمده (pull) — Last-Write-Wins:
 * فقط اگر ردیف محلی نداریم، یا زمانِ سرور از updatedAt محلی جدیدتر است،
 * رکورد را می‌نویسیم (و dirty را صفر می‌کنیم، چون این نسخه از سرور آمده).
 * اگر محلی دستکاری نشده (dirty=0) هم باز طبق همین قاعده رفتار می‌کنیم — یک
 * قاعده‌ی یکسان، بدون حالت خاص برای dirty=0.
 */
export async function applyRemote(
  entity: SyncEntity,
  record: SyncRow & Record<string, unknown>,
  editedAt: string,
): Promise<void> {
  const table = tableFor(entity);
  const local = await table.get(record.id);
  if (!local || new Date(editedAt).getTime() > new Date(local.updatedAt).getTime()) {
    await table.put({ ...record, updatedAt: editedAt, dirty: 0 });
  }
}

export const tradeSyncHooks = { getDirty, markClean, applyRemote };
