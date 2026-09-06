import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── mockها ────────────────────────────────────────────────────────────────
// گیت‌وی AI mock می‌شود چون تست نباید به شبکه/هزینه‌ی واقعی وابسته باشد؛
// چیزی که این‌جا واقعا تست می‌شود، رفتارِ خودِ روت است: سهمیه، پس‌دادنِ
// سهمیه، اعمالِ تغییر روی دیتابیس، و پیام‌های خطا.
let nextPlan: any = { offTopic: false, reply: "", ops: [] };
let planShouldThrow = false;
vi.mock("@/lib/aiClient", () => ({
  planRoutineChange: vi.fn(async () => {
    if (planShouldThrow) throw new Error("gateway down");
    return nextPlan;
  }),
}));

// نگهبانِ ماژول mock می‌شود تا تست به ساختِ سشنِ NextAuth گره نخورد.
// خودِ requireModule جداگانه در مسیرهای دیگر استفاده و اثباتش شده؛ چیزی که
// این‌جا اهمیت دارد این است که روت با یک کاربرِ مشخص چه می‌کند.
let currentUserId = "";
let currentIsSuper = false;
vi.mock("@/lib/moduleAccess", () => ({
  requireModule: vi.fn(async () => ({ ok: true, userId: currentUserId, isSuperAdmin: currentIsSuper })),
}));

import { POST, GET } from "@/app/api/routine/assistant/route";
import { prisma } from "@/lib/prisma";
import { SETTING_KEYS, ROUTINE_ASSISTANT_USES_KEY } from "@/lib/userSettingKeys";
import { FREE_ASSISTANT_USES } from "@/lib/routineAssistant";

