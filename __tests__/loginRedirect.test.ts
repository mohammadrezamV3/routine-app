import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// lib/loginRedirect.ts — بعد از ورود موفق: کش‌های حالت مهمان پاک، لایه‌ی داده
// «واردشده»، کوکی راهنما ست، کلید منتور با سقف زمانی، و ناوبری *کامل* با replace
// (نه router.push که layout و کش روتر حالت مهمان رو نگه می‌داشت).

const calls: string[] = [];
let primeImpl: () => Promise<void> = async () => {};

vi.mock("@/lib/storage", () => ({
  invalidateStorageCache: () => calls.push("invalidateStorage"),
  publishSessionState: (v: boolean) => calls.push(`publishSession:${v}`),
}));
vi.mock("@/lib/accountCache", () => ({ invalidateAccountCache: () => calls.push("invalidateAccount") }));
vi.mock("@/lib/useFeatures", () => ({ invalidateFeatures: () => calls.push("invalidateFeatures") }));
vi.mock("@/lib/preload", () => ({ setAuthHintCookie: () => calls.push("authHint") }));
vi.mock("@/lib/homePath", () => ({ DEFAULT_HOME: "/dashboard", resolveHomePath: async () => "/weekly" }));
vi.mock("@/lib/e2ee/client", () => ({
  primeE2EEFromPassword: (id: string, pw: string) => {
    calls.push(`prime:${id}:${pw}`);
    return primeImpl();
  },
}));

const replace = vi.fn((to: string) => calls.push(`replace:${to}`));

beforeEach(async () => {
  calls.length = 0;
  replace.mockClear();
  primeImpl = async () => {};
  const attrs = new Map<string, string>();
  vi.stubGlobal("window", { location: { replace } });
  vi.stubGlobal("document", {
    documentElement: {
      setAttribute: (k: string, v: string) => attrs.set(k, v),
      removeAttribute: (k: string) => attrs.delete(k),
      hasAttribute: (k: string) => attrs.has(k),
    },
  });
  const mod = await import("@/lib/loginRedirect");
  mod.__resetLoginRedirectForTests();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("loginAndRedirect", () => {
  it("کش‌ها را قبل از ناوبری کامل پاک می‌کند و با replace به صفحه‌ی اصلی می‌رود", async () => {
    const { loginAndRedirect } = await import("@/lib/loginRedirect");
    await loginAndRedirect({ userId: "u1", password: "pw" });
    expect(replace).toHaveBeenCalledWith("/weekly");
    const at = (s: string) => calls.indexOf(s);
    for (const s of ["invalidateStorage", "invalidateAccount", "invalidateFeatures", "publishSession:true", "authHint", "prime:u1:pw"]) {
      expect(at(s)).toBeGreaterThanOrEqual(0);
      expect(at(s)).toBeLessThan(at("replace:/weekly"));
    }
    // وضعیت «واردشده» بعد از پاک‌کردن کش اعلام می‌شود، نه قبلش (وگرنه دوباره پاک می‌شد)
    expect(at("publishSession:true")).toBeGreaterThan(at("invalidateStorage"));
  });

  it("بدون رمز (مثلا ورودی که رمز ندارد) کلید منتور را نمی‌سازد", async () => {
    const { loginAndRedirect } = await import("@/lib/loginRedirect");
    await loginAndRedirect({ userId: "u1" });
    expect(calls.some((c) => c.startsWith("prime:"))).toBe(false);
    expect(replace).toHaveBeenCalledTimes(1);
  });

  it("منتظر کامل‌شدن کلید منتور می‌ماند تا ناوبری کامل قطعش نکند", async () => {
    let done!: () => void;
    primeImpl = () => new Promise<void>((r) => { done = r; });
    const { loginAndRedirect } = await import("@/lib/loginRedirect");
    const p = loginAndRedirect({ userId: "u1", password: "pw" });
    await new Promise((r) => setTimeout(r, 20));
    expect(replace).not.toHaveBeenCalled();
    done();
    await p;
    expect(replace).toHaveBeenCalledWith("/weekly");
  });

  it("کلید منتور گیر کند، ورود بعد از سقف زمانی باز هم ناوبری می‌کند", async () => {
    vi.useFakeTimers();
    primeImpl = () => new Promise<void>(() => {});
    const { loginAndRedirect, E2EE_PRIME_WAIT_MS } = await import("@/lib/loginRedirect");
    const p = loginAndRedirect({ userId: "u1", password: "pw" });
    await vi.advanceTimersByTimeAsync(E2EE_PRIME_WAIT_MS + 10);
    await p;
    expect(replace).toHaveBeenCalledWith("/weekly");
  });

  it("کلیک دوباره ورود دوم را شروع نمی‌کند", async () => {
    const { loginAndRedirect } = await import("@/lib/loginRedirect");
    await Promise.all([loginAndRedirect({ userId: "u1" }), loginAndRedirect({ userId: "u1" })]);
    expect(replace).toHaveBeenCalledTimes(1);
  });
});
