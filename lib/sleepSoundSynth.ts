import type { SleepSoundKind } from "@/lib/sleepSoundCatalog";

// سنتز صداهای خواب با WebAudio: بافر نویز + فیلتر + LFO + رویدادهای تصادفی (بدون فایل صوتی و بدون پردازش دستی هر نمونه در زمان پخش).

export type Voice = { out: GainNode; dispose: () => void };
type NoiseType = "white" | "pink" | "brown";

const noiseCache: Partial<Record<NoiseType, AudioBuffer>> = {};

export function makeNoise(c: AudioContext, type: NoiseType): AudioBuffer {
  const hit = noiseCache[type];
  if (hit && hit.sampleRate === c.sampleRate) return hit;
  const len = Math.floor(c.sampleRate * 6);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  if (type === "white") {
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  } else if (type === "pink") {
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.969 * b2 + w * 0.153852; b3 = 0.8665 * b3 + w * 0.3104856;
      b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
      d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926;
    }
  } else {
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5;
    }
  }
  // درز حلقه: انتهای بافر رو به ابتدا محو می‌کنیم تا کلیک نیاد
  const x = Math.floor(c.sampleRate * 0.25);
  for (let i = 0; i < x; i++) {
    const t = i / x;
    d[i] = d[i] * t + d[len - x + i] * (1 - t);
  }
  const out = c.createBuffer(1, len - x, c.sampleRate);
  out.getChannelData(0).set(d.subarray(0, len - x));
  noiseCache[type] = out;
  return out;
}

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];

class Kit {
  readonly out: GainNode;
  readonly nodes: AudioScheduledSourceNode[] = [];
  readonly timers: ReturnType<typeof setInterval>[] = [];
  dead = false;
  constructor(readonly c: AudioContext) {
    this.out = c.createGain();
    this.out.gain.value = 0;
  }
  /** منبع نویز حلقه‌ای با شروع تصادفی */
  noise(type: NoiseType, rate = 1): AudioBufferSourceNode {
    const s = this.c.createBufferSource();
    s.buffer = makeNoise(this.c, type);
    s.loop = true;
    s.playbackRate.value = rate;
    s.start(0, Math.random() * 3);
    this.nodes.push(s);
    return s;
  }
  filter(type: BiquadFilterType, freq: number, q = 0.7): BiquadFilterNode {
    const f = this.c.createBiquadFilter();
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    return f;
  }
  gain(v: number): GainNode {
    const g = this.c.createGain(); g.gain.value = v; return g;
  }
  /** زنجیره‌ی گره‌ها؛ آخرین گره برگردونده می‌شه */
  chain<T extends AudioNode>(...n: AudioNode[]): T {
    for (let i = 0; i < n.length - 1; i++) n[i].connect(n[i + 1]);
    return n[n.length - 1] as T;
  }
  lfo(freq: number, depth: number, target: AudioParam, type: OscillatorType = "sine") {
    const o = this.c.createOscillator(); o.type = type; o.frequency.value = freq;
    const g = this.gain(depth);
    o.connect(g).connect(target); o.start(); this.nodes.push(o);
  }
  /** نوسان کند و نامنظم دور مقدار پایه (دو LFO با فرکانس ناهم‌اندازه) */
  drift(target: AudioParam, depth: number, minHz = 0.03, maxHz = 0.13) {
    this.lfo(rnd(minHz, maxHz), depth * 0.6, target);
    this.lfo(rnd(minHz, maxHz) * 1.7, depth * 0.4, target);
  }
  osc(freq: number, type: OscillatorType = "sine"): OscillatorNode {
    const o = this.c.createOscillator(); o.type = type; o.frequency.value = freq; o.start(); this.nodes.push(o);
    return o;
  }
  /** زمان‌بند رویداد با نگاه به جلو؛ تابع می‌تونه فاصله‌ی تا رویداد بعدی رو برگردونه */
  events(minS: number, maxS: number, fn: (t: number) => number | void, first = 0) {
    let next = this.c.currentTime + first;
    const fill = () => {
      if (this.dead) return;
      const lim = this.c.currentTime + 1.5;
      for (let n = 0; next < lim && n < 60; n++) {
        const gap = fn(Math.max(next, this.c.currentTime));
        next += typeof gap === "number" ? gap : rnd(minS, maxS);
      }
    };
    fill();
    this.timers.push(setInterval(fill, 400));
  }
  /** انفجار کوتاه نویز از بافر سفید یا قهوه‌ای */
  burst(t: number, o: { type?: NoiseType; ft: BiquadFilterType; f: number; q: number; peak: number; atk: number; dec: number; rate?: number; dest?: AudioNode }) {
    const c = this.c;
    const s = c.createBufferSource(); s.buffer = makeNoise(c, o.type ?? "white");
    if (o.rate) s.playbackRate.value = o.rate;
    const f = this.filter(o.ft, o.f, o.q);
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(o.peak, t + o.atk);
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.atk + o.dec);
    s.connect(f).connect(g).connect(o.dest ?? this.out);
    s.start(t, Math.random() * 4, o.atk + o.dec + 0.03);
  }
  /** نت کوتاه با افت تدریجی */
  tone(t: number, freq: number, peak: number, atk: number, dec: number, o: { type?: OscillatorType; endFreq?: number; dest?: AudioNode } = {}) {
    const c = this.c;
    const os = c.createOscillator(); os.type = o.type ?? "sine";
    os.frequency.setValueAtTime(freq, t);
    if (o.endFreq) os.frequency.exponentialRampToValueAtTime(o.endFreq, t + atk + dec);
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + atk);
    g.gain.exponentialRampToValueAtTime(0.0001, t + atk + dec);
    os.connect(g).connect(o.dest ?? this.out);
    os.start(t); os.stop(t + atk + dec + 0.05);
  }
  dispose() {
    this.dead = true;
    this.timers.forEach(clearInterval);
    this.nodes.forEach((n) => { try { n.stop(); } catch { /* قبلا متوقف شده */ } });
    try { this.out.disconnect(); } catch { /* */ }
  }
}

