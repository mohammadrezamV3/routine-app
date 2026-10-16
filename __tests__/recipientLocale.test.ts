import { describe, it, expect, vi, beforeEach } from "vitest";

const findUnique = vi.fn();
const findMany = vi.fn();
const notifCreate = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    userSetting: { findUnique: (...a: unknown[]) => findUnique(...a), findMany: (...a: unknown[]) => findMany(...a) },
    inAppNotification: { create: (...a: unknown[]) => notifCreate(...a) },
  },
}));
vi.mock("@/lib/webPush", () => ({ sendPushToUser: vi.fn(async () => ({ sent: 0, pruned: 0, failed: 0 })) }));
vi.mock("@/lib/realtime", () => ({ publishToUser: vi.fn() }));

import { tr } from "@/lib/i18n";
import { getUserLocale, getUserLocales, runWithLocale, trFor } from "@/lib/i18nServer";
import { notifyUser } from "@/lib/inAppNotify";
import { sendPushToUser } from "@/lib/webPush";

beforeEach(() => {
  findUnique.mockReset();
  findMany.mockReset();
  notifCreate.mockReset();
  vi.mocked(sendPushToUser).mockClear();
});

describe("runWithLocale / trFor", () => {
  it("tr() follows the forced locale inside the callback only", async () => {
    expect(tr("سلام", "Hello")).toBe("سلام");
    expect(runWithLocale("en", () => tr("سلام", "Hello"))).toBe("Hello");
    const v = await runWithLocale("en", async () => {
      await Promise.resolve();
      return tr("سلام", "Hello");
    });
    expect(v).toBe("Hello");
    expect(tr("سلام", "Hello")).toBe("سلام");
  });
  it("trFor picks by explicit locale", () => {
    expect(trFor("en", "الف", "A")).toBe("A");
    expect(trFor("fa", "الف", "A")).toBe("الف");
  });
});

describe("getUserLocale(s)", () => {
  it("defaults to fa when unknown or invalid", async () => {
    findUnique.mockResolvedValueOnce(null);
    expect(await getUserLocale("u1")).toBe("fa");
    findUnique.mockResolvedValueOnce({ value: "de" });
    expect(await getUserLocale("u1")).toBe("fa");
    findUnique.mockRejectedValueOnce(new Error("db"));
    expect(await getUserLocale("u1")).toBe("fa");
  });
  it("reads en", async () => {
    findUnique.mockResolvedValueOnce({ value: "en" });
    expect(await getUserLocale("u1")).toBe("en");
  });
  it("batches many users into one query", async () => {
    findMany.mockResolvedValueOnce([{ userId: "a", value: "en" }, { userId: "b", value: "fa" }]);
    const m = await getUserLocales(["a", "b", "c"]);
    expect(findMany).toHaveBeenCalledTimes(1);
    expect(m.get("a")).toBe("en");
    expect(m.get("b")).toBe("fa");
    expect(m.has("c")).toBe(false);
    expect((await getUserLocales([])).size).toBe(0);
  });
});

describe("notifyUser with a builder", () => {
  it("builds the text in the recipient locale", async () => {
    findUnique.mockResolvedValueOnce({ value: "en" });
    await notifyUser("u1", () => ({ type: "t", title: tr("عنوان", "Title"), body: tr("متن", "Body") }));
    expect(notifCreate).toHaveBeenCalledTimes(1);
    expect(notifCreate.mock.calls[0][0].data).toMatchObject({ userId: "u1", title: "Title", body: "Body" });
    expect(vi.mocked(sendPushToUser).mock.calls[0][1]).toMatchObject({ title: "Title", body: "Body" });
  });
  it("falls back to Persian and still accepts a plain object", async () => {
    findUnique.mockResolvedValueOnce(null);
    await notifyUser("u2", () => ({ type: "t", title: tr("عنوان", "Title"), body: tr("متن", "Body") }));
    expect(notifCreate.mock.calls[0][0].data).toMatchObject({ title: "عنوان", body: "متن" });
    await notifyUser("u3", { type: "t", title: "x", body: "y" });
    expect(notifCreate.mock.calls[1][0].data).toMatchObject({ title: "x", body: "y" });
    expect(findUnique).toHaveBeenCalledTimes(1);
  });
});
