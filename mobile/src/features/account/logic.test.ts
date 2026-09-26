import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  badgeLabel,
  clearPendingCheckout,
  effectiveAmount,
  formatToman,
  loadPendingCheckout,
  pollCheckoutStatus,
  savePendingCheckout,
} from "./logic";
import { AccountApiError, createAccountApi, describeAccountError } from "./api";
import { isPaymentResultUrl } from "./browser";
import type { MobileCheckoutStatusResponse } from "@m/lib/account-contract";

const st = (status: MobileCheckoutStatusResponse["status"]): MobileCheckoutStatusResponse => ({
  checkoutId: "c1", status, planKey: "exercise", duration: "1", paidAt: null, subscriptionExpiresAt: null,
  final: status === "PAID" || status === "EXPIRED",
});

describe("pricing helpers", () => {
  it("formats rial as toman", () => {
    expect(formatToman(1500000)).toBe("150,000 تومان");
  });
  it("applies upgrade credit before discount (same order as the web checkout)", () => {
    expect(effectiveAmount({ duration: "1", amount: 2500000, upgradeAmount: 1000000, upgradeCapEnd: null }, 10)).toBe(900000);
    expect(effectiveAmount({ duration: "1", amount: 1500000, upgradeAmount: null, upgradeCapEnd: null }, 0)).toBe(1500000);
  });
  it("badge label", () => {
    expect(badgeLabel(0)).toBeNull();
    expect(badgeLabel(3)).toBe("3");
    expect(badgeLabel(12)).toBe("9+");
  });
});

describe("pollCheckoutStatus", () => {
  it("polls until a final status", async () => {
    const seq = [st("OPENED"), st("OPENED"), st("PAID")];
    const fetch = vi.fn(async () => seq.shift()!);
    const r = await pollCheckoutStatus(fetch, { sleep: async () => {}, maxAttempts: 5 });
    expect(r?.status).toBe("PAID");
    expect(fetch).toHaveBeenCalledTimes(3);
  });
  it("gives up after maxAttempts and returns the last status", async () => {
    const fetch = vi.fn(async () => st("OPENED"));
    const r = await pollCheckoutStatus(fetch, { sleep: async () => {}, maxAttempts: 3 });
    expect(r?.status).toBe("OPENED");
    expect(fetch).toHaveBeenCalledTimes(3);
  });
  it("tolerates network errors but stops on 404", async () => {
    let n = 0;
    const flaky = vi.fn(async () => {
      if (n++ === 0) throw new AccountApiError(0, "");
      return st("EXPIRED");
    });
    expect((await pollCheckoutStatus(flaky, { sleep: async () => {} }))?.status).toBe("EXPIRED");
    const gone = vi.fn(async () => {
      throw new AccountApiError(404, "not_found");
    });
    await expect(pollCheckoutStatus(gone, { sleep: async () => {} })).rejects.toBeInstanceOf(AccountApiError);
    expect(gone).toHaveBeenCalledTimes(1);
  });
});

describe("pending checkout persistence", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    });
  });
  it("round-trips and expires after 2h", () => {
    savePendingCheckout("abc", 1000);
    expect(loadPendingCheckout(2000)).toBe("abc");
    expect(loadPendingCheckout(1000 + 3 * 60 * 60 * 1000)).toBeNull();
    clearPendingCheckout();
    expect(loadPendingCheckout(2000)).toBeNull();
  });
});

describe("createAccountApi", () => {
  it("maps non-2xx to AccountApiError with the server message", async () => {
    const api = createAccountApi(async () => ({ status: 400, body: { error: "کد نامعتبر" } }), { refreshAccount: async () => {} });
    const err = await api.previewDiscount("exercise", "X").catch((e) => e);
    expect(err).toBeInstanceOf(AccountApiError);
    expect(err.status).toBe(400);
    expect(describeAccountError(err)).toBe("کد نامعتبر");
  });
  it("encodes ids in paths and sends the right bodies", async () => {
    const calls: unknown[][] = [];
    const api = createAccountApi(async (...a) => {
      calls.push(a);
      return { status: 200, body: {} };
    }, { refreshAccount: async () => {} });
    await api.checkoutStatus("a/b");
    await api.createCheckout("exercise", "3");
    await api.replyTicket("t1", "hi");
    expect(calls).toEqual([
      ["GET", "/api/mobile/billing/status/a%2Fb", undefined],
      ["POST", "/api/mobile/billing/checkout", { planKey: "exercise", duration: "3" }],
      ["POST", "/api/mobile/support/tickets/t1/messages", { message: "hi" }],
    ]);
  });
  it("maps thrown transport errors (e.g. ApiError) to status/message", async () => {
    const api = createAccountApi(async () => {
      throw Object.assign(new Error("x"), { status: 503, serverMessage: "درگاه راه‌اندازی نشده" });
    }, { refreshAccount: async () => {} });
    const err = await api.listPlans().catch((e) => e);
    expect(describeAccountError(err)).toBe("درگاه راه‌اندازی نشده");
  });
});

describe("deep link", () => {
  it("recognizes arion://payment-result", () => {
    expect(isPaymentResultUrl("arion://payment-result?status=expired")).toBe(true);
    expect(isPaymentResultUrl("https://evil/arion://payment-result")).toBe(false);
  });
});
