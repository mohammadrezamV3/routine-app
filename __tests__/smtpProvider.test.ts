import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// SMTP_* عمداً هر بار پاک می‌شه و ماژول با vi.resetModules() دوباره import
// می‌شه، چون مقادیرِ env توی smtpProvider.ts یک‌بار در import ثابت می‌شن.
// از vi.stubEnv استفاده می‌شه (نه process.env.X = ...) چون NODE_ENV توی
// تایپ‌های Node به‌صورت readonly تعریف شده.
function clearSmtpEnv() {
  vi.unstubAllEnvs();
}

describe("SmtpEmailProvider — SMTP failure / unconfigured handling", () => {
  beforeEach(() => {
    clearSmtpEnv();
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("fails loudly (ok:false) in production when SMTP is not configured — never a fake success", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { SmtpEmailProvider } = await import("@/lib/email/smtpProvider");
    const provider = new SmtpEmailProvider();
    const result = await provider.sendMail({ to: "user@example.com", subject: "کد ورود", html: "<p>482931</p>", text: "482931" });
    expect(result.ok).toBe(false);
  });

  it("does not throw and marks the send as simulated in dev when SMTP is not configured", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const { SmtpEmailProvider } = await import("@/lib/email/smtpProvider");
    const provider = new SmtpEmailProvider();
    const result = await provider.sendMail({ to: "user@example.com", subject: "کد ورود", html: "<p>482931</p>", text: "482931" });
    // بسته به دسترسیِ شبکه به Ethereal ممکنه ok true یا false باشه، ولی
    // «شبیه‌سازی‌شده» بودنش تضمینیه — و هیچ‌وقت نباید throw کنه
    expect(result.simulated).toBe(true);
  });

  it("rejects sending when the connection fails, without throwing out of sendMail", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SMTP_HOST", "smtp.invalid.example.nonexistent");
    vi.stubEnv("SMTP_PORT", "587");
    vi.stubEnv("SMTP_USER", "test");
    vi.stubEnv("SMTP_PASSWORD", "test");
    vi.stubEnv("SMTP_FROM", "Arion <no-reply@example.com>");
    const { SmtpEmailProvider } = await import("@/lib/email/smtpProvider");
    const provider = new SmtpEmailProvider();
    const result = await provider.sendMail({ to: "user@example.com", subject: "کد ورود", html: "<p>482931</p>", text: "482931" });
    expect(result.ok).toBe(false);
    expect(result.simulated).toBe(false);
  }, 20000);

  it("never includes the raw OTP code in a thrown error or the result object", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SMTP_HOST", "smtp.invalid.example.nonexistent");
    vi.stubEnv("SMTP_USER", "test");
    vi.stubEnv("SMTP_PASSWORD", "test");
    vi.stubEnv("SMTP_FROM", "Arion <no-reply@example.com>");
    const { SmtpEmailProvider } = await import("@/lib/email/smtpProvider");
    const provider = new SmtpEmailProvider();
    const secretCode = "739284";
    const result = await provider.sendMail({ to: "user@example.com", subject: "کد ورود", html: `<p>${secretCode}</p>`, text: secretCode });
    // خودِ result API-facing نباید هیچ‌جا کد رو echo کنه
    expect(JSON.stringify(result)).not.toContain(secretCode);
  }, 20000);
});
