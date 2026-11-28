import { describe, it, expect } from "vitest";
import {
  MAX_SOUND_LAYERS, SLEEP_SOUND_CATALOG, SLEEP_SOUND_CATEGORIES, SLEEP_SOUND_KINDS, normalizeLayers, setLayerVolume,
  soundName, soundsOfCategory, toggleLayer,
} from "@/lib/sleepSoundCatalog";
import {
  DEFAULT_PREFS, FADE_OUT_MS, clampVolume, fadeFactor, formatRemaining, parseSleepSoundPrefs, remainingMs,
} from "@/lib/sleepSound";

describe("صداهای خواب", () => {
  it("تنظیمات خراب به پیش‌فرض برمی‌گرده", () => {
    expect(parseSleepSoundPrefs(null)).toEqual(DEFAULT_PREFS);
    expect(parseSleepSoundPrefs("{bad")).toEqual(DEFAULT_PREFS);
    expect(parseSleepSoundPrefs("42")).toEqual(DEFAULT_PREFS);
  });
  it("تنظیمات معتبر خونده و پاکسازی می‌شه", () => {
    expect(parseSleepSoundPrefs('{"kind":"ocean","volume":0.3,"timerMin":45}')).toEqual({ layers: [{ kind: "ocean", volume: 0.8 }], volume: 0.3, timerMin: 45 });
    expect(parseSleepSoundPrefs('{"kind":"x","volume":9,"timerMin":7}')).toEqual({ ...DEFAULT_PREFS, volume: 1 });
    const mixed = parseSleepSoundPrefs('{"layers":[{"kind":"storm","volume":0.5},{"kind":"storm"},{"kind":"bad"},{"kind":"fire","volume":3},{"kind":"fan"},{"kind":"cafe"}]}');
    expect(mixed.layers.map((l) => l.kind)).toEqual(["storm", "fire", "fan"]);
    expect(mixed.layers[1].volume).toBe(1);
  });
  it("حجم محدود می‌شه", () => {
    expect(clampVolume(-1)).toBe(0);
    expect(clampVolume(2)).toBe(1);
    expect(clampVolume("abc")).toBe(DEFAULT_PREFS.volume);
  });
  it("باقی‌مانده تایمر", () => {
    expect(remainingMs(null, 5)).toBeNull();
    expect(remainingMs(1000, 400)).toBe(600);
    expect(remainingMs(1000, 2000)).toBe(0);
  });
  it("فید آخر دقیقه نرم و یکنواخت کم می‌شه", () => {
    expect(fadeFactor(null)).toBe(1);
    expect(fadeFactor(FADE_OUT_MS)).toBe(1);
    expect(fadeFactor(FADE_OUT_MS / 2)).toBeCloseTo(0.5);
    expect(fadeFactor(0)).toBe(0);
    expect(fadeFactor(45_000)).toBeGreaterThan(fadeFactor(15_000));
  });
  it("قالب زمان", () => {
    expect(formatRemaining(0)).toBe("0:00");
    expect(formatRemaining(61_000)).toBe("1:01");
    expect(formatRemaining(3_600_000)).toBe("1:00:00");
    expect(formatRemaining(900_000 - 1)).toBe("15:00");
  });

  it("فهرست صداها کامل و دسته‌بندی‌شده‌ست", () => {
    expect(SLEEP_SOUND_KINDS.length).toBeGreaterThanOrEqual(40);
    for (const k of ["white", "pink", "brown", "rain", "ocean", "fan"] as const) expect(SLEEP_SOUND_KINDS).toContain(k);
    const all = SLEEP_SOUND_CATEGORIES.flatMap((c) => soundsOfCategory(c));
    expect([...all].sort()).toEqual([...SLEEP_SOUND_KINDS].sort());
    for (const c of SLEEP_SOUND_CATEGORIES) expect(soundsOfCategory(c).length).toBeGreaterThan(0);
    expect(SLEEP_SOUND_CATALOG.storm).toBe("water");
    expect(SLEEP_SOUND_CATEGORIES).toHaveLength(5);
    expect(new Set(SLEEP_SOUND_KINDS).size).toBe(SLEEP_SOUND_KINDS.length);
    for (const k of SLEEP_SOUND_KINDS) expect(soundName(k).length).toBeGreaterThan(0);
  });
  it("نوع ناشناخته در تنظیمات ذخیره‌شده بی‌صدا حذف می‌شه", () => {
    expect(parseSleepSoundPrefs('{"layers":[{"kind":"gone","volume":0.5},{"kind":"owls","volume":0.4}]}').layers).toEqual([{ kind: "owls", volume: 0.4 }]);
    expect(parseSleepSoundPrefs('{"layers":[{"kind":"gone"}]}').layers).toEqual(DEFAULT_PREFS.layers);
  });
  it("ترکیب صداها: افزودن، برداشتن و سقف", () => {
    let l = normalizeLayers(undefined, [{ kind: "rain", volume: 0.8 }]);
    l = toggleLayer(l, "fire");
    l = toggleLayer(l, "wind");
    expect(l.map((x) => x.kind)).toEqual(["rain", "fire", "wind"]);
    l = toggleLayer(l, "cafe");
    expect(l).toHaveLength(MAX_SOUND_LAYERS);
    expect(l.map((x) => x.kind)).toEqual(["fire", "wind", "cafe"]);
    l = toggleLayer(l, "wind");
    expect(l.map((x) => x.kind)).toEqual(["fire", "cafe"]);
    expect(toggleLayer([{ kind: "fire", volume: 1 }], "fire")).toHaveLength(1);
  });
  it("بلندی هر لایه جدا و محدود می‌شه", () => {
    const l = setLayerVolume([{ kind: "rain", volume: 0.8 }, { kind: "fan", volume: 0.8 }], "fan", 5);
    expect(l.find((x) => x.kind === "fan")?.volume).toBe(1);
    expect(l.find((x) => x.kind === "rain")?.volume).toBe(0.8);
  });
});
