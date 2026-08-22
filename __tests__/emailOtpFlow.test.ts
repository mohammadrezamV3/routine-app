import { describe, it, expect, afterAll, vi } from "vitest";
import { NextRequest } from "next/server";

// sendOtpEmail رو mock می‌کنیم تا (۱) هیچ ایمیلِ واقعی/شبکه‌ای توی تست رد
// نشه، (۲) کدِ واقعیِ تولیدشده رو بگیریم — تنها راهی که تست می‌تونه بفهمه
// کدِ درست چیه، چون خودِ route هیچ‌وقت کد رو برنمی‌گردونه (طبقِ الزام).
let capturedCode: string | null = null;
vi.mock("@/lib/email", () => ({
  sendOtpEmail: vi.fn(async (_to: string, code: string) => {
    capturedCode = code;
    return { ok: true, simulated: true };
  }),
}));

import { POST as requestOtp } from "@/app/api/auth/email-otp/request/route";
import { POST as verifyOtp } from "@/app/api/auth/email-otp/verify/route";
import { verifyAndConsumeEmailOtp, hashEmailOtp } from "@/lib/emailOtp";
import { prisma } from "@/lib/prisma";

function makeRequest(url: string, body: unknown): NextRequest {
  return new NextRequest(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function uniqueEmail(): string {
  return `otp-test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

describe("POST /api/auth/email-otp/request + /verify (integration, real DB)", () => {
  const createdEmails: string[] = [];
  afterAll(async () => {
    if (createdEmails.length) await prisma.emailLoginOtp.deleteMany({ where: { email: { in: createdEmails } } });
  });

  it("creates a hashed OTP row and never leaks the plaintext code in the response", async () => {
    const email = uniqueEmail();
    createdEmails.push(email);
    capturedCode = null;

    const res = await requestOtp(makeRequest("http://localhost/api/auth/email-otp/request", { email }));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(capturedCode).toMatch(/^\d{6}$/);
    expect(JSON.stringify(data)).not.toContain(capturedCode!);

    const row = await prisma.emailLoginOtp.findFirst({ where: { email }, orderBy: { createdAt: "desc" } });
    expect(row).not.toBeNull();
    expect(row!.codeHash).toBe(hashEmailOtp(capturedCode!));
    expect(row!.codeHash).not.toContain(capturedCode!);
  });

  it("rejects a malformed email before ever touching the database", async () => {
    const res = await requestOtp(makeRequest("http://localhost/api/auth/email-otp/request", { email: "not-an-email" }));
    expect(res.status).toBe(400);
  });

  it("enforces at most 1 request per 60s for the same email", async () => {
    const email = uniqueEmail();
    createdEmails.push(email);
    const res1 = await requestOtp(makeRequest("http://localhost/api/auth/email-otp/request", { email }));
    expect(res1.status).toBe(200);
    const res2 = await requestOtp(makeRequest("http://localhost/api/auth/email-otp/request", { email }));
    expect(res2.status).toBe(429);
  });

  it("verify succeeds with the correct code and reports hasAccount:false for an unregistered email", async () => {
    const email = uniqueEmail();
    createdEmails.push(email);
    capturedCode = null;
    await requestOtp(makeRequest("http://localhost/api/auth/email-otp/request", { email }));

    const res = await verifyOtp(makeRequest("http://localhost/api/auth/email-otp/verify", { email, code: capturedCode }));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.hasAccount).toBe(false);
  });

  it("verify rejects a wrong code and increments the attempt counter", async () => {
    const email = uniqueEmail();
    createdEmails.push(email);
    await requestOtp(makeRequest("http://localhost/api/auth/email-otp/request", { email }));

    const res = await verifyOtp(makeRequest("http://localhost/api/auth/email-otp/verify", { email, code: "000000" }));
    expect(res.status).toBe(400);

    const row = await prisma.emailLoginOtp.findFirst({ where: { email }, orderBy: { createdAt: "desc" } });
    expect(row!.attempts).toBe(1);
  });

  it("verify rejects an expired code", async () => {
    const email = uniqueEmail();
    createdEmails.push(email);
    capturedCode = null;
    await requestOtp(makeRequest("http://localhost/api/auth/email-otp/request", { email }));
    // به‌جای صبرکردنِ واقعیِ ۱۰ دقیقه، انقضا رو دستی جلو می‌بریم
    await prisma.emailLoginOtp.updateMany({ where: { email }, data: { expiresAt: new Date(Date.now() - 1000) } });

    const res = await verifyOtp(makeRequest("http://localhost/api/auth/email-otp/verify", { email, code: capturedCode }));
    expect(res.status).toBe(400);
  });
});

describe("verifyAndConsumeEmailOtp — the function that actually gates sign-in", () => {
  const createdEmails: string[] = [];
  afterAll(async () => {
    if (createdEmails.length) await prisma.emailLoginOtp.deleteMany({ where: { email: { in: createdEmails } } });
  });

  async function createOtp(email: string, code: string, overrides: { expiresAt?: Date; attempts?: number } = {}) {
    return prisma.emailLoginOtp.create({
      data: {
        email,
        codeHash: hashEmailOtp(code),
        expiresAt: overrides.expiresAt || new Date(Date.now() + 10 * 60 * 1000),
        attempts: overrides.attempts || 0,
      },
    });
  }

  it("succeeds exactly once with the correct code", async () => {
    const email = uniqueEmail();
    createdEmails.push(email);
    await createOtp(email, "482931");

    const result = await verifyAndConsumeEmailOtp(email, "482931");
    expect(result.ok).toBe(true);
  });

  it("rejects reuse of an already-consumed code (used immediately after success)", async () => {
    const email = uniqueEmail();
    createdEmails.push(email);
    await createOtp(email, "482931");

    const first = await verifyAndConsumeEmailOtp(email, "482931");
    expect(first.ok).toBe(true);

    const second = await verifyAndConsumeEmailOtp(email, "482931");
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.reason).toBe("not_found");
  });

  it("rejects an expired code", async () => {
    const email = uniqueEmail();
    createdEmails.push(email);
    await createOtp(email, "482931", { expiresAt: new Date(Date.now() - 1000) });

    const result = await verifyAndConsumeEmailOtp(email, "482931");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("not_found");
  });

  it("rejects a wrong code without consuming the still-valid row", async () => {
    const email = uniqueEmail();
    createdEmails.push(email);
    await createOtp(email, "482931");

    const wrong = await verifyAndConsumeEmailOtp(email, "111111");
    expect(wrong.ok).toBe(false);
    if (!wrong.ok) expect(wrong.reason).toBe("wrong_code");

    // چون کدِ اشتباه مصرفش نکرد، کدِ درست هنوز باید جواب بده
    const correct = await verifyAndConsumeEmailOtp(email, "482931");
    expect(correct.ok).toBe(true);
  });

  it("locks out after the maximum number of wrong attempts, even for the correct code afterwards", async () => {
    const email = uniqueEmail();
    createdEmails.push(email);
    await createOtp(email, "482931");

    for (let i = 0; i < 5; i++) {
      await verifyAndConsumeEmailOtp(email, "000000");
    }
    const result = await verifyAndConsumeEmailOtp(email, "482931");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("too_many_attempts");
  });
});
