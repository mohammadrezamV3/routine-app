// موتورِ همگام‌سازیِ آفلاین‌فرست: push ِ ردیف‌های dirty، بعد pull با cursor.
//
// قرارداد (mobile/src/lib/api-contract.ts + lib/mobileSync.ts سرور):
//   • هر تغییر clientUpdatedAt = updatedAtِ محلیِ ردیف (زمانِ ویرایش روی گوشی).
//   • سرور با LWW تصمیم می‌گیره: applied (نوشته شد) | stale (سرور جدیدتر/مساوی
//     بود) | rejected (ورودی نامعتبر). در دو حالتِ اول serverRecord نسخه‌ی
//     نهاییه و جایگزینِ محلی می‌شه — *فقط اگه* ردیف از لحظه‌ی ساختنِ دسته
//     دوباره ویرایش نشده باشه (وگرنه dirty می‌مونه تا دورِ بعد).
//   • rejected: ردیف محلی می‌مونه (dirty) ولی تا وقتی کاربر دوباره ویرایشش
//     نکرده (updatedAt عوض نشده) دوباره فرستاده نمی‌شه — حلقه‌ی بی‌پایان نداریم.
//   • pull: با cursorِ ذخیره‌شده، تا وقتی hasMore؛ هر رکورد با applyRemote (LWW).
//   • هر اجرا single-flight: درخواستِ هم‌زمان منتظرِ همون اجرا می‌مونه و اگه
//     وسطش درخواستِ تازه اومد، یک دورِ دیگه پشتِ سرش اجرا می‌شه.
import {
  MOBILE_SYNC_MAX_BATCH,
  type SyncChange,
  type SyncPullResponse,
  type SyncPushResponse,
  type SyncServerRecord,
} from "@/lib/api-contract";
import { newId } from "@/db/db";
import {
  applyRemote,
  EntityName,
  getDirty,
  markAllDirty,
  rekeyTask,
  settlePushed,
  wipeAll,
} from "@/db/syncHooks";
import { ApiClient, ApiError } from "./apiClient";
import { getJson, KV, setJson } from "./kv";
import {
  isValidClientId,
  localKey,
  remoteDaily,
  remoteSetting,
  remoteSleep,
  remoteTask,
  toChange,
} from "./mappers";

export type SyncStatus = "idle" | "syncing" | "error" | "offline";

export type SyncState = {
  status: SyncStatus;
  lastSyncAt: string | null;
  /** پیامِ فارسیِ آخرین خطا (برای نمایش) */
  error: string | null;
  /** تعدادِ تغییرهایی که سرور رد کرده و تا ویرایشِ بعدی فرستاده نمی‌شن */
  rejectedCount: number;
};

type Failure = { updatedAt: string; error: string };

const K_CURSOR = "arion.sync.cursor";
const K_FAILURES = "arion.sync.failures";
const K_LAST = "arion.sync.lastSyncAt";

/** سقفِ حجمِ بدنه‌ی هر push (سرور ۱MB قبول می‌کنه — حاشیه‌ی امن) */
export const MAX_PUSH_BYTES = 900 * 1024;
/** سقفِ صفحه‌های pull در یک اجرا — محافظ در برابرِ حلقه‌ی بی‌پایان */
const MAX_PULL_PAGES = 200;

const ENTITIES: EntityName[] = ["dailyEntries", "sleepEntries", "tasks", "settings"];

const ENTITY_TO_LOCAL: Record<string, EntityName> = {
  dailyEntry: "dailyEntries",
  sleepEntry: "sleepEntries",
  task: "tasks",
  setting: "settings",
};

function mapRemote(entity: EntityName, rec: SyncServerRecord): any {
  switch (entity) {
    case "dailyEntries":
      return remoteDaily(rec as any);
    case "sleepEntries":
      return remoteSleep(rec as any);
    case "tasks":
      return remoteTask(rec as any);
    case "settings":
      return remoteSetting(rec as any);
  }
}

type PendingItem = { entity: EntityName; key: string; updatedAt: string; change: SyncChange };

const utf8Len = (s: string) => new TextEncoder().encode(s).length;

