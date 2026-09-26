import { describe, it, expect, afterAll, beforeAll, vi } from "vitest";
import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { decode } from "next-auth/jwt";

// integration روی دیتابیسِ واقعی — خرید پلن از اپ (handoff به وب)، تیکت و اطلاعیه.
vi.hoisted(() => {
  process.env.TRUST_PROXY_HEADERS = "1";
  process.env.NEXTAUTH_SECRET ||= "test-secret-for-mobile-auth-at-least-32-chars";
  process.env.ZIBAL_MERCHANT_KEY ||= "zibal";
  process.env.NEXTAUTH_URL ||= "https://arionapp.test";
});

import { POST as login } from "@/app/api/mobile/auth/login/route";
import { GET as plansRoute } from "@/app/api/mobile/billing/plans/route";
import { POST as checkoutRoute } from "@/app/api/mobile/billing/checkout/route";
import { POST as discountRoute } from "@/app/api/mobile/billing/discount/route";
import { GET as statusRoute } from "@/app/api/mobile/billing/status/[id]/route";
import { GET as handoffRoute } from "@/app/api/mobile/billing/handoff/route";
import { GET as ticketsList, POST as ticketsCreate } from "@/app/api/mobile/support/tickets/route";
import { GET as ticketGet } from "@/app/api/mobile/support/tickets/[id]/route";
import { POST as ticketReply } from "@/app/api/mobile/support/tickets/[id]/messages/route";
import { GET as noticesList } from "@/app/api/mobile/notices/route";
import { POST as noticesRead } from "@/app/api/mobile/notices/read/route";
import { prisma } from "@/lib/prisma";
import { hashCheckoutToken, redeemCheckoutToken, CHECKOUT_TOKEN_TTL_MS } from "@/lib/mobileBilling";
import { sessionCookieName } from "@/lib/mobileBillingWebSession";
import type {
  MobileBillingPlansResponse,
  MobileCheckoutResponse,
  MobileCheckoutStatusResponse,
  MobileNoticesResponse,
  MobileTicketCreateResponse,
  MobileTicketDetailResponse,
  MobileTicketsResponse,
} from "@/lib/mobileAccountContract";
import type { MobileAuthSuccess } from "@/lib/mobileApiContract";

const PASSWORD = "Correct-Horse-Battery-9";
const createdUsers: string[] = [];

beforeAll(async () => {
  // پلن‌ها دیتابیسی‌اند (seed) — تست خودش مطمئن می‌شه پلنِ exercise وجود داره
  const plan = await prisma.plan.upsert({
    where: { key_market: { key: "exercise", market: "IRAN" } },
    create: { key: "exercise", nameFa: "پلن بدنسازی", nameEn: "Exercise", market: "IRAN", currency: "IRR", priceMonthly: 1500000, isActive: true },
    update: {},
  });
  for (const module of ["EXERCISE", "CALORIE"] as const) {
    await prisma.planModule.upsert({ where: { planId_module: { planId: plan.id, module } }, create: { planId: plan.id, module }, update: {} });
  }
});

afterAll(async () => {
  await prisma.mobileCheckout.deleteMany({ where: { userId: { in: createdUsers } } });
  await prisma.user.deleteMany({ where: { id: { in: createdUsers } } });
  await prisma.$disconnect();
});