function post(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/routine/assistant", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const createdUsers: string[] = [];

async function makeUser(opts: { subscribed?: boolean } = {}): Promise<string> {
  const user = await prisma.user.create({
    data: {
      email: `routine-ai-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
      passwordHash: "x",
      market: "IRAN",
    },
    select: { id: true },
  });
  createdUsers.push(user.id);
  if (opts.subscribed) {
    // پلنِ تست را خودمان می‌سازیم و *سکوت نمی‌کنیم* اگر نشد: نسخه‌ی اول این
    // تست وقتی پلنی پیدا نمی‌کرد بی‌صدا از ساختِ اشتراک می‌گذشت، و تستِ
    // «مشترک نامحدود است» عملا داشت کاربرِ رایگان را می‌سنجید.
    const plan = await prisma.plan.upsert({
      where: { key_market: { key: "test-plan", market: "IRAN" } },
      create: {
        key: "test-plan", nameFa: "پلن تست", nameEn: "Test", market: "IRAN",
        currency: "IRR", priceMonthly: 1000,
      },
      update: {},
      select: { id: true },
    });
    await prisma.subscription.create({
      data: {
        userId: user.id, planId: plan.id, status: "ACTIVE",
        currentPeriodEnd: new Date(Date.now() + 30 * 86400_000),
      },
    });
  }
  return user.id;
}

async function setOccurrences(userId: string, value: unknown) {
  await prisma.userSetting.upsert({
    where: { userId_key: { userId, key: SETTING_KEYS.customOccurrences } },
    create: { userId, key: SETTING_KEYS.customOccurrences, value: value as any },
    update: { value: value as any },
  });
}

async function readOccurrences(userId: string): Promise<any[]> {
  const row = await prisma.userSetting.findUnique({
    where: { userId_key: { userId, key: SETTING_KEYS.customOccurrences } },
    select: { value: true },
  });
  return (row?.value as any[]) ?? [];
}

async function readUses(userId: string): Promise<number> {
  const row = await prisma.userSetting.findUnique({
    where: { userId_key: { userId, key: ROUTINE_ASSISTANT_USES_KEY } },
    select: { value: true },
  });
  return Number(row?.value) || 0;
}

const SAT_CLASS = { id: "a", name: "کلاس زبان", jsDay: 6, time: "۰۸:۰۰ – ۰۹:۳۰", startDate: "2026-01-01" };

beforeEach(() => {
  planShouldThrow = false;
  nextPlan = { offTopic: false, reply: "", ops: [], ask: null };
  currentIsSuper = false;
});

afterAll(async () => {
  if (createdUsers.length) await prisma.user.deleteMany({ where: { id: { in: createdUsers } } });
});

describe("POST /api/routine/assistant — اعتبارسنجیِ ورودی", () => {
  beforeAll(async () => { currentUserId = await makeUser(); });

  it("پیامِ خالی را با پیامِ روشن رد می‌کند و سهمیه مصرف نمی‌کند", async () => {
    const res = await POST(post({ message: "   " }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("چیزی ننوشتی");
    expect(await readUses(currentUserId)).toBe(0);
  });

  it("پیامِ خیلی بلند را رد می‌کند", async () => {
    const res = await POST(post({ message: "ا".repeat(501) }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("بلند");
    expect(await readUses(currentUserId)).toBe(0);
  });
});

describe("POST /api/routine/assistant — سهمیه", () => {
  it("پیامِ خارج از موضوع سهمیه مصرف نمی‌کند و متنِ ثابتِ خودمان را می‌دهد", async () => {
    currentUserId = await makeUser();
    nextPlan = { offTopic: true, reply: "پایتخت فرانسه پاریس است", ops: [] };

    const res = await POST(post({ message: "پایتخت فرانسه کجاست؟" }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.offTopic).toBe(true);
    // متنِ مدل نباید به کاربر برسد — پاسخِ رد از خودِ کد می‌آید
    expect(data.reply).not.toContain("پاریس");
    expect(data.reply).toContain("مدیرِ برنامه");
    expect(data.changed).toBe(false);
    expect(await readUses(currentUserId)).toBe(0);
    expect(data.quota.remaining).toBe(FREE_ASSISTANT_USES);
  });

  it("خطای گیت‌وی، سهمیه را پس می‌دهد و ۵۰۳ با پیامِ روشن می‌دهد", async () => {
    currentUserId = await makeUser();
    planShouldThrow = true;

    const res = await POST(post({ message: "شنبه ساعت ۱۰ جلسه بگذار" }));
    expect(res.status).toBe(503);
    expect((await res.json()).error).toContain("سهمیه‌ات را مصرف نکرد");
    expect(await readUses(currentUserId)).toBe(0);
  });

  it("بعد از سه استفاده، چهارمی با ۴۰۳ و پیامِ اشتراک رد می‌شود", async () => {
    currentUserId = await makeUser();
    nextPlan = {
      offTopic: false, reply: "",
      ops: [{ op: "add", name: "دویدن", days: [2], start: "06:00", end: "07:00" }],
    };

    for (let i = 0; i < FREE_ASSISTANT_USES; i++) {
      // هر بار یک ساعتِ متفاوت تا تداخل، تستِ سهمیه را خراب نکند
      nextPlan.ops[0].start = `0${6 + i}:00`;
      nextPlan.ops[0].end = `0${7 + i}:00`;
      const ok = await POST(post({ message: `اضافه کن ${i}` }));
      expect(ok.status).toBe(200);
    }
    expect(await readUses(currentUserId)).toBe(FREE_ASSISTANT_USES);

    const res = await POST(post({ message: "یکی دیگه اضافه کن" }));
    const data = await res.json();
    expect(res.status).toBe(403);
    expect(data.quotaExhausted).toBe(true);
    expect(data.error).toContain("اشتراک");
    expect(data.quota.remaining).toBe(0);
  });

  it("کاربرِ دارای اشتراک نامحدود است و شمارنده‌اش بالا نمی‌رود", async () => {
    currentUserId = await makeUser({ subscribed: true });
    nextPlan = { offTopic: false, reply: "", ops: [] };

    for (let i = 0; i < FREE_ASSISTANT_USES + 2; i++) {
      const res = await POST(post({ message: "شنبه چی دارم؟" }));
      expect(res.status).toBe(200);
      expect((await res.json()).quota.unlimited).toBe(true);
    }
    expect(await readUses(currentUserId)).toBe(0);
  });

  it("سوپریوزر هم نامحدود است", async () => {
    currentUserId = await makeUser();
    currentIsSuper = true;
    const res = await GET();
    expect((await res.json()).unlimited).toBe(true);
  });
});

describe("POST /api/routine/assistant — تغییرِ واقعیِ برنامه", () => {
  it("برنامه‌ی جدید را در دیتابیس می‌نویسد", async () => {
    currentUserId = await makeUser();
    await setOccurrences(currentUserId, [SAT_CLASS]);
    nextPlan = {
      offTopic: false, reply: "باشه",
      ops: [{ op: "add", name: "دویدن", days: [1], start: "19:00", end: "20:00" }],
    };

    const res = await POST(post({ message: "دوشنبه ساعت ۱۹ دویدن اضافه کن" }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.changed).toBe(true);
    expect(data.applied).toHaveLength(1);
    expect(data.reply).toContain("دویدن");

    const saved = await readOccurrences(currentUserId);
    expect(saved).toHaveLength(2);
    expect(saved.find((o) => o.name === "دویدن").jsDay).toBe(1);
    expect(saved.find((o) => o.name === "دویدن").time).toBe("۱۹:۰۰ – ۲۰:۰۰");
  });

  it("«پر بودنِ» ساعت را می‌گوید، وقتِ آزاد پیشنهاد می‌دهد و چیزی نمی‌نویسد", async () => {
    currentUserId = await makeUser();
    await setOccurrences(currentUserId, [SAT_CLASS]);
    nextPlan = {
      offTopic: false, reply: "حتما اضافه می‌کنم",
      ops: [{ op: "add", name: "جلسه", days: [6], start: "08:30", end: "09:00" }],
    };

    const res = await POST(post({ message: "شنبه ۸:۳۰ جلسه بگذار" }));
    const data = await res.json();

    expect(data.changed).toBe(false);
    expect(data.problems[0]).toContain("کلاس زبان");
    expect(data.problems[0]).toContain("پر است");
    expect(data.problems[0]).toContain("۰۹:۳۰");
    // ادعای خوش‌بینانه‌ی مدل نباید نمایش داده شود
    expect(data.reply).not.toContain("حتما اضافه می‌کنم");
    expect(await readOccurrences(currentUserId)).toHaveLength(1);
  });

  it("جابه‌جایی به روزِ دیگر را ذخیره می‌کند", async () => {
    currentUserId = await makeUser();
    await setOccurrences(currentUserId, [SAT_CLASS]);
    nextPlan = { offTopic: false, reply: "", ops: [{ op: "move", ref: 1, toDay: 4 }] };

    const res = await POST(post({ message: "کلاس زبان رو ببر پنجشنبه" }));
    const data = await res.json();

    expect(data.changed).toBe(true);
    const saved = await readOccurrences(currentUserId);
    expect(saved[0].jsDay).toBe(4);
    expect(saved[0].time).toBe("۰۸:۰۰ – ۰۹:۳۰");
    expect(data.reply).toContain("پنجشنبه");
  });

  it("حذف را ذخیره می‌کند", async () => {
    currentUserId = await makeUser();
    await setOccurrences(currentUserId, [SAT_CLASS]);
    nextPlan = { offTopic: false, reply: "", ops: [{ op: "delete", ref: 1 }] };

    await POST(post({ message: "کلاس زبان رو پاک کن" }));
    expect(await readOccurrences(currentUserId)).toHaveLength(0);
  });

  it("ارجاع به برنامه‌ای که وجود ندارد، پیامِ روشن می‌دهد نه کرش", async () => {
    currentUserId = await makeUser();
    await setOccurrences(currentUserId, []);
    nextPlan = { offTopic: false, reply: "", ops: [{ op: "delete", ref: 5 }] };

    const res = await POST(post({ message: "باشگاه رو حذف کن" }));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.changed).toBe(false);
    expect(data.problems[0]).toContain("فهرستِ برنامه‌هایت نیست");
  });

  it("سوالِ بدونِ تغییر، پاسخِ متنیِ مدل را می‌دهد", async () => {
    currentUserId = await makeUser();
    await setOccurrences(currentUserId, [SAT_CLASS]);
    nextPlan = { offTopic: false, reply: "شنبه فقط کلاس زبان داری.", ops: [] };

    const res = await POST(post({ message: "شنبه چی دارم؟" }));
    const data = await res.json();
    expect(data.changed).toBe(false);
    expect(data.reply).toBe("شنبه فقط کلاس زبان داری.");
  });
});

describe("POST /api/routine/assistant — سوال‌وجواب و ساعتِ خودکار", () => {
  it("بدونِ ساعت هم اضافه می‌کند و می‌گوید کجا گذاشت", async () => {
    currentUserId = await makeUser();
    await setOccurrences(currentUserId, [SAT_CLASS]);
    nextPlan = { offTopic: false, reply: "", ops: [{ op: "add", name: "مطالعه", days: [6] }], ask: null };

    const res = await POST(post({ message: "مطالعه رو برای امروز اضافه کن" }));
    const data = await res.json();

    expect(data.changed).toBe(true);
    expect(data.reply).toContain("خودم انتخاب کردم");
    const saved = await readOccurrences(currentUserId);
    expect(saved.find((o) => o.name === "مطالعه")).toBeTruthy();
  });

  it("ساعتِ خودکار داخلِ بیداریِ خودِ کاربر انتخاب می‌شود", async () => {
    currentUserId = await makeUser();
    await setOccurrences(currentUserId, []);
    await prisma.userSetting.create({
      data: { userId: currentUserId, key: SETTING_KEYS.wakeSleepTimes, value: { wake: "06:00", sleep: "23:00" } as any },
    });
    nextPlan = { offTopic: false, reply: "", ops: [{ op: "add", name: "دویدن", days: [2] }], ask: null };

    await POST(post({ message: "دویدن اضافه کن" }));
    const saved = await readOccurrences(currentUserId);
    expect(saved[0].time).toBe("۰۶:۰۰ – ۰۷:۰۰");
  });

  it("سوالِ مدل با گزینه‌ها برمی‌گردد و هیچ تغییری نمی‌دهد", async () => {
    currentUserId = await makeUser();
    await setOccurrences(currentUserId, [SAT_CLASS]);
    nextPlan = {
      offTopic: false, reply: "", ops: [],
      ask: { question: "کدام مطالعه؟", options: ["مطالعه‌ی شنبه", "مطالعه‌ی دوشنبه"] },
    };

    const res = await POST(post({ message: "مطالعه رو حذف کن" }));
    const data = await res.json();

    expect(data.asking).toBe(true);
    expect(data.reply).toBe("کدام مطالعه؟");
    expect(data.options).toEqual(["مطالعه‌ی شنبه", "مطالعه‌ی دوشنبه"]);
    expect(data.changed).toBe(false);
    expect(await readOccurrences(currentUserId)).toHaveLength(1);
  });

  it("تداخل، گزینه‌ی وقتِ آزاد را همراهِ پیام می‌فرستد", async () => {
    currentUserId = await makeUser();
    await setOccurrences(currentUserId, [SAT_CLASS]);
    nextPlan = {
      offTopic: false, reply: "", ask: null,
      ops: [{ op: "add", name: "جلسه", days: [6], start: "08:30", end: "09:00" }],
    };

    const data = await (await POST(post({ message: "شنبه ۸:۳۰ جلسه بگذار" }))).json();
    expect(data.changed).toBe(false);
    expect(data.options.some((o: string) => o.includes("۰۹:۳۰"))).toBe(true);
  });

  it("تاریخچه‌ی بدشکل کرش نمی‌دهد و نادیده گرفته می‌شود", async () => {
    currentUserId = await makeUser();
    await setOccurrences(currentUserId, []);
    nextPlan = { offTopic: false, reply: "باشه", ops: [], ask: null };

    const res = await POST(post({
      message: "شنبه چی دارم؟",
      history: [{ role: "hacker", text: "x" }, { role: "user" }, "متن خام", { role: "user", text: "قبلی" }],
    }));
    expect(res.status).toBe(200);
    expect((await res.json()).reply).toBe("باشه");
  });
});