// ───── طرح‌ها ─────
function plainNoise(k: Kit, type: NoiseType, level: number) {
  k.chain(k.noise(type), k.gain(level), k.out);
}

function rainBed(k: Kit, hp: number, lp: number, level: number) {
  const g = k.gain(level);
  k.chain(k.noise("pink"), k.filter("highpass", hp), k.filter("lowpass", lp), g, k.out);
  k.lfo(0.11, level * 0.15, g.gain);
}

function rain(k: Kit) {
  rainBed(k, 500, 7000, 0.5);
  k.events(0.025, 0.135, (t) => k.burst(t, { ft: "bandpass", f: rnd(1800, 6000), q: 4, peak: rnd(0.05, 0.17), atk: 0.004, dec: 0.045 }));
}

function rainHeavy(k: Kit) {
  rainBed(k, 350, 9000, 0.7);
  k.chain(k.noise("white"), k.filter("highpass", 5000), k.gain(0.07), k.out);
  k.events(0.008, 0.04, (t) => k.burst(t, { ft: "bandpass", f: rnd(1500, 7000), q: 3, peak: rnd(0.04, 0.12), atk: 0.003, dec: 0.04 }));
}

function rainRoof(k: Kit) {
  const g = k.gain(0.35);
  k.chain(k.noise("pink"), k.filter("highpass", 250), k.filter("lowpass", 4500), g, k.out);
  k.drift(g.gain, 0.08);
  k.events(0.012, 0.06, (t) => k.burst(t, { ft: "bandpass", f: rnd(700, 2400), q: 7, peak: rnd(0.06, 0.2), atk: 0.003, dec: 0.07 }));
  k.events(0.6, 2.2, (t) => k.burst(t, { ft: "bandpass", f: rnd(400, 900), q: 12, peak: rnd(0.2, 0.35), atk: 0.004, dec: 0.16 }));
}