/** تغییرها → دسته‌هایی با حداکثر ۲۰۰ مورد و MAX_PUSH_BYTES */
export function makeBatches(items: PendingItem[], maxCount = MOBILE_SYNC_MAX_BATCH, maxBytes = MAX_PUSH_BYTES): PendingItem[][] {
  const out: PendingItem[][] = [];
  let cur: PendingItem[] = [];
  let bytes = 16; // {"changes":[]}
  for (const it of items) {
    const size = utf8Len(JSON.stringify(it.change)) + 1;
    if (cur.length > 0 && (cur.length >= maxCount || bytes + size > maxBytes)) {
      out.push(cur);
      cur = [];
      bytes = 16;
    }
    cur.push(it);
    bytes += size;
  }
  if (cur.length) out.push(cur);
  return out;
}

export function describeError(err: unknown): string {
  if (err instanceof ApiError) {
    switch (err.kind) {
      case "network":
        return "اتصال به سرور برقرار نشد";
      case "timeout":
        return "سرور دیر جواب داد — دوباره امتحان کن";
      case "session_expired":
        return "نشست منقضی شده — دوباره وارد شو";
      case "not_configured":
        return "اتصال به سرور پیکربندی نشده";
      default:
        if (err.status === 429) return "تعداد درخواست‌ها زیاد بود — کمی بعد دوباره امتحان کن";
        if (err.status >= 500) return "خطای سرور — بعدا دوباره امتحان می‌کنیم";
        return err.serverMessage || "همگام‌سازی ناموفق بود";
    }
  }
  return "همگام‌سازی ناموفق بود";
}

export class SyncEngine {
  private running: Promise<void> | null = null;
  private rerun = false;
  private listeners = new Set<(s: SyncState) => void>();
  private state: SyncState = { status: "idle", lastSyncAt: null, error: null, rejectedCount: 0 };
  private online = true;

  constructor(private api: ApiClient, private kv: KV) {}

  async init(): Promise<void> {
    const [last, failures] = await Promise.all([this.kv.get(K_LAST), this.loadFailures()]);
    this.setState({ lastSyncAt: last, rejectedCount: Object.keys(failures).length });
  }

  getState(): SyncState {
    return this.state;
  }

  subscribe(l: (s: SyncState) => void): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  private setState(patch: Partial<SyncState>) {
    this.state = { ...this.state, ...patch };
    for (const l of this.listeners) l(this.state);
  }

  setOnline(online: boolean) {
    this.online = online;
    if (!online && this.state.status !== "syncing") this.setState({ status: "offline" });
    else if (online && this.state.status === "offline") this.setState({ status: "idle" });
  }

  isRunning(): boolean {
    return this.running !== null;
  }

  /** منتظرِ اتمامِ اجرای جاری (اگه هست) — برای خروج/پاک‌کردن */
  async idle(): Promise<void> {
    this.rerun = false;
    while (this.running) await this.running.catch(() => undefined);
  }

  /** single-flight. هیچ‌وقت throw نمی‌کنه — نتیجه در state. */
  sync(): Promise<void> {
    if (this.running) {
      this.rerun = true;
      return this.running;
    }
    if (!this.api.tokens.isLoggedIn()) return Promise.resolve();
    if (!this.online) {
      this.setState({ status: "offline" });
      return Promise.resolve();
    }
    this.running = (async () => {
      this.setState({ status: "syncing", error: null });
      try {
        do {
          this.rerun = false;
          await this.push();
          await this.pull();
        } while (this.rerun && this.api.tokens.isLoggedIn());
        const now = new Date().toISOString();
        await this.kv.set(K_LAST, now);
        this.setState({ status: "idle", lastSyncAt: now, error: null });
      } catch (err) {
        if (err instanceof ApiError && err.kind === "session_expired") {
          this.setState({ status: "idle", error: null });
        } else if (err instanceof ApiError && err.kind === "network" && !this.online) {
          this.setState({ status: "offline", error: null });
        } else {
          this.setState({ status: "error", error: describeError(err) });
        }
      } finally {
        this.running = null;
      }
    })();
    return this.running;
  }

  // ─── push ────────────────────────────────────────────────────────────

  private async loadFailures(): Promise<Record<string, Failure>> {
    return getJson<Record<string, Failure>>(this.kv, K_FAILURES, {});
  }

  /** تسک‌های قدیمی که id‌شون با الگوی سرور جور نیست (نسخه‌ی قبلیِ newId) → id تازه */
  private async fixTaskIds(): Promise<void> {
    const dirty = await getDirty("tasks");
    for (const t of dirty) {
      if (!isValidClientId(t.id)) await rekeyTask(t.id, newId());
    }
  }

