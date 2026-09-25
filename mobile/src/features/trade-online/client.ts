// کلاینتِ خالصِ /api/mobile/trade-online/* روی ApiClientِ مشترک (بدونِ React
// و بدونِ SyncProvider — تست‌پذیر). هوکِ useTradeOnlineApi در ./api.ts.
import { ApiClient, ApiError } from "@/sync/apiClient";
import type {
  EconomicCalendarResponse,
  MarketPricesResponse,
  MarketQuote,
  MarketWatchlistResponse,
  MtAccountsResponse,
  MtAccountStatus,
  MtCodeResponse,
  MtLinkDto,
  MtLinkResponse,
  MtPlatform,
} from "@/lib/trade-online-contract";
import { MARKET_MAX_SYMBOLS_PER_REQUEST, MT_EA_FILES } from "@/lib/trade-online-contract";

/** status=0 یعنی شبکه/timeout/پیکربندی‌نشده؛ code = متنِ error سرور یا نوعِ خطای کلاینت */
export class TradeOnlineError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string) {
    super(code || `http ${status}`);
    this.name = "TradeOnlineError";
    this.status = status;
    this.code = code;
  }
}

export type CalendarQuery = { from: string; to: string; tz: number };

export type TradeOnlineApi = {
  /** وارد شده و سرور تنظیم شده — وگرنه هر فراخوانی TradeOnlineError(401) می‌ده */
  available: boolean;
  calendar(q: CalendarQuery): Promise<EconomicCalendarResponse>;
  /** بیش از ۱۰ نماد تکه‌تکه فرستاده می‌شه */
  prices(symbols: string[]): Promise<MarketQuote[]>;
  getWatchlist(): Promise<MarketWatchlistResponse>;
  setWatchlist(symbols: string[]): Promise<MarketWatchlistResponse>;
  mtAccounts(): Promise<MtAccountStatus[]>;
  mtLink(accountId: string): Promise<MtLinkDto | null>;
  /** کدِ اتصال فقط در همین پاسخ هست — هیچ‌جا ذخیره‌اش نکن */
  mtCreateCode(accountId: string, platform: MtPlatform): Promise<MtCodeResponse>;
  mtRevoke(accountId: string): Promise<void>;
  /** آدرسِ کاملِ دانلودِ فایلِ اکسپرت (یا null وقتی سرور تنظیم نشده) */
  eaDownloadUrl(platform: MtPlatform): string | null;
};

function toError(err: unknown): TradeOnlineError {
  if (err instanceof TradeOnlineError) return err;
  if (err instanceof ApiError) {
    if (err.kind === "session_expired") return new TradeOnlineError(401, "unauthorized");
    if (err.kind === "http") return new TradeOnlineError(err.status, err.serverMessage ?? "");
    return new TradeOnlineError(0, err.kind);
  }
  return new TradeOnlineError(0, "unknown");
}

export function makeTradeOnlineApi(api: ApiClient | null): TradeOnlineApi {
  const available = !!api && !!api.baseUrl && api.tokens.isLoggedIn();

  async function call<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
    try {
      if (!api || !api.baseUrl || !api.tokens.isLoggedIn()) throw new TradeOnlineError(401, "unauthorized");
      const res = await api.authedRaw(method, path, body);
      const json = await ApiClient.readJson(res);
      if (!res.ok) throw new TradeOnlineError(res.status, typeof json?.error === "string" ? json.error : "");
      return json as T;
    } catch (err) {
      throw toError(err);
    }
  }

  return {
    available,
    calendar(q) {
      const qs = new URLSearchParams({ from: q.from, to: q.to, tz: String(q.tz) });
      return call<EconomicCalendarResponse>("GET", `/api/mobile/trade-online/calendar?${qs}`);
    },
    async prices(symbols) {
      const out: MarketQuote[] = [];
      for (let i = 0; i < symbols.length; i += MARKET_MAX_SYMBOLS_PER_REQUEST) {
        const chunk = symbols.slice(i, i + MARKET_MAX_SYMBOLS_PER_REQUEST);
        const qs = chunk.map(encodeURIComponent).join(",");
        const r = await call<MarketPricesResponse>("GET", `/api/mobile/trade-online/market/prices?symbols=${qs}`);
        out.push(...(Array.isArray(r?.quotes) ? r.quotes : []));
      }
      return out;
    },
    getWatchlist() {
      return call<MarketWatchlistResponse>("GET", "/api/mobile/trade-online/market/watchlist");
    },
    setWatchlist(symbols) {
      return call<MarketWatchlistResponse>("POST", "/api/mobile/trade-online/market/watchlist", { symbols });
    },
    async mtAccounts() {
      const r = await call<MtAccountsResponse>("GET", "/api/mobile/trade-online/metatrader");
      return Array.isArray(r?.accounts) ? r.accounts : [];
    },
    async mtLink(accountId) {
      const r = await call<MtLinkResponse>("GET", `/api/mobile/trade-online/metatrader?accountId=${encodeURIComponent(accountId)}`);
      return r?.link ?? null;
    },
    mtCreateCode(accountId, platform) {
      return call<MtCodeResponse>("POST", "/api/mobile/trade-online/metatrader/code", { accountId, platform });
    },
    async mtRevoke(accountId) {
      await call("POST", "/api/mobile/trade-online/metatrader/revoke", { accountId });
    },
    eaDownloadUrl(platform) {
      return api?.baseUrl ? api.baseUrl + MT_EA_FILES[platform].path : null;
    },
  };
}

// ─── پیامِ فارسیِ خطا ────────────────────────────────────────────────────

export const OFFLINE_MESSAGE = "برای این بخش نیاز به اینترنت داری";

export function isModuleLockedError(err: unknown): boolean {
  return err instanceof TradeOnlineError && err.status === 403;
}

export function describeTradeOnlineError(err: unknown): string {
  if (err instanceof TradeOnlineError) {
    switch (err.status) {
      case 0:
        return err.code === "timeout" ? "سرور دیر جواب داد — دوباره امتحان کن" : OFFLINE_MESSAGE;
      case 401:
        return "برای این بخش باید وارد حسابت بشی";
      case 403:
        return "این بخش در پلن شما فعال نیست";
      case 404:
        return "این حساب روی سرور پیدا نشد — اگه تازه ساختیش، اول همگام‌سازی کن";
      case 429:
        return "تعداد درخواست‌ها زیاد بود — کمی بعد دوباره امتحان کن";
      case 400:
        return err.code || "ورودی نامعتبره";
      default:
        return "مشکلی پیش اومد — دوباره امتحان کن";
    }
  }
  return "مشکلی پیش اومد — دوباره امتحان کن";
}