function thunder(k: Kit, t: number) {
  const c = k.c;
  const dur = rnd(5, 10);
  const s = c.createBufferSource(); s.buffer = makeNoise(c, "brown"); s.playbackRate.value = 0.8;
  const lp = k.filter("lowpass", 500, 0.6);
  lp.frequency.setValueAtTime(500, t);
  lp.frequency.exponentialRampToValueAtTime(70, t + dur);
  const g = c.createGain();
  const peak = rnd(0.55, 0.95);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + rnd(0.4, 1.4));
  g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
  s.connect(lp).connect(g).connect(k.out);
  s.start(t, Math.random() * 4, dur + 0.1);
  k.burst(t, { ft: "bandpass", f: 180, q: 0.5, peak: 0.25, atk: 0.05, dec: 1.4, type: "brown" });
  if (Math.random() < 0.6) k.burst(t + rnd(1.6, 3.2), { ft: "lowpass", f: 220, q: 0.5, peak: peak * 0.4, atk: 0.5, dec: 3, type: "brown", rate: 0.7 });
}

function storm(k: Kit) {
  rainBed(k, 400, 8000, 0.5);
  k.events(0.012, 0.06, (t) => k.burst(t, { ft: "bandpass", f: rnd(1500, 6500), q: 3, peak: rnd(0.04, 0.11), atk: 0.003, dec: 0.04 }));
  k.events(14, 38, (t) => thunder(k, t), 5);
}

function ocean(k: Kit) {
  const lp = k.filter("lowpass", 520, 0.5);
  const g = k.gain(0.4);
  k.chain(k.noise("brown", 0.9), lp, g, k.out);
  k.lfo(0.083, 0.28, g.gain); k.lfo(0.127, 0.12, g.gain);
  k.lfo(0.083, 220, lp.frequency);
  const foam = k.gain(0.02);
  k.chain(k.noise("white"), k.filter("highpass", 1800), k.filter("lowpass", 6000), foam, k.out);
  k.lfo(0.083, 0.03, foam.gain); k.lfo(0.127, 0.012, foam.gain);
}

function stream(k: Kit) {
  k.chain(k.noise("pink"), k.filter("highpass", 300), k.filter("lowpass", 3000), k.gain(0.22), k.out);
  for (const f of [700, 1400, 2600]) {
    const bp = k.filter("bandpass", f, 3), g = k.gain(0.12);
    k.chain(k.noise("white", rnd(0.9, 1.1)), bp, g, k.out);
    k.drift(g.gain, 0.08, 0.2, 0.7);
    k.drift(bp.frequency, f * 0.25, 0.3, 1.2);
  }
  k.events(0.06, 0.25, (t) => {
    const f = rnd(500, 1400);
    k.tone(t, f, rnd(0.03, 0.08), 0.004, 0.05, { endFreq: f * 1.5 });
  });
}

function wind(k: Kit) {
  const bp = k.filter("bandpass", 500, 1.1), g = k.gain(0.5);
  k.chain(k.noise("pink"), bp, g, k.out);
  k.drift(bp.frequency, 280, 0.04, 0.13);
  k.drift(g.gain, 0.3, 0.03, 0.09);
  k.chain(k.noise("brown"), k.filter("lowpass", 250), k.gain(0.3), k.out);
  const wb = k.filter("bandpass", 1100, 20), wg = k.gain(0.03);
  k.chain(k.noise("white"), wb, wg, k.out);
  k.drift(wb.frequency, 350, 0.05, 0.15);
  k.drift(wg.gain, 0.03, 0.04, 0.12);
}

function forest(k: Kit) {
  const wg = k.gain(0.1);
  k.chain(k.noise("pink"), k.filter("lowpass", 450), wg, k.out);
  k.drift(wg.gain, 0.05);
  for (const f of [4300, 4650, 5100, 3900]) {
    const o = k.osc(f);
    k.drift(o.frequency, 30, 0.04, 0.12);
    const chirp = k.gain(0.5), gate = k.gain(0.5), pk = k.gain(0.012);
    k.lfo(rnd(13, 21), 0.5, chirp.gain);
    k.lfo(rnd(0.25, 0.6), 0.5, gate.gain);
    k.chain(o, chirp, gate, pk, k.out);
  }
  k.events(9, 26, (t) => {
    k.tone(t, 420, 0.05, 0.15, 0.5);
    k.tone(t + 0.75, 370, 0.045, 0.15, 0.7);
  }, 6);
}

