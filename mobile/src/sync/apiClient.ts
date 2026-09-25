// کلاینتِ HTTP برای /api/mobile/* — Bearer، timeout، و refreshِ single-flight.
//
// نکته‌ی حیاتی: refreshToken یک‌بارمصرفه و سرور «استفاده‌ی دوباره از توکنِ
// قدیمی» رو نشانه‌ی سرقت می‌گیره و *کلِ نشست* رو باطل می‌کنه. پس هر تعداد
// درخواستِ هم‌زمان که 401 بگیرن، فقط و فقط یک درخواستِ refresh می‌ره (یک
// promiseِ مشترک) و بقیه منتظرِ همون می‌مونن.
//
// هیچ توکنی هیچ‌وقت لاگ نمی‌شه — پیامِ خطاها فقط status و متنِ خطای سرورن.
import type {
  MobileAuthSuccess,
  MobileLoginRequest,
  MobileLoginResponse,
  MobileUser,
  MobileVerify2faRequest,
} from "@/lib/api-contract";
import { ACCESS_TOKEN_SKEW_MS, REQUEST_TIMEOUT_MS } from "./config";
import { TokenStore } from "./tokenStore";

export type ApiErrorKind = "http" | "network" | "timeout" | "session_expired" | "not_configured";

export class ApiError extends Error {
  constructor(
    public kind: ApiErrorKind,
    public status: number,
    /** متنِ خطای سرور (فارسی) اگه بود */
    public serverMessage: string | null = null
  ) {
    super(serverMessage || `${kind}${status ? ` ${status}` : ""}`);
    this.name = "ApiError";
  }
}

export type AuthEvent =
  | { type: "login"; user: MobileUser }
  | { type: "logout" }
  /** نشست سمتِ سرور باطل/منقضی شد — خروجِ محلی انجام شد، دیتای محلی دست‌نخورده */
  | { type: "expired" }
  | { type: "user"; user: MobileUser };

export type Login2faRequired = { requires2fa: true; phoneHint: string };

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export type ApiClientOptions = {
  baseUrl: string;
  tokens: TokenStore;
  fetch?: FetchLike;
  timeoutMs?: number;
  now?: () => number;
};

export class ApiClient {
  private refreshing: Promise<string> | null = null;
  private listeners = new Set<(e: AuthEvent) => void>();
  private fetchImpl: FetchLike;
  private timeoutMs: number;
  private now: () => number;
  readonly tokens: TokenStore;
  readonly baseUrl: string;

