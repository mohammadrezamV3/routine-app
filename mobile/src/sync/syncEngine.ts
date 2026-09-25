// موتورِ همگام‌سازیِ آفلاین‌فرست: push ِ ردیف‌های dirty، بعد pull با cursor.
//
// قرارداد (mobile/src/lib/api-contract.ts + trade-contract.ts):
//   • هر تغییر clientUpdatedAt = updatedAtِ محلیِ ردیف (زمانِ ویرایش روی گوشی).
//   • سرور با LWW تصمیم می‌گیره: applied | stale | rejected. در دو حالتِ اول
//     serverRecord نسخه‌ی نهاییه و جایگزینِ محلی می‌شه — *فقط اگه* ردیف از
//     لحظه‌ی ساختنِ دسته دوباره ویرایش نشده باشه (وگرنه dirty می‌مونه).
//   • rejected: ردیف محلی می‌مونه (dirty) ولی تا وقتی کاربر دوباره ویرایشش
//     نکرده (updatedAt عوض نشده) دوباره فرستاده نمی‌شه — حلقه‌ی بی‌پایان نداریم.
//     استثنا: module_locked/busy — اصلا ثبتِ خطا نمی‌شن و بعدا دوباره می‌رن.
//   • pull: با cursorِ ذخیره‌شده، تا وقتی hasMore؛ هر رکورد با LWW.
//   • ماژول‌های قفل (lockedModules): تغییرهاشون push نمی‌شن (صف می‌مونه)؛
//     وقتی از قفل دراومد، یک‌بار pullِ کامل (بدونِ since) — cursor در دورانِ قفل جلو رفته.
//   • دو «کانال»: /api/mobile/sync (هسته + ورزش/کالری + رودمپ) و
//     /api/mobile/trade (ترید) — هر کدوم cursor و آداپتورهای خودش.
//   • هر اجرا single-flight.
import { MOBILE_SYNC_MAX_BATCH } from "@/lib/api-contract";
import type { PendingItem, SyncAdapter } from "./adapter";
import { ApiClient, ApiError } from "./apiClient";
import { getJson, KV, setJson } from "./kv";

export type SyncStatus = "idle" | "syncing" | "error" | "offline";

export type SyncState = {
  status: SyncStatus;
  lastSyncAt: string | null;
  /** پیامِ فارسیِ آخرین خطا (برای نمایش) */
  error: string | null;
  /** تعدادِ تغییرهایی که سرور رد کرده و تا ویرایشِ بعدی فرستاده نمی‌شن */
  rejectedCount: number;
  /** ماژول‌های پولی‌ای که طبقِ آخرین pull قفلن (EXERCISE/CALORIE/ROADMAP/TRADE) */
  lockedModules: string[];
};

type Failure = { updatedAt: string; error: string };

/** یک endpointِ push/pull با آداپتورهاش */
export type SyncChannel = {
  name: string;
  pushPath: string;
  pullPath: string;
  maxBatch: number;
  adapters: SyncAdapter[];
  /** ماژول‌های قفل از پاسخِ pull */
  lockedFrom(res: any): string[];
  /** false یعنی قفل بودنِ ماژول‌های این کانال cursor رو جلو نمی‌بره (re-pull لازم نیست) */
  repullOnUnlock: boolean;
};

const K_CURSOR = (ch: string) => (ch === "main" ? "arion.sync.cursor" : `arion.sync.cursor.${ch}`);
const K_LOCKED = (ch: string) => `arion.sync.locked.${ch}`;
const K_FAILURES = "arion.sync.failures";
const K_LAST = "arion.sync.lastSyncAt";

/** سقفِ حجمِ بدنه‌ی هر push (سرور ۱MB قبول می‌کنه — حاشیه‌ی امن) */
export const MAX_PUSH_BYTES = 900 * 1024;
/** سقفِ صفحه‌های pull در یک اجرا — محافظ در برابرِ حلقه‌ی بی‌پایان */
const MAX_PULL_PAGES = 200;

const utf8Len = (s: string) => new TextEncoder().encode(s).length;