function fire(k: Kit) {
  const base = k.gain(0.35);
  k.chain(k.noise("brown"), k.filter("lowpass", 350), base, k.out);
  k.drift(base.gain, 0.1, 0.08, 0.3);
  const hiss = k.gain(0.05);
  k.chain(k.noise("pink"), k.filter("highpass", 2500), k.filter("lowpass", 7000), hiss, k.out);
  k.drift(hiss.gain, 0.03, 0.1, 0.4);
  k.events(0.03, 0.35, (t) => k.burst(t, { ft: "bandpass", f: rnd(1200, 6500), q: rnd(1.5, 4), peak: rnd(0.1, 0.45), atk: 0.002, dec: rnd(0.01, 0.05) }));
  k.events(2, 9, (t) => k.burst(t, { ft: "bandpass", f: rnd(300, 900), q: 2, peak: 0.6, atk: 0.003, dec: 0.09 }));
}

function fan(k: Kit) {
  const g = k.gain(0.55);
  k.chain(k.noise("pink"), k.filter("lowpass", 900), g, k.out);
  k.lfo(0.17, 0.04, g.gain);
  k.chain(k.osc(110), k.gain(0.025), k.out);
}

function ac(k: Kit) {
  k.chain(k.noise("brown"), k.filter("lowpass", 600), k.gain(0.7), k.out);
  k.chain(k.noise("white"), k.filter("bandpass", 3000, 0.4), k.gain(0.03), k.out);
  k.chain(k.osc(120), k.gain(0.014), k.out);
  k.chain(k.osc(60), k.gain(0.02), k.out);
}

function cabin(k: Kit) {
  const g = k.gain(0.85);
  k.chain(k.noise("brown"), k.filter("lowpass", 500), g, k.out);
  k.lfo(0.07, 0.05, g.gain);
  k.chain(k.noise("pink"), k.filter("bandpass", 900, 0.4), k.gain(0.25), k.out);
  k.chain(k.noise("white"), k.filter("highpass", 3500), k.gain(0.02), k.out);
  k.chain(k.osc(92), k.gain(0.02), k.out);
  k.chain(k.osc(94.3), k.gain(0.02), k.out);
}

function train(k: Kit) {
  const r = k.gain(0.7);
  k.chain(k.noise("brown"), k.filter("lowpass", 220), r, k.out);
  k.drift(r.gain, 0.1, 0.05, 0.2);
  k.chain(k.noise("pink"), k.filter("bandpass", 400, 0.8), k.gain(0.15), k.out);
  const clack = (t: number, s: number) => {
    k.burst(t, { ft: "bandpass", f: 1100, q: 1.2, peak: 0.35 * s, atk: 0.002, dec: 0.06 });
    k.burst(t, { ft: "bandpass", f: 2600, q: 2, peak: 0.12 * s, atk: 0.002, dec: 0.03 });
    k.tone(t, 70, 0.5 * s, 0.003, 0.1, { endFreq: 45 });
  };
  k.events(0.5, 0.5, (t) => {
    clack(t, 1);
    clack(t + 0.13, 0.7);
    if (Math.random() < 0.08) clack(t + 0.26, 0.5);
    return 0.6 + 0.04 * Math.sin(t / 30);
  });
}

function city(k: Kit) {
  const g = k.gain(0.6);
  k.chain(k.noise("brown"), k.filter("lowpass", 220), g, k.out);
  k.drift(g.gain, 0.15, 0.04, 0.12);
  const m = k.gain(0.08);
  k.chain(k.noise("pink"), k.filter("bandpass", 600, 0.3), m, k.out);
  k.drift(m.gain, 0.04, 0.05, 0.15);
  k.events(5, 16, (t) => {
    const dur = rnd(3, 5), peak = rnd(0.08, 0.15);
    const s = k.c.createBufferSource(); s.buffer = makeNoise(k.c, "white");
    const bp = k.filter("bandpass", 250, 1);
    bp.frequency.setValueAtTime(250, t);
    bp.frequency.linearRampToValueAtTime(700, t + dur / 2);
    bp.frequency.linearRampToValueAtTime(250, t + dur);
    const eg = k.gain(0);
    eg.gain.setValueAtTime(0, t);
    eg.gain.linearRampToValueAtTime(peak, t + dur / 2);
    eg.gain.linearRampToValueAtTime(0, t + dur);
    s.connect(bp).connect(eg).connect(k.out);
    s.start(t, Math.random() * 4, dur + 0.05);
  }, 2);
}

