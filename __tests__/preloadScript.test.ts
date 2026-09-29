import { describe, it, expect, vi, afterEach } from "vitest";
import { PRELOAD_SCRIPT, PRELOAD_BOOTSTRAP_KEY, AUTH_HINT_COOKIE } from "@/lib/preload";

// اسکریپتِ inline ِ layout رو در یک window ِ ساختگی اجرا می‌کنه و promise ِ
// bootstrap رو برمی‌گردونه. درخواستِ آویزون (سرور وسطِ ری‌استارت) نباید همه‌ی
// صفحه رو تا ابد روی «در حال بارگذاری» نگه داره.
function runScript(fetchImpl: (url: string, init: any) => Promise<any>) {
  const win: any = { AbortController };
  const doc = { cookie: `${AUTH_HINT_COOKIE}=1`, getElementById: () => null };
  const fn = new Function("window", "document", "location", "fetch", "setTimeout", "clearTimeout", PRELOAD_SCRIPT);
  fn(win, doc, { pathname: "/weekly" }, fetchImpl, setTimeout, clearTimeout);
  return win.__arionPreload[PRELOAD_BOOTSTRAP_KEY].data as Promise<any>;
}

const hang = (_u: string, init: any) =>
  new Promise((_, reject) => init.signal.addEventListener("abort", () => reject(new Error("aborted"))));
const json = (status: number, body: unknown) => Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) });

afterEach(() => { vi.useRealTimers(); });

describe("PRELOAD_SCRIPT", () => {
  it("درخواستِ آویزون بعد از سقفِ زمانی و یک تلاشِ دوباره null می‌ده، نه آویزونِ ابدی", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn(hang);
    const data = runScript(fetchMock);
    await vi.advanceTimersByTimeAsync(30_000);
    await expect(data).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("۵۰۳ ِ گذرا (ری‌استارت) یک بار دوباره تلاش می‌کنه و داده رو می‌گیره", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockImplementationOnce(() => json(503, null)).mockImplementationOnce(() => json(200, { ok: 1 }));
    const data = runScript(fetchMock);
    await vi.advanceTimersByTimeAsync(5_000);
    await expect(data).resolves.toEqual({ ok: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("۴۰۱ قطعی‌ه: بی‌تکرار null", async () => {
    const fetchMock = vi.fn(() => json(401, null));
    await expect(runScript(fetchMock)).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
