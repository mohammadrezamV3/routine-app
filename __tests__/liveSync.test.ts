import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";

// لایه‌ی زنده (lib/liveSync.ts) + مسیرِ optimistic/rollbackِ lib/storage.ts.
// محیط node است؛ یک window حداقلی ساخته می‌شود تا storage مسیرِ «لاگین‌کرده»
// (API) را برود و fetch شبیه‌سازی شود.

const flush = () => new Promise((r) => setTimeout(r, 0));

describe("liveSync — تطبیق کلیدها و دامنه‌ی نوشتن‌ها", () => {
  it("keyMatches پیشوند را در هر دو جهت و * را با همه جور می‌داند", async () => {
    const { keyMatches } = await import("@/lib/liveSync");
    expect(keyMatches("daily", "daily:2026-09-27")).toBe(true);
    expect(keyMatches("daily:2026-09-27", "daily")).toBe(true);
    expect(keyMatches("daily:2026-09-27", "daily:2026-09-28")).toBe(false);
    expect(keyMatches("trade", "*")).toBe(true);
    expect(keyMatches("mentor", "mentor:messages")).toBe(true);
    expect(keyMatches("customOccurrences", "removedOccurrences")).toBe(false);
  });

  it("domainsForMutation مسیرهای API را به دامنه‌ی درست می‌برد و settings/daily را به storage می‌سپارد", async () => {
    const { domainsForMutation } = await import("@/lib/liveSync");
    expect(domainsForMutation("/api/mentorships/abc/messages")).toEqual(["mentor:messages"]);
    expect(domainsForMutation("/api/mentorships/abc")).toEqual(["mentor:mentorship"]);
    expect(domainsForMutation("/api/mentor-programs/x/logs")).toContain("mentor:program");
    expect(domainsForMutation("/api/mentor/dashboard")).toEqual(["mentor"]);
    expect(domainsForMutation("/api/mentors/me")).toEqual([]);
    expect(domainsForMutation("/api/trade/entries")).toEqual(["trade"]);
    expect(domainsForMutation("/api/calorie/log")).toEqual(["calorie"]);
    expect(domainsForMutation("/api/roadmaps/abc/progress")).toEqual(["roadmaps"]);
    expect(domainsForMutation("/api/settings/theme")).toEqual([]);
    expect(domainsForMutation("/api/tasks/daily")).toEqual([]);
  });

  it("چند publish در یک tick = یک فراخوانی؛ remote فقط برای تغییرِ بیرونی", async () => {
    const { subscribe, publishLocal, invalidate } = await import("@/lib/liveSync");
    const calls: { keys: string[]; remote: boolean }[] = [];
    const off = subscribe(["daily"], (keys, meta) => calls.push({ keys, remote: meta.remote }));
    publishLocal("daily:2026-01-01");
    publishLocal("daily:2026-01-02");
    publishLocal("trade");
    await flush();
    expect(calls).toEqual([{ keys: ["daily:2026-01-01", "daily:2026-01-02"], remote: false }]);
    invalidate("daily");
    await flush();
    expect(calls[1]).toEqual({ keys: ["daily"], remote: true });
    off();
    publishLocal("daily");
    await flush();
    expect(calls.length).toBe(2);
  });
});

describe("storage — optimistic + rollback روی باسِ زنده", () => {
  const g = globalThis as any;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeAll(() => {
    const store = new Map<string, string>();
    g.window = {
      localStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => void store.set(k, v),
        removeItem: (k: string) => void store.delete(k),
        key: () => null,
        length: 0,
      },
      location: { href: "http://localhost/", origin: "http://localhost", protocol: "http:" },
      addEventListener: () => {},
    };
    g.document = { addEventListener: () => {}, visibilityState: "visible" };
    fetchMock = vi.fn();
    g.fetch = fetchMock;
  });
  afterAll(() => {
    delete g.window;
    delete g.document;
    delete g.fetch;
  });

  it("setDaily همان لحظه خوانده/اعلام می‌شود، و با شکستِ سرور برمی‌گردد و خطا می‌دهد", async () => {
    vi.resetModules();
    const live = await import("@/lib/liveSync");
    const storage = await import("@/lib/storage");
    storage.publishSessionState(true);

    const events: string[][] = [];
    const errors: string[] = [];
    live.subscribe("daily", (k) => events.push(k));
    live.subscribeLiveErrors((m) => errors.push(m));

    // سرور: GET روز → خالی؛ POST → کند و در نهایت ۵۰۰
    let rejectPost!: (v: any) => void;
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "POST") return new Promise((res) => { rejectPost = res; });
      return Promise.resolve({ ok: true, json: async () => ({ tasks: {}, wake: null }) });
    });

    const rec = { tasks: { a: true }, wake: null };
    const writing = storage.setDaily("2026-09-27", rec);
    await flush();
    // هنوز جوابِ سرور نیامده، ولی خواندن مقدارِ تازه را می‌دهد و مشترک خبر گرفته
    expect(await storage.getDaily("2026-09-27")).toEqual(rec);
    expect((await storage.getDailyRange("2026-09-20", "2026-09-30"))["2026-09-27"]).toEqual(rec);
    expect(events.length).toBe(1);

    rejectPost({ ok: false, status: 500, json: async () => ({}) });
    await writing;
    await flush();
    // rollback: خواندن دوباره از سرور (خالی)، اعلانِ دوباره، پیامِ خطا
    expect(await storage.getDaily("2026-09-27")).toEqual({ tasks: {}, wake: null });
    expect(events.length).toBe(2);
    expect(errors.length).toBe(1);
  });

  it("setSetting موفق: write-through و خواندنِ بعدی بدون درخواستِ تازه", async () => {
    vi.resetModules();
    const storage = await import("@/lib/storage");
    storage.publishSessionState(true);
    fetchMock.mockReset();
    fetchMock.mockImplementation((_url: string, init?: RequestInit) =>
      Promise.resolve(init?.method === "POST"
        ? { ok: true, json: async () => ({ ok: true }) }
        : { ok: true, json: async () => ({ value: ["stale"] }) })
    );
    await storage.setSetting("outingDates", ["2026-09-27"]);
    const before = fetchMock.mock.calls.length;
    expect(await storage.getSetting("outingDates", [])).toEqual(["2026-09-27"]);
    expect(fetchMock.mock.calls.length).toBe(before);
  });
});
