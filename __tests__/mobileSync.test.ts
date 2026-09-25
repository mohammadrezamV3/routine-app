import { describe, it, expect } from "vitest";
import {
  clampClientTimestamp,
  computePullCursor,
  decideLww,
  effectiveEditedAt,
  isMobileSyncSettingKey,
  isValidClientId,
  parseSyncChange,
  PULL_CURSOR_OVERLAP_MS,
  validateDailyData,
  validateSleepData,
  validateTaskData,
  MAX_DAILY_TASK_KEYS,
} from "@/lib/mobileSync";
import { MOBILE_SYNC_SETTING_KEYS } from "@/lib/mobileApiContract";
import { MAX_SETTING_VALUE_BYTES, SERVER_MANAGED_SETTING_KEYS } from "@/lib/userSettingKeys";

const NOW = new Date("2026-09-25T12:00:00.000Z");
const t = (iso: string) => new Date(iso);

describe("clampClientTimestamp", () => {
  it("accepts a past ISO timestamp as-is", () => {
    expect(clampClientTimestamp("2026-09-24T08:30:00.000Z", NOW)?.toISOString()).toBe("2026-09-24T08:30:00.000Z");
  });
  it("clamps a future timestamp (fast phone clock) down to now", () => {
    expect(clampClientTimestamp("2027-01-01T00:00:00Z", NOW)?.getTime()).toBe(NOW.getTime());
  });
  it("rejects garbage, non-ISO and pre-2020 values", () => {
    for (const bad of [undefined, null, 123, "", "yesterday", "2026-09-24", "2026-02-31T00:00:00Z", "1999-01-01T00:00:00Z"]) {
      expect(clampClientTimestamp(bad, NOW)).toBeNull();
    }
  });
  it("accepts timezone offsets", () => {
    expect(clampClientTimestamp("2026-09-24T12:00:00+03:30", NOW)?.toISOString()).toBe("2026-09-24T08:30:00.000Z");
  });
});

describe("effectiveEditedAt / decideLww", () => {
  const mobileWrite = {
    updatedAt: t("2026-09-25T10:00:00.000Z"),
    syncWrittenAt: t("2026-09-25T10:00:00.000Z"),
    syncEditedAt: t("2026-09-20T09:00:00.000Z"), // ویرایشِ آفلاینِ ۵ روز پیش
  };
  const webAfterMobile = { ...mobileWrite, updatedAt: t("2026-09-25T11:00:00.000Z") };
  const webOnly = { updatedAt: t("2026-09-22T00:00:00.000Z"), syncWrittenAt: null, syncEditedAt: null };

  it("uses the client edit time when the last writer was the mobile sync", () => {
    expect(effectiveEditedAt(mobileWrite).toISOString()).toBe("2026-09-20T09:00:00.000Z");
  });
  it("uses updatedAt once a web write happened after the mobile write", () => {
    expect(effectiveEditedAt(webAfterMobile).toISOString()).toBe("2026-09-25T11:00:00.000Z");
  });
  it("uses updatedAt for rows never touched by mobile", () => {
    expect(effectiveEditedAt(webOnly).toISOString()).toBe("2026-09-22T00:00:00.000Z");
  });

  it("applies when there is no server row", () => {
    expect(decideLww(null, t("2026-01-01T00:00:00Z"))).toBe("apply");
  });
  it("applies a newer client edit, even if it was received before the older one", () => {
    // مقایسه با زمانِ ویرایش (۲۰ سپتامبر)، نه زمانِ دریافت (۲۵ سپتامبر)
    expect(decideLww(mobileWrite, t("2026-09-21T00:00:00Z"))).toBe("apply");
  });
  it("rejects an older client edit as stale", () => {
    expect(decideLww(mobileWrite, t("2026-09-19T00:00:00Z"))).toBe("stale");
  });
  it("ties go to the server (idempotent re-push is stale, not re-applied)", () => {
    expect(decideLww(mobileWrite, t("2026-09-20T09:00:00.000Z"))).toBe("stale");
  });
  it("a web edit newer than the offline edit wins", () => {
    expect(decideLww(webAfterMobile, t("2026-09-25T10:30:00Z"))).toBe("stale");
    expect(decideLww(webAfterMobile, t("2026-09-25T11:00:00.001Z"))).toBe("apply");
  });
});

describe("computePullCursor", () => {
  it("returns server start minus the overlap when nothing was truncated", () => {
    const r = computePullCursor(NOW, []);
    expect(r.hasMore).toBe(false);
    expect(r.cursor.getTime()).toBe(NOW.getTime() - PULL_CURSOR_OVERLAP_MS);
  });
  it("pages from the earliest truncated entity, 1ms before its last row", () => {
    const r = computePullCursor(NOW, [t("2026-09-10T00:00:00.500Z"), t("2026-09-05T00:00:00.000Z")]);
    expect(r.hasMore).toBe(true);
    expect(r.cursor.toISOString()).toBe("2026-09-04T23:59:59.999Z");
  });
});

