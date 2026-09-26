import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import type { SocialChatMessage, SocialWeeklyDay } from "@m/lib/social-contract";
import { createSocialApi, SocialApiError } from "./api";
import { cacheKeys, clearSocialCache, readCache, writeCache } from "./db";
import { describeSocialError, isModuleLocked, isOffline, isRulesNotAccepted, NEED_INTERNET_LONG } from "./errors";
import { barHeight, dayAverage, deltaOf, lastCreatedAt, mergeMessages, trimForCache, withoutMessage } from "./logic";

const msg = (id: string, t: number, over: Partial<SocialChatMessage> = {}): SocialChatMessage => ({
  id,
  symbol: "EURUSD",
  body: id,
  createdAt: new Date(Date.UTC(2026, 8, 25, 10, 0, t)).toISOString(),
  authorId: "u",
  authorName: "a",
  mine: false,
  reported: false,
  ...over,
});

describe("chat merge logic", () => {
  it("dedupes by id, keeps ascending order and lets fresher copies win", () => {
    const prev = [msg("a", 1), msg("b", 2)];
    const merged = mergeMessages(prev, [msg("c", 3), msg("b", 2, { reported: true }), msg("z", 0)]);
    expect(merged.map((m) => m.id)).toEqual(["z", "a", "b", "c"]);
    expect(merged.find((m) => m.id === "b")!.reported).toBe(true);
    expect(mergeMessages(prev, [])).toBe(prev);
    expect(lastCreatedAt(merged)).toBe(msg("c", 3).createdAt);
    expect(lastCreatedAt([])).toBeUndefined();
    expect(withoutMessage(merged, "a").map((m) => m.id)).toEqual(["z", "b", "c"]);
    expect(trimForCache(merged, 2).map((m) => m.id)).toEqual(["b", "c"]);
  });
});

describe("weekly chart math", () => {
  it("scales scores and keeps 'no data' distinct from zero", () => {
    expect(barHeight(null, 100)).toBe(0);
    expect(barHeight(50, 100)).toBe(50);
    expect(barHeight(250, 100)).toBe(100);
    const day: SocialWeeklyDay = { date: "2026-09-20", weekday: "شنبه", domains: { routine: 80, fitness: null, trading: 40 } };
    expect(dayAverage(day)).toBe(60);
    expect(dayAverage({ ...day, domains: { routine: null } })).toBeNull();
    expect(deltaOf(70, 60)).toBe(10);
    expect(deltaOf(null, 60)).toBeNull();
  });
});

describe("SocialApi transport", () => {
  function transport(status: number, body: unknown, calls: unknown[][] = []) {
    return {
      calls,
      async authedRaw(...args: unknown[]) {
        calls.push(args);
        return new Response(JSON.stringify(body), { status });
      },
    };
  }

  it("builds GET query strings and POST bodies from the contract endpoints", async () => {
    const t = transport(200, { ok: true });
    const api = createSocialApi(t);
    await api.chat({ symbol: "EURUSD", since: "2026-01-01T00:00:00.000Z" });
    await api.accept("f1");
    await api.block("u 1", false);
    expect(t.calls[0][0]).toBe("GET");
    expect(t.calls[0][1]).toBe("/api/mobile/social/chat?symbol=EURUSD&since=2026-01-01T00%3A00%3A00.000Z");
    expect(t.calls[1]).toEqual(["POST", "/api/mobile/social/friends/accept", { friendshipId: "f1" }, undefined]);
    expect(t.calls[2][1]).toBe("/api/mobile/social/users/u%201/block");
    expect(t.calls[2][2]).toEqual({ blocked: false });
  });

  it("maps server errors and network failures", async () => {
    await expect(createSocialApi(transport(403, { error: "module_locked" })).chatRooms()).rejects.toSatisfy(isModuleLocked);
    await expect(createSocialApi(transport(409, { error: "rules_not_accepted" })).sendChat("EURUSD", "x")).rejects.toSatisfy(isRulesNotAccepted);
    const offline = createSocialApi({
      async authedRaw() {
        throw Object.assign(new Error("network"), { kind: "network" });
      },
    });
    const err = await offline.friends("routine").catch((e) => e);
    expect(isOffline(err)).toBe(true);
    expect(describeSocialError(err)).toBe(NEED_INTERNET_LONG);
    expect(describeSocialError(new SocialApiError(429, "کمی آرام‌تر"))).toBe("کمی آرام‌تر");
    expect(describeSocialError(new SocialApiError(404, "not found"))).not.toBe("not found");
  });
});

describe("offline cache (arion-social)", () => {
  beforeEach(() => clearSocialCache());

  it("stores and restores the last data per key, and clears on logout", async () => {
    expect(await readCache(cacheKeys.friends("routine"))).toBeNull();
    await writeCache(cacheKeys.friends("routine"), { module: "routine", friends: [] });
    const hit = await readCache<{ module: string }>(cacheKeys.friends("routine"));
    expect(hit?.value.module).toBe("routine");
    expect(typeof hit?.savedAt).toBe("string");
    await clearSocialCache();
    expect(await readCache(cacheKeys.friends("routine"))).toBeNull();
  });
});