function cafe(k: Kit) {
  [[420, 2, 3.1], [900, 3, 4.3], [1700, 3, 5.2]].forEach(([f, q, rate]) => {
    const g = k.gain(0.12);
    k.chain(k.noise("pink", rnd(0.9, 1.1)), k.filter("bandpass", f, q), g, k.out);
    k.lfo(rate, 0.08, g.gain);
    k.drift(g.gain, 0.08, 0.2, 0.6);
  });
  k.chain(k.noise("pink"), k.filter("lowpass", 700), k.gain(0.1), k.out);
  k.events(3, 11, (t) => {
    const f = rnd(3200, 5200), p = rnd(0.02, 0.04);
    k.tone(t, f, p, 0.002, 0.25);
    k.tone(t, f * 1.5, p * 0.5, 0.002, 0.15);
  }, 2);
}

function heartbeat(k: Kit) {
  const w = k.gain(0.5);
  k.chain(k.noise("brown"), k.filter("lowpass", 350), w, k.out);
  k.lfo(0.5, 0.08, w.gain);
  k.chain(k.noise("pink"), k.filter("bandpass", 200, 0.7), k.gain(0.1), k.out);
  const thump = (t: number, s: number) => k.tone(t, 75, 0.7 * s, 0.01, 0.14, { endFreq: 42 });
  k.events(0.86, 0.86, (t) => {
    thump(t, 1);
    thump(t + 0.27, 0.65);
    return 0.86 + rnd(-0.015, 0.015);
  });
}

function bowl(k: Kit) {
  k.events(11, 20, (t) => {
    const f0 = pick([196, 220, 247, 262, 294]);
    [[1, 0.5, 14], [2.76, 0.2, 9], [5.4, 0.08, 5]].forEach(([m, p, d]) => {
      for (const det of [-0.4, 0.4]) k.tone(t, f0 * m + det, p * 0.12, 0.02, d);
    });
  }, 0.3);
}

function drone(k: Kit) {
  const lp = k.filter("lowpass", 700, 0.3);
  lp.connect(k.out);
  [[55, 0.1], [82.41, 0.07], [110, 0.07], [164.81, 0.04], [220, 0.02]].forEach(([f, lv]) => {
    for (const det of [-0.25, 0.25]) {
      const g = k.gain(lv);
      k.chain(k.osc(f + det), g, lp);
      k.drift(g.gain, lv * 0.5, 0.03, 0.08);
    }
  });
  k.chain(k.noise("brown"), k.filter("lowpass", 150), k.gain(0.1), k.out);
}

function chimes(k: Kit) {
  k.chain(k.noise("pink"), k.filter("bandpass", 400, 0.8), k.gain(0.02), k.out);
  const notes = [784, 880, 1047, 1175, 1319, 1568];
  k.events(2.5, 9, (t) => {
    const n = 1 + Math.floor(Math.random() * 3);
    let at = t;
    for (let i = 0; i < n; i++) {
      const f = pick(notes), p = rnd(0.035, 0.07);
      k.tone(at, f, p, 0.003, rnd(3, 5));
      k.tone(at, f * 2.76, p * 0.2, 0.003, 1.5);
      at += rnd(0.12, 0.3);
    }
  }, 1);
}

const BUILDERS: Record<SleepSoundKind, (k: Kit) => void> = {
  white: (k) => plainNoise(k, "white", 0.3),
  pink: (k) => plainNoise(k, "pink", 0.55),
  brown: (k) => plainNoise(k, "brown", 0.6),
  rain, rainHeavy, rainRoof, storm, ocean, stream, wind, forest, fire,
  fan, ac, cabin, train, city, cafe,
  heartbeat, bowl, drone, chimes,
};

export function buildVoice(c: AudioContext, kind: SleepSoundKind): Voice {
  const k = new Kit(c);
  BUILDERS[kind](k);
  return { out: k.out, dispose: () => k.dispose() };
}