describe("isValidClientId", () => {
  it("accepts cuid and cuid2 shapes", () => {
    expect(isValidClientId("clz3k9x2b0000qwe8rtyuiop1")).toBe(true); // cuid (25)
    expect(isValidClientId("tz4a98xxat96iws9zmbrgj3a")).toBe(true); // cuid2 (24)
  });
  it("rejects everything else", () => {
    for (const bad of [undefined, 1, "", "short", "UPPERCASEUPPERCASEUPPER", "1abcdefghijklmnopqrstu", "abc-def-ghi-jkl-mno-pqr", "a".repeat(33), "' OR 1=1 --aaaaaaaaaaaa"]) {
      expect(isValidClientId(bad)).toBe(false);
    }
  });
});

describe("entity validators", () => {
  it("daily: accepts booleans, rejects non-booleans / too many keys / bad wake", () => {
    expect(validateDailyData({ tasks: { a: true, b: false }, wake: "2026-09-24T05:00:00Z" }).ok).toBe(true);
    expect(validateDailyData({ tasks: { a: 1 } }).ok).toBe(false);
    expect(validateDailyData({ tasks: [] }).ok).toBe(false);
    expect(validateDailyData({ tasks: { a: true }, wake: "not a date" }).ok).toBe(false);
    const many = Object.fromEntries(Array.from({ length: MAX_DAILY_TASK_KEYS + 1 }, (_, i) => [`k${i}`, true]));
    expect(validateDailyData({ tasks: many }).ok).toBe(false);
    expect(validateDailyData({ tasks: { ["x".repeat(201)]: true } }).ok).toBe(false);
  });
  it("sleep: quality must be an integer 1..5 or null", () => {
    expect(validateSleepData({ quality: 3 }).ok).toBe(true);
    expect(validateSleepData({ quality: null }).ok).toBe(true);
    expect(validateSleepData({ quality: 0 }).ok).toBe(false);
    expect(validateSleepData({ quality: 2.5 }).ok).toBe(false);
    expect(validateSleepData({ sleptAt: "bad" }).ok).toBe(false);
  });
  it("task: title required and length-capped, priority bounded", () => {
    expect(validateTaskData({ title: "  خرید  " })).toMatchObject({ ok: true, value: { title: "خرید", priority: 0, notes: null } });
    expect(validateTaskData({ title: "" }).ok).toBe(false);
    expect(validateTaskData({ title: "x".repeat(201) }).ok).toBe(false);
    expect(validateTaskData({ title: "a", priority: 99 }).ok).toBe(false);
    expect(validateTaskData({ title: "a", notes: 5 }).ok).toBe(false);
  });
});

describe("setting keys", () => {
  it("every phase-1 key is a user-writable setting key and none is server-managed", () => {
    for (const k of MOBILE_SYNC_SETTING_KEYS) {
      expect(isMobileSyncSettingKey(k)).toBe(true);
      expect(SERVER_MANAGED_SETTING_KEYS.has(k)).toBe(false);
    }
  });
  it("syncs theme", () => {
    expect(isMobileSyncSettingKey("theme")).toBe(true);
  });
  it("rejects server-managed and non-routine keys", () => {
    expect(isMobileSyncSettingKey("pushSentLog")).toBe(false);
    expect(isMobileSyncSettingKey("routineAssistantUses")).toBe(false);
    expect(isMobileSyncSettingKey("tradeChartSymbol")).toBe(false);
    expect(isMobileSyncSettingKey("__proto__")).toBe(false);
  });
});

describe("parseSyncChange", () => {
  const ts = "2026-09-24T10:00:00.000Z";
  it("parses a valid daily upsert", () => {
    const r = parseSyncChange({ entity: "dailyEntry", key: "2026-09-24", op: "upsert", data: { tasks: { a: true }, wake: null }, clientUpdatedAt: ts }, NOW);
    expect(r.ok).toBe(true);
    if (r.ok && r.change.entity === "dailyEntry") expect(r.change.date.toISOString()).toBe("2026-09-24T00:00:00.000Z");
  });
  it("rejects unknown entity / op / bad key / bad timestamp", () => {
    expect(parseSyncChange({ entity: "user", op: "upsert", clientUpdatedAt: ts }, NOW).ok).toBe(false);
    expect(parseSyncChange({ entity: "task", id: "tz4a98xxat96iws9zmbrgj3a", op: "merge", clientUpdatedAt: ts }, NOW).ok).toBe(false);
    expect(parseSyncChange({ entity: "dailyEntry", key: "2026-13-01", op: "delete", clientUpdatedAt: ts }, NOW).ok).toBe(false);
    expect(parseSyncChange({ entity: "task", id: "tz4a98xxat96iws9zmbrgj3a", op: "delete", clientUpdatedAt: "nope" }, NOW).ok).toBe(false);
    expect(parseSyncChange({ entity: "setting", key: "pushSentLog", op: "upsert", data: { value: {} }, clientUpdatedAt: ts }, NOW).ok).toBe(false);
  });
  it("enforces MAX_SETTING_VALUE_BYTES", () => {
    const big = "x".repeat(MAX_SETTING_VALUE_BYTES);
    const r = parseSyncChange({ entity: "setting", key: "outingDates", op: "upsert", data: { value: big }, clientUpdatedAt: ts }, NOW);
    expect(r.ok).toBe(false);
  });
  it("clamps a future clientUpdatedAt to now", () => {
    const r = parseSyncChange({ entity: "task", id: "tz4a98xxat96iws9zmbrgj3a", op: "delete", clientUpdatedAt: "2030-01-01T00:00:00Z" }, NOW);
    expect(r.ok && r.change.clientAt.getTime()).toBe(NOW.getTime());
  });
});