  constructor(opts: ApiClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/+$/, "");
    this.tokens = opts.tokens;
    this.fetchImpl = opts.fetch ?? ((input, init) => fetch(input, init));
    this.timeoutMs = opts.timeoutMs ?? REQUEST_TIMEOUT_MS;
    this.now = opts.now ?? Date.now;
  }

  onAuthEvent(listener: (e: AuthEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(e: AuthEvent) {
    for (const l of this.listeners) {
      try {
        l(e);
      } catch {
        /* شنونده‌ی خراب نباید کلاینت رو بشکنه */
      }
    }
  }

  // ─── پایه ────────────────────────────────────────────────────────────

  private async raw(
    method: string,
    path: string,
    body: unknown,
    bearer: string | null,
    timeoutMs = this.timeoutMs,
    extraHeaders?: Record<string, string>
  ): Promise<Response> {
    if (!this.baseUrl) throw new ApiError("not_configured", 0);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    const headers: Record<string, string> = { Accept: "application/json" };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (extraHeaders) Object.assign(headers, extraHeaders);
    if (bearer) headers.Authorization = `Bearer ${bearer}`;
    try {
      return await this.fetchImpl(this.baseUrl + path, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: ctrl.signal,
        credentials: "omit",
        cache: "no-store",
      });
    } catch (err: any) {
      if (ctrl.signal.aborted || err?.name === "AbortError") throw new ApiError("timeout", 0);
      throw new ApiError("network", 0);
    } finally {
      clearTimeout(timer);
    }
  }

  static async readJson(res: Response): Promise<any> {
    try {
      return await res.json();
    } catch {
      return null;
    }
  }

  private static async fail(res: Response): Promise<never> {
    throw await ApiClient.errorFrom(res);
  }

  // ─── refresh (single-flight) ─────────────────────────────────────────

  /**
   * یک accessTokenِ معتبر برمی‌گردونه — با refresh اگه لازم باشه. هر فراخوانیِ
   * هم‌زمان همون promise رو می‌گیره. `failedToken`: توکنی که همین الان 401
   * گرفته؛ اگه در این فاصله یک refreshِ دیگه توکنِ تازه‌ای آورده، دوباره
   * refresh نمی‌کنیم و همون تازه رو برمی‌گردونیم.
   */
  refreshAccessToken(failedToken?: string): Promise<string> {
    if (this.refreshing) return this.refreshing;
    const current = this.tokens.getAccessToken(0, this.now());
    if (failedToken !== undefined && current && current !== failedToken) return Promise.resolve(current);

    this.refreshing = (async () => {
      const rt = this.tokens.getRefreshToken();
      if (!rt) {
        await this.expireSession();
        throw new ApiError("session_expired", 401);
      }
      const res = await this.raw("POST", "/api/mobile/auth/refresh", { refreshToken: rt }, null);
      if (res.status === 401) {
        await this.expireSession();
        throw new ApiError("session_expired", 401);
      }
      if (!res.ok) await ApiClient.fail(res);
      const data = (await ApiClient.readJson(res)) as MobileAuthSuccess | null;
      if (!data?.accessToken || !data.refreshToken) throw new ApiError("http", res.status);
      // اول ذخیره‌ی refreshTokenِ جدید — توکنِ قبلی از همین لحظه باطله
      await this.tokens.setSession(data, this.now());
      this.emit({ type: "user", user: data.user });
      return data.accessToken;
    })().finally(() => {
      this.refreshing = null;
    });
    return this.refreshing;
  }

  private async expireSession(): Promise<void> {
    const wasLoggedIn = this.tokens.isLoggedIn();
    await this.tokens.clear();
    if (wasLoggedIn) this.emit({ type: "expired" });
  }

  // ─── درخواستِ احرازشده ───────────────────────────────────────────────

  /**
   * درخواستِ Bearer؛ روی 401 یک‌بار refresh و تکرار. خطای 401ِ دوم = نشست باطل.
   * Responseِ خام رو برمی‌گردونه (برای 304/ETag) — وضعیت‌های غیرِ ok رو خودت چک کن.
   */
  async authedRaw(
    method: "GET" | "POST",
    path: string,
    body?: unknown,
    opts: { headers?: Record<string, string>; timeoutMs?: number } = {}
  ): Promise<Response> {
    if (!this.tokens.isLoggedIn()) throw new ApiError("session_expired", 401);
    let token = this.tokens.getAccessToken(ACCESS_TOKEN_SKEW_MS, this.now()) ?? (await this.refreshAccessToken());
    let res = await this.raw(method, path, body, token, opts.timeoutMs, opts.headers);
    if (res.status === 401) {
      this.tokens.invalidateAccessToken(token);
      token = await this.refreshAccessToken(token);
      res = await this.raw(method, path, body, token, opts.timeoutMs, opts.headers);
      if (res.status === 401) {
        // توکنِ تازه هم رد شد (کاربر مسدود/حذف) — خروجِ محلی
        await this.expireSession();
        throw new ApiError("session_expired", 401);
      }
    }
    return res;
  }

  /** مثلِ authedRaw ولی JSON برمی‌گردونه و غیرِ ok رو ApiError می‌کنه */
  async authed<T>(method: "GET" | "POST", path: string, body?: unknown, opts: { timeoutMs?: number } = {}): Promise<T> {
    const res = await this.authedRaw(method, path, body, opts);
    if (!res.ok) await ApiClient.fail(res);
    return (await ApiClient.readJson(res)) as T;
  }

  static async errorFrom(res: Response): Promise<ApiError> {
    const j = await ApiClient.readJson(res);
    return new ApiError("http", res.status, typeof j?.error === "string" ? j.error : typeof j?.message === "string" ? j.message : null);
  }

  // ─── auth ────────────────────────────────────────────────────────────

  async login(req: MobileLoginRequest): Promise<MobileAuthSuccess | Login2faRequired> {
    const res = await this.raw("POST", "/api/mobile/auth/login", req, null);
    if (!res.ok) await ApiClient.fail(res);
    const data = (await ApiClient.readJson(res)) as MobileLoginResponse | null;
    if (!data) throw new ApiError("http", res.status);
    if ("requires2fa" in data && data.requires2fa) return data;
    const ok = data as MobileAuthSuccess;
    await this.tokens.setSession(ok, this.now());
    this.emit({ type: "login", user: ok.user });
    return ok;
  }

  async verify2fa(req: MobileVerify2faRequest): Promise<MobileAuthSuccess> {
    const res = await this.raw("POST", "/api/mobile/auth/verify-2fa", req, null);
    if (!res.ok) await ApiClient.fail(res);
    const data = (await ApiClient.readJson(res)) as MobileAuthSuccess | null;
    if (!data?.accessToken) throw new ApiError("http", res.status);
    await this.tokens.setSession(data, this.now());
    this.emit({ type: "login", user: data.user });
    return data;
  }

  /** خروج: باطل‌کردنِ نشست روی سرور (best-effort، ۵ ثانیه) و بعد پاک‌کردنِ توکن‌های محلی — همیشه موفق */
  async logout(): Promise<void> {
    // اگه refresh در جریانه صبر کن تا توکنِ نهایی رو باطل کنیم، نه قبلی رو
    if (this.refreshing) await this.refreshing.catch(() => undefined);
    const rt = this.tokens.getRefreshToken();
    const at = this.tokens.getAccessToken(0, this.now());
    if (rt && this.baseUrl) {
      try {
        await this.raw("POST", "/api/mobile/auth/logout", { refreshToken: rt }, at, 5_000);
      } catch {
        /* آفلاین — نشست خودش منقضی می‌شه */
      }
    }
    await this.tokens.clear();
    this.emit({ type: "logout" });
  }
}
