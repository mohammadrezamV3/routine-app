import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

let currentUserId = "voice-test-user";
vi.mock("@/lib/moduleAccess", () => ({
  requireModule: vi.fn(async () => ({ ok: true, userId: currentUserId, isSuperAdmin: false })),
}));
vi.mock("@/lib/errorLog", () => ({ logError: vi.fn() }));

import { POST } from "@/app/api/routine/assistant/voice/route";

function upload(body: BodyInit | null, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest("http://localhost/api/routine/assistant/voice", {
    method: "POST", body, headers,
  });
}

function audioForm(bytes: number, type = "audio/webm"): FormData {
  const fd = new FormData();
  fd.append("audio", new File([new Uint8Array(bytes)], "voice.webm", { type }));
  return fd;
}

// هر تست کاربرِ خودش را دارد تا سقفِ نرخ (۲۰ در ۱۰ دقیقه) بینشان نشت نکند
beforeEach(() => {
  currentUserId = `voice-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  delete process.env.ARVAN_AI_STT_URL;
  delete process.env.ARVAN_AI_STT_API_KEY;
  delete process.env.ARVAN_AI_API_KEY;
});

describe("POST /api/routine/assistant/voice", () => {
  it("وقتی سرویس تنظیم نشده، می‌گوید «فعال نیست» نه «خطا رخ داد»", async () => {
    const res = await POST(upload(audioForm(100)));
    expect(res.status).toBe(503);
    // تفاوت مهم است: کاربر نباید فکر کند ویسش بد بوده و ده بار تکرار کند
    expect((await res.json()).error).toContain("فعال نیست");
  });

  it("نبودِ فایل را جدا از خطای سرویس گزارش می‌کند", async () => {
    process.env.ARVAN_AI_STT_URL = "http://stt.local/v1/audio/transcriptions";
    process.env.ARVAN_AI_API_KEY = "k";
    const res = await POST(upload(new FormData()));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("فرستاده نشد");
  });

  it("فایلِ خالی پیامِ خودش را دارد", async () => {
    process.env.ARVAN_AI_STT_URL = "http://stt.local/v1/audio/transcriptions";
    process.env.ARVAN_AI_API_KEY = "k";
    const res = await POST(upload(audioForm(0)));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("چیزی ضبط نشد");
  });

  it("سقفِ حجم سمتِ سرور هم اعمال می‌شود (کلاینت قابلِ دور زدن است)", async () => {
    process.env.ARVAN_AI_STT_URL = "http://stt.local/v1/audio/transcriptions";
    process.env.ARVAN_AI_API_KEY = "k";
    const res = await POST(upload(audioForm(1024 * 1024 + 1)));
    expect(res.status).toBe(413);
  });

  it("قالبِ غیرصوتی رد می‌شود", async () => {
    process.env.ARVAN_AI_STT_URL = "http://stt.local/v1/audio/transcriptions";
    process.env.ARVAN_AI_API_KEY = "k";
    const res = await POST(upload(audioForm(100, "application/zip")));
    expect(res.status).toBe(415);
  });

  it("متنِ سرویس را برمی‌گرداند و زبان را صریح fa می‌فرستد", async () => {
    process.env.ARVAN_AI_STT_URL = "http://stt.local/v1/audio/transcriptions";
    process.env.ARVAN_AI_API_KEY = "k";
    const fetchMock = vi.fn(async (_url: any, init: any) => {
      const form = init.body as FormData;
      expect(form.get("language")).toBe("fa");
      expect(form.get("file")).toBeInstanceOf(File);
      return new Response(JSON.stringify({ text: "  امروز ورزش دارم  " }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const res = await POST(upload(audioForm(200)));
    expect(res.status).toBe(200);
    expect((await res.json()).text).toBe("امروز ورزش دارم");
    vi.unstubAllGlobals();
  });

  it("پاسخِ خالیِ سرویس، پیامِ روشن می‌دهد نه متنِ خالی", async () => {
    process.env.ARVAN_AI_STT_URL = "http://stt.local/v1/audio/transcriptions";
    process.env.ARVAN_AI_API_KEY = "k";
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ text: "   " }), { status: 200 })));
    const res = await POST(upload(audioForm(200)));
    expect(res.status).toBe(422);
    expect((await res.json()).error).toContain("فهمیده نشد");
    vi.unstubAllGlobals();
  });
});