  async push(): Promise<void> {
    await this.fixTaskIds();
    const failures = await this.loadFailures();
    const nextFailures: Record<string, Failure> = {};
    const items: PendingItem[] = [];

    for (const entity of ENTITIES) {
      const rows = await getDirty(entity);
      for (const row of rows as any[]) {
        const key = localKey(entity, row);
        const fk = `${entity}:${key}`;
        const f = failures[fk];
        if (f && f.updatedAt === row.updatedAt) {
          nextFailures[fk] = f; // هنوز همون نسخه‌ی ردشده — دوباره نفرست
          continue;
        }
        const change = toChange(entity, row);
        if (!change) continue; // سینک‌نشدنی (کلیدِ تنظیماتِ فقط‌محلی)
        items.push({ entity, key, updatedAt: row.updatedAt, change });
      }
    }

    try {
      for (const batch of makeBatches(items)) {
        const res = await this.api.authed<SyncPushResponse>("POST", "/api/mobile/sync/push", {
          changes: batch.map((b) => b.change),
        });
        for (const r of res?.results ?? []) {
          const item = batch[r.index];
          if (!item) continue;
          const fk = `${item.entity}:${item.key}`;
          if (r.status === "rejected") {
            nextFailures[fk] = { updatedAt: item.updatedAt, error: r.error || "rejected" };
            continue;
          }
          // applied | stale
          const expected = ENTITY_TO_LOCAL[r.entity ?? ""] ?? item.entity;
          const rec = r.serverRecord && expected === item.entity ? mapRemote(item.entity, r.serverRecord) : null;
          if (rec && localKey(item.entity, rec) !== item.key) continue; // پاسخِ ناهمخوان — دست نزن
          await settlePushed(item.entity, item.key, item.updatedAt, rec);
          delete nextFailures[fk];
        }
      }
    } finally {
      await setJson(this.kv, K_FAILURES, nextFailures);
      this.setState({ rejectedCount: Object.keys(nextFailures).length });
    }
  }

  // ─── pull ────────────────────────────────────────────────────────────

  async pull(): Promise<void> {
    let cursor = await this.kv.get(K_CURSOR);
    for (let page = 0; page < MAX_PULL_PAGES; page++) {
      const qs = cursor ? `?since=${encodeURIComponent(cursor)}` : "";
      const res = await this.api.authed<SyncPullResponse>("GET", `/api/mobile/sync/pull${qs}`);
      if (!res || typeof res.cursor !== "string") throw new ApiError("http", 200, "پاسخِ نامعتبر از سرور");
      for (const r of res.dailyEntries ?? []) await applyRemote("dailyEntries", remoteDaily(r));
      for (const r of res.sleepEntries ?? []) await applyRemote("sleepEntries", remoteSleep(r));
      for (const r of res.tasks ?? []) await applyRemote("tasks", remoteTask(r));
      for (const r of res.settings ?? []) await applyRemote("settings", remoteSetting(r));
      // موجودیت‌های فاز ۴ (بدنسازی/کالری) هنوز جدولِ محلی ندارن — نادیده
      cursor = res.cursor;
      await this.kv.set(K_CURSOR, cursor);
      if (!res.hasMore) break;
    }
  }

  // ─── چرخه‌ی ورود/خروج ────────────────────────────────────────────────

  /**
   * بعد از ورودِ موفق: همه‌ی ردیف‌های محلی (از جمله دیتای مهمان) dirty می‌شن
   * و cursor از صفر — اولین سینک همه‌چیز رو push می‌کنه و LWWِ سرور تصمیم
   * می‌گیره؛ هیچ دیتای محلی‌ای گم نمی‌شه.
   */
  async prepareFirstSync(): Promise<void> {
    await this.idle();
    await markAllDirty();
    await Promise.all([this.kv.remove(K_CURSOR), this.kv.remove(K_FAILURES)]);
    this.setState({ rejectedCount: 0, error: null });
  }

  /** بعد از خروج: وضعیتِ سینک پاک می‌شه؛ با wipeLocal دیتای محلی هم. */
  async resetAfterLogout(wipeLocal: boolean): Promise<void> {
    await this.idle();
    await Promise.all([this.kv.remove(K_CURSOR), this.kv.remove(K_FAILURES), this.kv.remove(K_LAST)]);
    if (wipeLocal) await wipeAll();
    this.setState({ status: this.online ? "idle" : "offline", lastSyncAt: null, error: null, rejectedCount: 0 });
  }
}