async function makeUser(opts: { superAdmin?: boolean } = {}) {
  const tag = `${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
  const user = await prisma.user.create({
    data: { username: `bl_${tag}`.slice(0, 20), passwordHash: await bcrypt.hash(PASSWORD, 4), market: "IRAN", isSuperAdmin: !!opts.superAdmin },
  });
  createdUsers.push(user.id);
  return user;
}
function ipHeader() {
  return `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;
}
function req(path: string, body: unknown, token?: string, method = "POST") {
  return new NextRequest(`http://localhost${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": ipHeader(),
      "user-agent": "vitest-browser",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: method === "GET" ? undefined : JSON.stringify(body),
  });
}
async function tokenFor(username: string) {
  const res = await login(req("/api/mobile/auth/login", { identifier: username, password: PASSWORD }));
  expect(res.status).toBe(200);
  return ((await res.json()) as MobileAuthSuccess).accessToken;
}
async function startCheckout(t: string, body: unknown = { planKey: "exercise", duration: "1" }) {
  const res = await checkoutRoute(req("/api/mobile/billing/checkout", body, t));
  return { status: res.status, json: (await res.json()) as MobileCheckoutResponse & { error?: string } };
}
const handoff = (url: string) => {
  const u = new URL(url);
  return handoffRoute(new NextRequest(`http://localhost${u.pathname}${u.search}`, { headers: { "x-forwarded-for": ipHeader(), "user-agent": "vitest-browser" } }));
};
const status = (t: string, id: string) => statusRoute(req(`/api/mobile/billing/status/${id}`, null, t, "GET"), { params: { id } });
async function paidModules(userId: string) {
  return prisma.moduleAccess.count({ where: { userId, module: { in: ["EXERCISE", "CALORIE"] } } });
}

describe("billing: plans + checkout", () => {
  it("requires a bearer token", async () => {
    expect((await plansRoute(req("/api/mobile/billing/plans", null, undefined, "GET"))).status).toBe(401);
    expect((await checkoutRoute(req("/api/mobile/billing/checkout", { planKey: "exercise", duration: "1" }))).status).toBe(401);
  });

  it("lists DB-defined plans with server-side prices", async () => {
    const u = await makeUser();
    const t = await tokenFor(u.username!);
    const res = await plansRoute(req("/api/mobile/billing/plans", null, t, "GET"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as MobileBillingPlansResponse;
    const ex = body.plans.find((p) => p.key === "exercise")!;
    expect(ex.modules).toEqual(expect.arrayContaining(["EXERCISE", "CALORIE"]));
    expect(ex.prices.find((p) => p.duration === "1")!.amount).toBe(1500000);
    expect(body.checkoutAvailable).toBe(true);
  });

  it("creates a PENDING checkout storing only the token hash, and grants nothing", async () => {
    const u = await makeUser();
    const t = await tokenFor(u.username!);
    const before = await paidModules(u.id);
    const { status: s, json } = await startCheckout(t);
    expect(s).toBe(201);
    const token = new URL(json.checkoutUrl).searchParams.get("t")!;
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(json.checkoutUrl.startsWith("https://arionapp.test/api/mobile/billing/handoff?t=")).toBe(true);
    const row = await prisma.mobileCheckout.findUniqueOrThrow({ where: { id: json.checkoutId } });
    expect(row.userId).toBe(u.id);
    expect(row.status).toBe("PENDING");
    expect(row.tokenHash).toBe(hashCheckoutToken(token));
    expect(JSON.stringify(row)).not.toContain(token);
    expect(row.tokenExpiresAt.getTime() - Date.now()).toBeLessThanOrEqual(CHECKOUT_TOKEN_TTL_MS);
    expect(json.quotedAmount).toBe(1500000);
    expect(await paidModules(u.id)).toBe(before);
    expect(await prisma.subscription.count({ where: { userId: u.id } })).toBe(0);
  });

  it("rejects bad input, unknown/free plans, invalid codes and super admins", async () => {
    const u = await makeUser();
    const t = await tokenFor(u.username!);
    expect((await startCheckout(t, { planKey: "exercise", duration: "2" })).status).toBe(400);
    expect((await startCheckout(t, { planKey: "basic", duration: "1" })).status).toBe(400);
    expect((await startCheckout(t, { planKey: "nope", duration: "1" })).status).toBe(400);
    expect((await startCheckout(t, { planKey: "exercise", duration: "1", discountCode: "NOT-A-REAL-CODE" })).status).toBe(400);
    const d = await discountRoute(req("/api/mobile/billing/discount", { planKey: "exercise", code: "NOT-A-REAL-CODE" }, t));
    expect(d.status).toBe(400);
    const admin = await makeUser({ superAdmin: true });
    expect((await startCheckout(await tokenFor(admin.username!))).status).toBe(400);
  });
});

describe("billing: single-use handoff token", () => {
  it("first use opens a short web session and redirects to the web checkout; reuse fails", async () => {
    const u = await makeUser();
    const t = await tokenFor(u.username!);
    const { json } = await startCheckout(t);

    const first = await handoff(json.checkoutUrl);
    expect(first.status).toBe(303);
    const loc = new URL(first.headers.get("location")!);
    expect(loc.pathname).toBe("/subscription/checkout");
    expect(loc.searchParams.get("plan")).toBe("exercise");
    expect(loc.searchParams.get("duration")).toBe("1");
    const cookie = first.cookies.get(sessionCookieName())!;
    expect(cookie).toBeTruthy();
    expect(cookie.httpOnly).toBe(true);
    expect(cookie.maxAge).toBeLessThanOrEqual(30 * 60);
    const claims = await decode({ token: cookie.value, secret: process.env.NEXTAUTH_SECRET! });
    expect(claims?.userId).toBe(u.id);
    const sess = await prisma.session.findUniqueOrThrow({ where: { sessionToken: claims!.sid as string } });
    expect(sess.userId).toBe(u.id);
    expect(sess.provider).toBe("mobile-checkout");
    expect(sess.expiresAt.getTime() - Date.now()).toBeLessThanOrEqual(30 * 60 * 1000 + 1000);

    const again = await handoff(json.checkoutUrl);
    expect(again.status).toBe(410);
    expect(again.cookies.get(sessionCookieName())).toBeUndefined();

    const row = await prisma.mobileCheckout.findUniqueOrThrow({ where: { id: json.checkoutId } });
    expect(row.status).toBe("OPENED");
    expect(row.tokenUsedAt).toBeTruthy();
    // باز شدنِ صفحه هیچ دسترسی‌ای نمی‌ده
    expect(await paidModules(u.id)).toBe(0);
  });

  it("concurrent redemption: exactly one wins", async () => {
    const u = await makeUser();
    const t = await tokenFor(u.username!);
    const { json } = await startCheckout(t);
    const token = new URL(json.checkoutUrl).searchParams.get("t")!;
    const results = await Promise.all([redeemCheckoutToken(token), redeemCheckoutToken(token), redeemCheckoutToken(token)]);
    expect(results.filter(Boolean)).toHaveLength(1);
  });

  it("expired and malformed tokens are rejected", async () => {
    const u = await makeUser();
    const t = await tokenFor(u.username!);
    const { json } = await startCheckout(t);
    await prisma.mobileCheckout.update({ where: { id: json.checkoutId }, data: { tokenExpiresAt: new Date(Date.now() - 1000) } });
    expect((await handoff(json.checkoutUrl)).status).toBe(410);
    expect((await handoff("https://x/api/mobile/billing/handoff?t=short")).status).toBe(410);
    expect((await handoff("https://x/api/mobile/billing/handoff")).status).toBe(410);
    const s = (await (await status(t, json.checkoutId)).json()) as MobileCheckoutStatusResponse;
    expect(s.status).toBe("EXPIRED");
    expect(s.final).toBe(true);
  });
});

describe("billing: status is ownership-checked and only trusts verified payments", () => {
  it("another user's checkout is 404", async () => {
    const a = await makeUser();
    const b = await makeUser();
    const { json } = await startCheckout(await tokenFor(a.username!));
    const res = await status(await tokenFor(b.username!), json.checkoutId);
    expect(res.status).toBe(404);
  });

  it("stays OPENED without a verified payment; PAID only after the web verify path recorded one", async () => {
    const u = await makeUser();
    const other = await makeUser();
    const t = await tokenFor(u.username!);
    const { json } = await startCheckout(t);
    await handoff(json.checkoutUrl);

    const plan = await prisma.plan.findUniqueOrThrow({ where: { key_market: { key: "exercise", market: "IRAN" } } });
    // پرداختِ تأییدنشده (paidAt خالی) و پرداختِ کاربرِ دیگر → نباید PAID بشه
    await prisma.subscription.create({
      data: { userId: u.id, planId: plan.id, status: "CANCELED", currentPeriodEnd: new Date(Date.now() + 86400_000), payments: { create: { amount: 1500000, currency: "IRR", provider: "zibal" } } },
    });
    await prisma.subscription.create({
      data: { userId: other.id, planId: plan.id, status: "ACTIVE", currentPeriodEnd: new Date(Date.now() + 86400_000), payments: { create: { amount: 1500000, currency: "IRR", provider: "zibal", paidAt: new Date() } } },
    });
    let s = (await (await status(t, json.checkoutId)).json()) as MobileCheckoutStatusResponse;
    expect(s.status).toBe("OPENED");
    expect(s.final).toBe(false);
    expect(await paidModules(u.id)).toBe(0);

    // همون چیزی که /api/subscription/verify بعد از verify ِ زیبال می‌سازه
    const end = new Date(Date.now() + 30 * 86400_000);
    await prisma.subscription.create({
      data: { userId: u.id, planId: plan.id, status: "ACTIVE", currentPeriodEnd: end, payments: { create: { amount: 1500000, currency: "IRR", provider: "zibal", providerRef: "123", paidAt: new Date() } } },
    });
    s = (await (await status(t, json.checkoutId)).json()) as MobileCheckoutStatusResponse;
    expect(s.status).toBe("PAID");
    expect(s.subscriptionExpiresAt).toBe(end.toISOString());
    // status خودش هیچ‌وقت ماژول اعطا نمی‌کنه — اون فقط کارِ verify ِ وبه
    expect(await paidModules(u.id)).toBe(0);
  });

  it("a PENDING (never opened) checkout never becomes PAID even if a payment exists", async () => {
    const u = await makeUser();
    const t = await tokenFor(u.username!);
    const plan = await prisma.plan.findUniqueOrThrow({ where: { key_market: { key: "exercise", market: "IRAN" } } });
    const { json } = await startCheckout(t);
    await prisma.subscription.create({
      data: { userId: u.id, planId: plan.id, status: "ACTIVE", currentPeriodEnd: new Date(Date.now() + 86400_000), payments: { create: { amount: 1500000, currency: "IRR", provider: "zibal", paidAt: new Date() } } },
    });
    const s = (await (await status(t, json.checkoutId)).json()) as MobileCheckoutStatusResponse;
    expect(s.status).toBe("PENDING");
  });
});

describe("support tickets", () => {
  it("create/list/view/reply, and other users get 404", async () => {
    const u = await makeUser();
    const v = await makeUser();
    const t = await tokenFor(u.username!);
    const tv = await tokenFor(v.username!);

    expect((await ticketsCreate(req("/api/mobile/support/tickets", { subject: "", message: "x" }, t))).status).toBe(400);
    const cr = await ticketsCreate(req("/api/mobile/support/tickets", { subject: "مشکل پرداخت", message: "سلام" }, t));
    expect(cr.status).toBe(201);
    const { ticket } = (await cr.json()) as MobileTicketCreateResponse;
    expect(ticket.status).toBe("OPEN");
    expect(ticket.lastMessage?.body).toBe("سلام");

    const list = (await (await ticketsList(req("/api/mobile/support/tickets", null, t, "GET"))).json()) as MobileTicketsResponse;
    expect(list.tickets.map((x) => x.id)).toContain(ticket.id);
    const listV = (await (await ticketsList(req("/api/mobile/support/tickets", null, tv, "GET"))).json()) as MobileTicketsResponse;
    expect(listV.tickets).toHaveLength(0);

    expect((await ticketGet(req(`/x`, null, tv, "GET"), { params: { id: ticket.id } })).status).toBe(404);
    expect((await ticketReply(req(`/x`, { message: "hack" }, tv), { params: { id: ticket.id } })).status).toBe(404);

    await prisma.supportMessage.create({ data: { ticketId: ticket.id, body: "پاسخ", fromAdmin: true } });
    await prisma.supportTicket.update({ where: { id: ticket.id }, data: { status: "ANSWERED" } });
    const rep = await ticketReply(req(`/x`, { message: "ممنون" }, t), { params: { id: ticket.id } });
    expect(rep.status).toBe(201);
    const detail = (await (await ticketGet(req(`/x`, null, t, "GET"), { params: { id: ticket.id } })).json()) as MobileTicketDetailResponse;
    expect(detail.ticket.status).toBe("OPEN");
    expect(detail.ticket.messages.map((m) => [m.body, m.fromAdmin])).toEqual([["سلام", false], ["پاسخ", true], ["ممنون", false]]);
  });

  it("clamps the message to 4000 chars (same as web)", async () => {
    const u = await makeUser();
    const t = await tokenFor(u.username!);
    const cr = await ticketsCreate(req("/api/mobile/support/tickets", { subject: "s".repeat(500), message: "m".repeat(5000) }, t));
    const { ticket } = (await cr.json()) as MobileTicketCreateResponse;
    expect(ticket.subject.length).toBeLessThanOrEqual(120);
    expect(ticket.lastMessage!.body.length).toBeLessThanOrEqual(4000);
  });
});

describe("notices", () => {
  it("lists welcome + answered-ticket notices, marks read, ignores unknown ids", async () => {
    const u = await makeUser();
    const t = await tokenFor(u.username!);
    let n = (await (await noticesList(req("/api/mobile/notices", null, t, "GET"))).json()) as MobileNoticesResponse;
    expect(n.notices.map((x) => x.id)).toContain("welcome");
    expect(n.unreadCount).toBe(1);

    const ticket = await prisma.supportTicket.create({ data: { userId: u.id, subject: "سوال", status: "ANSWERED" } });
    n = (await (await noticesList(req("/api/mobile/notices", null, t, "GET"))).json()) as MobileNoticesResponse;
    const tn = n.notices.find((x) => x.kind === "ticket_answered")!;
    expect(tn.href).toBe(`/account/support/${ticket.id}`);
    expect(n.unreadCount).toBe(2);

    n = (await (await noticesRead(req("/api/mobile/notices/read", { ids: ["welcome", "bogus:id"] }, t))).json()) as MobileNoticesResponse;
    expect(n.unreadCount).toBe(1);
    const stored = await prisma.userSetting.findUniqueOrThrow({ where: { userId_key: { userId: u.id, key: "dismissedStaticNotifs" } } });
    expect(stored.value).toEqual(["welcome"]);

    n = (await (await noticesRead(req("/api/mobile/notices/read", { all: true }, t))).json()) as MobileNoticesResponse;
    expect(n.unreadCount).toBe(0);
  });
});
