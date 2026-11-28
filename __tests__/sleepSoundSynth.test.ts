import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SLEEP_SOUND_KINDS } from "@/lib/sleepSoundCatalog";
import { MAX_CONCURRENT_SOURCES, MAX_LOOP_RATE, MIN_LOOP_PERIOD_S, NOISE_LOOP_S, buildVoice, type VoiceReport } from "@/lib/sleepSoundSynth";

// context ساختگی: هر گره/پارامتر یک Proxy ساده‌ست تا طرح‌ها بدون WebAudio واقعی اجرا بشن و گزارش دوره‌ها خونده بشه.
function fakeNode(): unknown {
  const store: Record<string | symbol, unknown> = {};
  const target = function () { /* */ };
  const p: unknown = new Proxy(target, {
    get(_t, prop) {
      if (prop in store) return store[prop];
      if (prop === "connect") return (d: unknown) => d;
      return fakeNode();
    },
    set(_t, prop, v) { store[prop] = v; return true; },
    apply() { return undefined; },
  });
  return p;
}
function fakeCtx() {
  const st = { currentTime: 0 };
  const ctx = new Proxy({} as Record<string, unknown>, {
    get(_t, prop) {
      if (prop === "currentTime") return st.currentTime;
      if (prop === "sampleRate") return 44100;
      if (prop === "createBuffer") return (_ch: number, length: number, sampleRate: number) => ({ length, sampleRate, duration: length / sampleRate, getChannelData: () => new Float32Array(length) });
      if (typeof prop === "string" && prop.startsWith("create")) return () => fakeNode();
      return undefined;
    },
  });
  return { ctx: ctx as unknown as AudioContext, st };
}

const SIMPLE = [[1, 1], [1, 2], [1, 3], [1, 4], [2, 3], [3, 4]];
/** آیا دوره‌ها نسبت ساده (مثل 2 به 1 یا 3 به 2) ندارن؟ پس ترکیبشون عملا هیچ‌وقت تکرار نمی‌شه */
function incommensurate(periods: number[]): boolean {
  for (let i = 0; i < periods.length; i++) for (let j = i + 1; j < periods.length; j++) {
    const r = Math.max(periods[i], periods[j]) / Math.min(periods[i], periods[j]);
    if (SIMPLE.some(([a, b]) => Math.abs(r - Math.max(a, b) / Math.min(a, b)) / r < 0.01)) return false;
  }
  return periods.length >= 2;
}

const METRONOME_OK: Record<string, number | null> = { clock: null, train: 30, heartbeat: 30 };

function checkReport(kind: string, r: VoiceReport) {
  expect(r.maxConcurrent, `${kind} concurrent sources`).toBeLessThanOrEqual(MAX_CONCURRENT_SOURCES);
  for (const p of r.loops) expect(p, `${kind} loop`).toBeGreaterThanOrEqual(MIN_LOOP_PERIOD_S);
  for (const m of r.mods) {
    if (m.texture) continue;
    expect(incommensurate(m.periodsS) || Math.min(...m.periodsS) >= MIN_LOOP_PERIOD_S, `${kind} mod ${m.periodsS}`).toBe(true);
  }
  for (const e of r.events) {
    if (e.kind === "metronome") {
      expect(kind in METRONOME_OK, `${kind} metronome`).toBe(true);
      const need = METRONOME_OK[kind];
      if (need) expect(e.driftPeriodS ?? 0, `${kind} tempo drift`).toBeGreaterThanOrEqual(need);
    } else {
      expect(e.maxGap, `${kind} gap range`).toBeGreaterThanOrEqual(e.minGap * 1.4);
    }
  }
}

describe("سنتز صداهای خواب: ضدتکرار", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("بافرهای نویز حلقه‌ای حتی با بیشترین سرعت پخش از 30 ثانیه بلندترن", () => {
    for (const len of NOISE_LOOP_S) expect(len / MAX_LOOP_RATE).toBeGreaterThanOrEqual(MIN_LOOP_PERIOD_S);
    expect(NOISE_LOOP_S[0]).not.toBe(NOISE_LOOP_S[1]);
  });

  for (const kind of SLEEP_SOUND_KINDS) {
    it(`${kind}: طرح اجرا می‌شه و دوره‌ها و فاصله‌ها ضدتکرارن`, () => {
      const { ctx, st } = fakeCtx();
      const v = buildVoice(ctx, kind);
      // دو دقیقه زمان شبیه‌سازی‌شده تا زمان‌بند رویدادها بارها اجرا بشه
      for (let i = 0; i < 240; i++) { st.currentTime += 0.5; vi.advanceTimersByTime(500); }
      const r = v.report;
      expect(r.loops.length + r.mods.length + r.events.length, `${kind} report`).toBeGreaterThan(0);
      checkReport(kind, r);
      v.dispose();
    });
  }
});