/** تغییرها → دسته‌هایی با حداکثر maxCount مورد و MAX_PUSH_BYTES */
export function makeBatches<T extends { change: unknown }>(items: T[], maxCount = MOBILE_SYNC_MAX_BATCH, maxBytes = MAX_PUSH_BYTES): T[][] {
  const out: T[][] = [];
  let cur: T[] = [];
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

/** رد‌هایی که باید بی‌ثبتِ خطا دوباره فرستاده بشن */
function isRetryableReject(r: { error?: string; code?: string }): boolean {
  return r.error === "module_locked" || r.code === "module_locked" || r.code === "busy";
}

export class SyncEngine {
  private running: Promise<void> | null = null;
  private rerun = false;
  private listeners = new Set<(s: SyncState) => void>();
  private state: SyncState = { status: "idle", lastSyncAt: null, error: null, rejectedCount: 0, lockedModules: [] };
  private online = true;
  /** قفل‌های هر کانال؛ null = هنوز نمی‌دونیم */
  private locked = new Map<string, Set<string> | null>();

  constructor(
    private api: ApiClient,
    private kv: KV,
    private channels: SyncChannel[]
  ) {}

  async init(): Promise<void> {
    const [last, failures] = await Promise.all([this.kv.get(K_LAST), this.loadFailures()]);
    for (const ch of this.channels) {
      const l = await getJson<string[] | null>(this.kv, K_LOCKED(ch.name), null);
      this.locked.set(ch.name, l ? new Set(l) : null);
    }
    this.setState({ lastSyncAt: last, rejectedCount: Object.keys(failures).length, lockedModules: this.allLocked() });
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

  private allLocked(): string[] {
    const out = new Set<string>();
    for (const s of this.locked.values()) s?.forEach((m) => out.add(m));
    return [...out].sort();
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
          for (const ch of this.channels) {
            await this.push(ch);
            await this.pull(ch);
          }
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

  private async setLocked(ch: SyncChannel, mods: Set<string>) {
    this.locked.set(ch.name, mods);
    await setJson(this.kv, K_LOCKED(ch.name), [...mods]);
    this.setState({ lockedModules: this.allLocked() });
  }

  async push(ch: SyncChannel): Promise<void> {
    for (const a of ch.adapters) await a.prepare?.();
    const failures = await this.loadFailures();
    // فقط خطاهای همین کانال رو بازسازی می‌کنیم؛ بقیه دست‌نخورده
    const ownFk = new Set<string>();
    const nextFailures: Record<string, Failure> = { ...failures };
    const locked = this.locked.get(ch.name) ?? null;
    const items: (PendingItem & { key: string })[] = [];

    for (const a of ch.adapters) {
      for (const it of await a.collect()) {
        const key = `${ch.name}/${it.fk}`;
        ownFk.add(key);
        const f = failures[key];
        if (f && f.updatedAt === it.updatedAt) continue; // هنوز همون نسخه‌ی ردشده
        delete nextFailures[key];
        if (it.module && locked?.has(it.module)) continue; // ماژول قفله — صف بمونه
        items.push({ ...it, key });
      }
    }
    // خطای ردیف‌هایی که دیگه dirty نیستن (مثلا از pull اومدن) پاک بشه
    for (const fk of Object.keys(nextFailures)) {
      if (fk.startsWith(`${ch.name}/`) && !ownFk.has(fk)) delete nextFailures[fk];
    }

    try {
      for (const batch of makeBatches(items, ch.maxBatch)) {
        const res = await this.api.authed<{ results?: any[]; moduleLocked?: boolean }>("POST", ch.pushPath, {
          changes: batch.map((b) => b.change),
        });
        const newlyLocked = new Set(locked ?? []);
        for (const r of res?.results ?? []) {
          const item = batch[r.index];
          if (!item) continue;
          if (r.status === "rejected") {
            if (isRetryableReject(r)) {
              if (item.module && (r.error === "module_locked" || r.code === "module_locked")) newlyLocked.add(item.module);
              continue;
            }
            nextFailures[item.key] = { updatedAt: item.updatedAt, error: r.code || r.error || "rejected" };
            continue;
          }
          await item.settle(r.serverRecord ?? null);
          delete nextFailures[item.key];
        }
        if (newlyLocked.size !== (locked?.size ?? 0)) await this.setLocked(ch, newlyLocked);
      }
    } finally {
      await setJson(this.kv, K_FAILURES, nextFailures);
      this.setState({ rejectedCount: Object.keys(nextFailures).length });
    }
  }

  // ─── pull ────────────────────────────────────────────────────────────

  async pull(ch: SyncChannel): Promise<void> {
    let cursor: string | null = await this.kv.get(K_CURSOR(ch.name));
    let repulled = false;
    for (let page = 0; page < MAX_PULL_PAGES; page++) {
      const qs = cursor ? `?since=${encodeURIComponent(cursor)}` : "";
      const res = await this.api.authed<any>("GET", `${ch.pullPath}${qs}`);
      if (!res || typeof res !== "object") throw new ApiError("http", 200, "پاسخِ نامعتبر از سرور");

      // قفل/بازشدنِ ماژول‌ها
      const prev = this.locked.get(ch.name) ?? null;
      const now = new Set(ch.lockedFrom(res));
      const unlocked = prev ? [...prev].filter((m) => !now.has(m)) : [];
      if (!prev || unlocked.length || [...now].some((m) => !prev.has(m))) await this.setLocked(ch, now);

      for (const a of ch.adapters) await a.applyPull(res);

      if (typeof res.cursor === "string") {
        const next: string = res.cursor;
        cursor = next;
        await this.kv.set(K_CURSOR(ch.name), next);
      }

      if (ch.repullOnUnlock && unlocked.length && !repulled && cursor) {
        // ماژولی باز شد — یک‌بار از صفر، تا رکوردهای دورانِ قفل هم بیان
        repulled = true;
        cursor = null;
        await this.kv.remove(K_CURSOR(ch.name));
        continue;
      }
      if (!res.hasMore) break;
    }
  }

  // ─── چرخه‌ی ورود/خروج ────────────────────────────────────────────────

  private async clearSyncMeta(): Promise<void> {
    await Promise.all([
      this.kv.remove(K_FAILURES),
      ...this.channels.flatMap((ch) => [this.kv.remove(K_CURSOR(ch.name)), this.kv.remove(K_LOCKED(ch.name))]),
    ]);
    for (const ch of this.channels) this.locked.set(ch.name, null);
  }

  /**
   * بعد از ورودِ موفق: همه‌ی ردیف‌های محلی (از جمله دیتای مهمان) dirty می‌شن
   * و cursorها از صفر — اولین سینک همه‌چیز رو push می‌کنه و LWWِ سرور تصمیم
   * می‌گیره؛ هیچ دیتای محلی‌ای گم نمی‌شه.
   */
  async prepareFirstSync(): Promise<void> {
    await this.idle();
    for (const ch of this.channels) for (const a of ch.adapters) await a.markAllDirty();
    await this.clearSyncMeta();
    this.setState({ rejectedCount: 0, error: null, lockedModules: [] });
  }

  /** بعدِ پاک‌کردنِ دیتای محلی (کاربرِ واردشده): pullِ کامل تا دیتای سرور برگرده */
  async resetCursors(): Promise<void> {
    await this.idle();
    await this.clearSyncMeta();
    this.setState({ rejectedCount: 0, lockedModules: [] });
  }

  /** بعد از خروج: وضعیتِ سینک پاک می‌شه؛ با wipe دیتای محلی هم (تابعِ تزریقی) */
  async resetAfterLogout(wipe?: () => Promise<void>): Promise<void> {
    await this.idle();
    await this.clearSyncMeta();
    await this.kv.remove(K_LAST);
    if (wipe) await wipe();
    this.setState({ status: this.online ? "idle" : "offline", lastSyncAt: null, error: null, rejectedCount: 0, lockedModules: [] });
  }
}
