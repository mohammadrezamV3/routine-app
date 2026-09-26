// قراردادِ «آداپتور»های سینک: هر گروه از جدول‌های محلی (هسته‌ی روتین، ورزش/کالری،
// …) یک آداپتور داره که موتور (syncEngine.ts) بدونِ دونستنِ شکلِ جدول‌ها صداش می‌زنه.
import type { SyncChange } from "@m/lib/api-contract";
import type { TradeSyncChange } from "@m/lib/trade-contract";

export type PendingItem = {
  /** کلیدِ یکتای محلی برای ثبتِ خطای rejected — `${table}:${key}` */
  fk: string;
  /** updatedAtِ ردیف در لحظه‌ی ساختنِ دسته (همون clientUpdatedAt) */
  updatedAt: string;
  change: SyncChange | TradeSyncChange;
  /** ماژولِ پولی‌ای که این تغییر لازم داره (برای رد کردنش وقتی قفله) */
  module?: "EXERCISE" | "CALORIE" | "ROADMAP" | "TRADE";
  /**
   * نتیجه‌ی applied/stale رو اعمال می‌کنه — فقط اگه ردیف از لحظه‌ی snapshot
   * دوباره ویرایش نشده باشه. serverRecord ممکنه null باشه.
   */
  settle(serverRecord: any): Promise<void>;
};

export interface SyncAdapter {
  readonly name: string;
  /** قبل از جمع‌کردن: تعمیرهای محلی (مثلا idهای ناسازگار با سرور) */
  prepare?(): Promise<void>;
  /** ردیف‌های dirty → تغییرِ push */
  collect(): Promise<PendingItem[]>;
  /** اعمالِ یک صفحه‌ی pull (فقط آرایه‌های مربوط به همین آداپتور) */
  applyPull(res: any): Promise<void>;
  /** اولین ورود: همه‌ی ردیف‌های قابلِ سینک dirty بشن تا LWW تصمیم بگیره */
  markAllDirty(): Promise<void>;
}
