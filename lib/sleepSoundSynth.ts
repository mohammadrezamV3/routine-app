import type { SleepSoundKind } from "@/lib/sleepSoundCatalog";

// سنتز صداهای خواب با WebAudio: بافر نویز بلند + فیلتر + LFO ناهم‌اندازه + رویدادهای تصادفی
// (بدون فایل صوتی و بدون پردازش دستی هر نمونه در زمان پخش).
// قاعده‌ی ضدتکرار: هر بافر حلقه‌ای حداقل 30 ثانیه، هر رویداد با فاصله‌ی تصادفی (پواسون یا بازه‌ای)
// و هر نوسان کند ترکیب سه دوره با نسبت طلایی (هیچ‌وقت هم‌اندازه نیستن). Kit همه‌ی اینها رو در report ثبت می‌کنه تا تست بشه.

export type NoiseType = "white" | "pink" | "brown";
export type EventReport = { kind: "random" | "poisson" | "metronome"; minGap: number; maxGap: number; driftPeriodS?: number };
export type ModReport = { periodsS: number[]; texture: boolean };
export type VoiceReport = { loops: number[]; mods: ModReport[]; events: EventReport[] };
export type Voice = { out: GainNode; dispose: () => void; report: VoiceReport };

/** طول دو بافر نویز حلقه‌ای (ثانیه)؛ منبع‌ها یکی در میون از این دو می‌گیرن */
export const NOISE_LOOP_S = [36, 49] as const;
/** سقف سرعت پخش حلقه (با rate بالاتر دوره‌ی حلقه از 30 ثانیه کمتر می‌شد) */
export const MAX_LOOP_RATE = 1.15;
export const MIN_LOOP_PERIOD_S = 30;
const PHI = 1.6180339887;
// نرخ نمونه‌ی بافر هر نوع (مستقل از نرخ context)، تک‌کاناله تا حافظه سبک بمونه
const NOISE_RATE: Record<NoiseType, number> = { white: 32000, pink: 22050, brown: 16000 };
const NOISE_RMS: Record<NoiseType, number> = { white: 0.49, pink: 0.19, brown: 0.2 };

const noiseCache = new Map<string, AudioBuffer>();

export function makeNoise(c: BaseAudioContext, type: NoiseType, idx: 0 | 1): AudioBuffer {
  const key = `${type}${idx}`;
  const hit = noiseCache.get(key);
  if (hit) return hit;
  const rate = NOISE_RATE[type];
  const len = Math.floor(rate * NOISE_LOOP_S[idx]);
  const x = Math.floor(rate * 0.5); // درز حلقه: ادغام هم‌توان ابتدا و انتها
  const raw = new Float32Array(len + x);
  if (type === "white") {
    for (let i = 0; i < raw.length; i++) raw[i] = Math.random() * 2 - 1;
  } else if (type === "pink") {
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < raw.length; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.969 * b2 + w * 0.153852; b3 = 0.8665 * b3 + w * 0.3104856;
      b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
      raw[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362; b6 = w * 0.115926;
    }
  } else {
    const leak = 0.02 * (44100 / rate); // گوشه‌ی فرکانسی ثابت بدون وابستگی به نرخ بافر
    let last = 0;
    for (let i = 0; i < raw.length; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + leak * w) / (1 + leak); raw[i] = last;
    }
  }
  const buf = c.createBuffer(1, len, rate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = raw[i];
  for (let i = 0; i < x; i++) {
    const th = (i / x) * Math.PI / 2;
    d[i] = raw[i] * Math.sin(th) + raw[len + i] * Math.cos(th);
  }
  let s = 0, n = 0;
  for (let i = 0; i < len; i += 7) { s += d[i] * d[i]; n++; }
  const k = NOISE_RMS[type] / Math.sqrt(s / (n || 1) || 1);
  for (let i = 0; i < len; i++) d[i] *= k;
  noiseCache.set(key, buf);
  return buf;
}

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];
const sign = () => (Math.random() < 0.5 ? -1 : 1);
const midi = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
/** فاصله‌ی تصادفی نمایی با میانگین mean */
const expGap = (mean: number, min: number) => Math.min(mean * 6, Math.max(min, -Math.log(1 - Math.random()) * mean));
/** میزان فعالیت آهسته بین 0.1 و 1 با دو دوره‌ی ناهم‌اندازه (برای تراکم صدای پرندگان و زنگوله) */
const activity = (t: number) => 0.55 + 0.25 * Math.sin((2 * Math.PI * t) / 97) + 0.2 * Math.sin((2 * Math.PI * t) / 151 + 1);

type BurstOpts = {
  type?: NoiseType; ft: BiquadFilterType; f: number; q: number; peak: number; atk: number; dec: number;
  rate?: number; dest?: AudioNode; pan?: number;
};
type ToneOpts = { type?: OscillatorType; endFreq?: number; dest?: AudioNode; pan?: number };

const IR_CACHE = new Map<string, AudioBuffer>();

class Kit {
  readonly bus: GainNode; // ورودی طرح‌ها؛ بلندی ذاتی هر صدا
  readonly final: GainNode; // خروجی صدا
  readonly nodes: AudioScheduledSourceNode[] = [];
  readonly timers: ReturnType<typeof setInterval>[] = [];
  readonly report: VoiceReport = { loops: [], mods: [], events: [] };
  dead = false;
  private noiseCount = 0;
  constructor(readonly c: AudioContext, trim = 1) {
    this.final = c.createGain();
    this.final.gain.value = 0;
    this.bus = c.createGain();
    this.bus.gain.value = trim;
    this.bus.connect(this.final);
  }
  /** مقصد همه‌ی طرح‌ها */
  get out(): GainNode { return this.bus; }

  // ───── نویز ─────
  /** منبع نویز حلقه‌ای با شروع تصادفی؛ دوره‌ی حلقه >= 30 ثانیه */
  noise(type: NoiseType, rate = 1): AudioBufferSourceNode {
    const r = Math.min(MAX_LOOP_RATE, Math.max(0.5, rate));
    const idx = (this.noiseCount++ % 2) as 0 | 1;
    const buf = makeNoise(this.c, type, idx);
    const s = this.c.createBufferSource();
    s.buffer = buf; s.loop = true; s.playbackRate.value = r;
    s.start(0, Math.random() * NOISE_LOOP_S[idx]);
    this.nodes.push(s);
    this.report.loops.push(NOISE_LOOP_S[idx] / r);
    return s;
  }
  /** نویز استریو: دو منبع نابرابر (دو بافر متفاوت) چپ و راست */
  wide(type: NoiseType, rate = 1): GainNode {
    const m = this.gain(1);
    for (const side of [-1, 1]) {
      const s = this.noise(type, rate * (side < 0 ? 1 : 0.97));
      const p = this.panner(side * 0.85);
      if (p) s.connect(p).connect(m); else s.connect(m);
    }
    return m;
  }
  filter(type: BiquadFilterType, freq: number, q = 0.7): BiquadFilterNode {
    const f = this.c.createBiquadFilter();
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    return f;
  }
  gain(v: number): GainNode {
    const g = this.c.createGain(); g.gain.value = v; return g;
  }
  panner(v: number): StereoPannerNode | null {
    if (typeof this.c.createStereoPanner !== "function") return null;
    const p = this.c.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, v));
    return p;
  }
  /** گره‌ای که باید بهش وصل شد تا سیگنال با pan به dest بره */
  route(dest: AudioNode, pan = 0): AudioNode {
    if (!pan) return dest;
    const p = this.panner(pan);
    if (!p) return dest;
    p.connect(dest);
    return p;
  }
  /** زنجیره‌ی گره‌ها؛ آخرین گره برگردونده می‌شه */
  chain<T extends AudioNode>(...n: AudioNode[]): T {
    for (let i = 0; i < n.length - 1; i++) n[i].connect(n[i + 1]);
    return n[n.length - 1] as T;
  }
  osc(freq: number, type: OscillatorType = "sine"): OscillatorNode {
    const o = this.c.createOscillator(); o.type = type; o.frequency.value = freq; o.start(); this.nodes.push(o);
    return o;
  }

  // ───── مدولاسیون ─────
  /** باس مدولاسیون کند: سه دوره با نسبت طلایی (هیچ‌وقت تکرار نمی‌شن)، خروجی حدود -1 تا 1 */
  modBus(minPeriodS: number): GainNode {
    const a = minPeriodS * rnd(1, 1.2);
    const periods = [a, a * PHI, a * PHI * PHI];
    const bus = this.gain(1);
    [0.5, 0.3, 0.2].forEach((w, i) => {
      const o = this.c.createOscillator(); o.frequency.value = 1 / periods[i];
      o.connect(this.gain(w)).connect(bus); o.start(); this.nodes.push(o);
    });
    this.report.mods.push({ periodsS: periods, texture: false });
    return bus;
  }
  mod(bus: AudioNode, depth: number, target: AudioParam) {
    bus.connect(this.gain(depth)).connect(target);
  }
  drift(target: AudioParam, depth: number, minPeriodS = 17) {
    this.mod(this.modBus(minPeriodS), depth, target);
  }
  /** نوسان سریع بافتی (حداقل 1 هرتز؛ مثل لرزش پر یا پچ‌پچ) نه الگوی قابل تشخیص */
  texture(hz: number, depth: number, target: AudioParam) {
    const o = this.c.createOscillator(); o.frequency.value = Math.max(1, hz);
    o.connect(this.gain(depth)).connect(target); o.start(); this.nodes.push(o);
    this.report.mods.push({ periodsS: [1 / Math.max(1, hz)], texture: true });
  }

  // ───── رویدادها ─────
  private run(fn: (t: number) => number | void, first: number, nextGap: () => number) {
    let next = this.c.currentTime + first;
    const fill = () => {
      if (this.dead) return;
      const lim = this.c.currentTime + 3;
      for (let n = 0; next < lim && n < 300; n++) {
        const gap = fn(Math.max(next, this.c.currentTime));
        next += typeof gap === "number" ? gap : nextGap();
      }
    };
    fill();
    this.timers.push(setInterval(fill, 500));
  }
  /** فاصله‌ی یکنواخت تصادفی بین minS و maxS (تابع می‌تونه خودش فاصله‌ی بعدی رو برگردونه) */
  events(minS: number, maxS: number, fn: (t: number) => number | void, first = 0) {
    this.report.events.push({ kind: "random", minGap: minS, maxGap: maxS });
    this.run(fn, first, () => rnd(minS, maxS));
  }
  /** فاصله‌ی نمایی (پواسون) با میانگین meanS */
  poisson(meanS: number, fn: (t: number) => number | void, first = 0, minS = 0.01) {
    this.report.events.push({ kind: "poisson", minGap: minS, maxGap: meanS * 6 });
    this.run(fn, first, () => expGap(meanS, minS));
  }
  /** ضرب منظم: تابع فاصله‌ی بعدی رو برمی‌گردونه (با تغییر آهسته‌ی سرعت در driftPeriodS) */
  metronome(fn: (t: number) => number, first = 0, driftPeriodS?: number) {
    this.report.events.push({ kind: "metronome", minGap: 0, maxGap: 0, driftPeriodS });
    this.run(fn, first, () => 1);
  }

  // ───── صداهای کوتاه ─────
  /** انفجار کوتاه نویز با پوش */
  burst(t: number, o: BurstOpts) {
    const c = this.c;
    const idx = (Math.random() < 0.5 ? 0 : 1) as 0 | 1;
    const s = c.createBufferSource(); s.buffer = makeNoise(c, o.type ?? "white", idx);
    if (o.rate) s.playbackRate.value = o.rate;
    const f = this.filter(o.ft, o.f, o.q);
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(o.peak, t + o.atk);
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.atk + o.dec);
    s.connect(f).connect(g).connect(o.dest ?? this.route(this.out, o.pan ?? 0));
    s.start(t, Math.random() * (NOISE_LOOP_S[idx] - 20), o.atk + o.dec + 0.03);
  }
  /** نت کوتاه با افت تدریجی */
  tone(t: number, freq: number, peak: number, atk: number, dec: number, o: ToneOpts = {}) {
    const c = this.c;
    const os = c.createOscillator(); os.type = o.type ?? "sine";
    os.frequency.setValueAtTime(freq, t);
    if (o.endFreq) os.frequency.exponentialRampToValueAtTime(o.endFreq, t + atk + dec);
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + atk);
    g.gain.exponentialRampToValueAtTime(0.0001, t + atk + dec);
    os.connect(g).connect(o.dest ?? this.route(this.out, o.pan ?? 0));
    os.start(t); os.stop(t + atk + dec + 0.05);
  }
  /** ورودی یک فضا (reverb) ساخته‌شده از پاسخ ضربه‌ی نویز محوشونده */
  reverb(wet = 0.4, secs = 2.6): GainNode {
    const c = this.c;
    const key = `${c.sampleRate}:${secs}`;
    let ir = IR_CACHE.get(key);
    if (!ir) {
      const len = Math.floor(c.sampleRate * secs);
      ir = c.createBuffer(2, len, c.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = ir.getChannelData(ch);
        let lp = 0;
        for (let i = 0; i < len; i++) {
          lp += 0.55 * ((Math.random() * 2 - 1) - lp); // تیره‌تر
          d[i] = lp * Math.pow(1 - i / len, 2.6);
        }
      }
      IR_CACHE.set(key, ir);
    }
    const inp = this.gain(1);
    const conv = c.createConvolver(); conv.buffer = ir;
    inp.connect(this.out);
    inp.connect(conv).connect(this.gain(wet)).connect(this.out);
    return inp;
  }
  dispose() {
    this.dead = true;
    this.timers.forEach(clearInterval);
    this.nodes.forEach((n) => { try { n.stop(); } catch { /* قبلا متوقف شده */ } });
    try { this.final.disconnect(); } catch { /* */ }
  }
}

// ───── ابزارهای مشترک طرح‌ها ─────
function plainNoise(k: Kit, type: NoiseType, level: number) {
  k.chain(k.wide(type), k.gain(level), k.out);
}

/** بستر باران: نویز استریو + نوسان آهسته‌ی شدت */
function rainBed(k: Kit, hp: number, lp: number, level: number, drift = 0.15) {
  const g = k.gain(level);
  k.chain(k.wide("pink"), k.filter("highpass", hp), k.filter("lowpass", lp), g, k.out);
  k.drift(g.gain, level * drift, 19);
}

/** جیرجیرک: یک اسیلاتور دائمی با دریچه‌ی پالسی؛ هر دسته چند چیرپ و بعد سکوت */
function cricket(k: Kit, f: number, pan: number, level: number) {
  const o = k.osc(f);
  const gate = k.gain(0);
  k.chain(o, gate, k.route(k.out, pan));
  k.events(7, 28, (t) => {
    const dur = rnd(4, 14);
    const chirpRate = rnd(0.9, 1.6);
    const pulses = pick([3, 4, 5]);
    const pr = rnd(22, 34);
    o.frequency.setValueAtTime(f * rnd(0.97, 1.03), t);
    for (let at = t; at < t + dur; at += (1 / chirpRate) * rnd(0.85, 1.2)) {
      const lv = level * rnd(0.75, 1);
      for (let j = 0; j < pulses; j++) {
        const pt = at + j / pr;
        gate.gain.setValueAtTime(0, pt);
        gate.gain.linearRampToValueAtTime(lv, pt + 0.004);
        gate.gain.linearRampToValueAtTime(0, pt + 0.016);
      }
    }
    return dur + rnd(3, 12);
  }, rnd(0, 7));
}

function hoot(k: Kit, t: number, f: number, pan: number, peak: number, dest: AudioNode, long = false) {
  const dec = long ? 0.95 : 0.45;
  k.tone(t, f, peak, 0.12, dec, { endFreq: f * 0.93, dest: k.route(dest, pan) });
  k.tone(t, f * 2, peak * 0.12, 0.12, dec * 0.7, { dest: k.route(dest, pan) });
}

function owlCall(k: Kit, t: number, f: number, pan: number, peak: number, dest: AudioNode) {
  const n = pick([2, 3, 3, 4]);
  let at = t;
  for (let i = 0; i < n; i++) {
    hoot(k, at, f * rnd(0.98, 1.03), pan, peak * rnd(0.85, 1), dest, i === n - 1);
    at += i === n - 2 ? rnd(0.8, 1.1) : rnd(0.45, 0.7);
  }
  return at - t;
}

function thunder(k: Kit, t: number, far = false) {
  const c = k.c;
  const dur = far ? rnd(8, 14) : rnd(5, 10);
  const s = c.createBufferSource(); s.buffer = makeNoise(c, "brown", Math.random() < 0.5 ? 0 : 1); s.playbackRate.value = rnd(0.7, 0.9);
  const lp = k.filter("lowpass", far ? 260 : 500, 0.6);
  lp.frequency.setValueAtTime(far ? 260 : 500, t);
  lp.frequency.exponentialRampToValueAtTime(far ? 45 : 70, t + dur);
  const g = c.createGain();
  const peak = far ? rnd(0.4, 0.7) : rnd(0.55, 0.95);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + rnd(far ? 0.9 : 0.4, far ? 2.4 : 1.4));
  g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
  s.connect(lp).connect(g).connect(k.route(k.out, rnd(-0.6, 0.6)));
  s.start(t, Math.random() * 20, dur + 0.1);
  if (!far) k.burst(t, { type: "brown", ft: "bandpass", f: 180, q: 0.5, peak: 0.25, atk: 0.05, dec: 1.4 });
  const rolls = far ? pick([1, 2, 3]) : Math.random() < 0.6 ? 1 : 0;
  let at = t;
  for (let i = 0; i < rolls; i++) {
    at += rnd(1.6, far ? 5 : 3.2);
    k.burst(at, { type: "brown", ft: "lowpass", f: far ? 150 : 220, q: 0.5, peak: peak * rnd(0.25, 0.5), atk: far ? 0.9 : 0.5, dec: rnd(3, 5), rate: 0.7, pan: rnd(-0.6, 0.6) });
  }
}

// ───── طرح‌ها: نویز ─────
function pinkSoft(k: Kit) {
  const g = k.gain(0.55);
  k.chain(k.wide("pink"), k.filter("lowpass", 3200), k.filter("lowpass", 3200), g, k.out);
  k.drift(g.gain, 0.06, 31);
}
function brownDeep(k: Kit) {
  const g = k.gain(1.2);
  k.chain(k.wide("brown"), k.filter("lowpass", 180, 0.5), k.filter("lowpass", 240, 0.5), g, k.out);
  k.drift(g.gain, 0.08, 29);
}

// ───── طرح‌ها: باران و آب ─────
function rain(k: Kit) {
  rainBed(k, 500, 7000, 0.5);
  k.events(0.025, 0.135, (t) => k.burst(t, { ft: "bandpass", f: rnd(1800, 6000), q: 4, peak: rnd(0.05, 0.17), atk: 0.004, dec: 0.045 }));
  k.poisson(5, (t) => k.burst(t, { ft: "bandpass", f: rnd(900, 1700), q: 6, peak: rnd(0.08, 0.16), atk: 0.004, dec: 0.08, pan: rnd(-0.8, 0.8) }), 1, 1.2);
}

function rainHeavy(k: Kit) {
  rainBed(k, 350, 9000, 0.7);
  const hiss = k.gain(0.07);
  k.chain(k.wide("white"), k.filter("highpass", 5000), hiss, k.out);
  k.drift(hiss.gain, 0.02, 23);
  k.poisson(0.022, (t) => k.burst(t, { ft: "bandpass", f: rnd(1500, 7000), q: 3, peak: rnd(0.04, 0.12), atk: 0.003, dec: 0.04 }), 0, 0.008);
}

function rainRoof(k: Kit) {
  rainBed(k, 250, 4500, 0.35, 0.22);
  k.events(0.012, 0.06, (t) => k.burst(t, { ft: "bandpass", f: rnd(700, 2400), q: 7, peak: rnd(0.06, 0.2), atk: 0.003, dec: 0.07 }));
  k.poisson(1.3, (t) => k.burst(t, { ft: "bandpass", f: rnd(400, 900), q: 12, peak: rnd(0.2, 0.35), atk: 0.004, dec: rnd(0.1, 0.22), pan: rnd(-0.5, 0.5) }), 0, 0.2);
}

function rainTent(k: Kit) {
  rainBed(k, 600, 3200, 0.3, 0.2);
  const rustle = k.gain(0.18);
  k.chain(k.wide("brown"), k.filter("lowpass", 320), rustle, k.out);
  k.drift(rustle.gain, 0.1, 21);
  // نم‌نم روی پارچه: ضربه‌ی کوچک با رزونانس نرم
  k.poisson(0.05, (t) => k.burst(t, { ft: "bandpass", f: rnd(300, 800), q: 5, peak: rnd(0.08, 0.2), atk: 0.003, dec: rnd(0.04, 0.09), pan: rnd(-0.5, 0.5) }), 0, 0.012);
  k.poisson(0.7, (t) => k.tone(t, rnd(170, 260), rnd(0.04, 0.09), 0.004, 0.07, { endFreq: rnd(120, 160), pan: rnd(-0.6, 0.6) }), 0, 0.15);
}

function rainLeaves(k: Kit) {
  rainBed(k, 1500, 9000, 0.3, 0.18);
  const canopy = k.gain(0.12);
  k.chain(k.wide("pink"), k.filter("lowpass", 420), canopy, k.out);
  k.drift(canopy.gain, 0.08, 27);
  k.poisson(0.04, (t) => k.burst(t, { ft: "bandpass", f: rnd(2500, 7000), q: 5, peak: rnd(0.05, 0.14), atk: 0.002, dec: rnd(0.015, 0.045), pan: rnd(-0.8, 0.8) }), 0, 0.01);
  // قطره‌های درشت که از برگ می‌چکن
  k.poisson(1.1, (t) => { const f = rnd(1300, 2400); k.tone(t, f, rnd(0.03, 0.07), 0.003, 0.05, { endFreq: f * 1.35, pan: rnd(-0.8, 0.8) }); }, 0, 0.25);
}

function storm(k: Kit) {
  rainBed(k, 400, 8000, 0.5);
  k.events(0.012, 0.06, (t) => k.burst(t, { ft: "bandpass", f: rnd(1500, 6500), q: 3, peak: rnd(0.04, 0.11), atk: 0.003, dec: 0.04 }));
  k.poisson(13, (t) => thunder(k, t), 5, 12);
}

function thunderFar(k: Kit) {
  const air = k.gain(0.08);
  k.chain(k.wide("pink"), k.filter("lowpass", 260), air, k.out);
  k.drift(air.gain, 0.04, 33);
  const low = k.gain(0.1);
  k.chain(k.noise("brown"), k.filter("lowpass", 110), low, k.out);
  k.poisson(20, (t) => thunder(k, t, true), 4, 22);
}

function ocean(k: Kit) {
  const lp = k.filter("lowpass", 520, 0.5);
  const g = k.gain(0.4);
  k.chain(k.wide("brown", 0.9), lp, g, k.out);
  const swell = k.modBus(8.5);
  k.mod(swell, 0.28, g.gain);
  k.mod(swell, 220, lp.frequency);
  const foam = k.gain(0.02);
  k.chain(k.wide("white"), k.filter("highpass", 1800), k.filter("lowpass", 6000), foam, k.out);
  k.mod(swell, 0.014, foam.gain);
  k.drift(foam.gain, 0.006, 37);
}

function stream(k: Kit) {
  k.chain(k.wide("pink"), k.filter("highpass", 300), k.filter("lowpass", 3000), k.gain(0.22), k.out);
  for (const f of [700, 1400, 2600]) {
    const bp = k.filter("bandpass", f, 3), g = k.gain(0.12);
    k.chain(k.noise("white", rnd(0.9, 1.1)), bp, g, k.out);
    k.drift(g.gain, 0.08, 1.4);
    k.drift(bp.frequency, f * 0.25, 2.1);
  }
  k.poisson(0.14, (t) => {
    const f = rnd(500, 1400);
    k.tone(t, f, rnd(0.03, 0.08), 0.004, 0.05, { endFreq: f * 1.5, pan: rnd(-0.7, 0.7) });
  }, 0, 0.04);
}

function waterfall(k: Kit) {
  const body = k.gain(0.55);
  k.chain(k.wide("pink"), k.filter("highpass", 120), k.filter("lowpass", 9000), body, k.out);
  k.drift(body.gain, 0.05, 23);
  const spray = k.gain(0.22);
  k.chain(k.wide("white"), k.filter("highpass", 900), k.filter("lowpass", 11000), spray, k.out);
  k.drift(spray.gain, 0.03, 31);
  const rumble = k.gain(0.55);
  k.chain(k.noise("brown"), k.filter("lowpass", 200), rumble, k.out);
  k.drift(rumble.gain, 0.07, 41);
  k.poisson(0.35, (t) => k.burst(t, { ft: "bandpass", f: rnd(500, 2500), q: 1.5, peak: rnd(0.04, 0.1), atk: 0.01, dec: rnd(0.08, 0.25), pan: rnd(-0.9, 0.9) }), 0, 0.08);
}

function lake(k: Kit) {
  const air = k.gain(0.06);
  k.chain(k.wide("pink"), k.filter("lowpass", 500), air, k.out);
  k.drift(air.gain, 0.03, 29);
  // موج‌های کوچک که به ساحل می‌خورن
  k.poisson(5.5, (t) => k.burst(t, { ft: "bandpass", f: rnd(600, 1500), q: 0.7, peak: rnd(0.07, 0.16), atk: rnd(0.7, 1.3), dec: rnd(1.2, 2.4), pan: rnd(-0.7, 0.7) }), 1, 2.4);
  k.poisson(1.8, (t) => { const f = rnd(450, 900); k.tone(t, f, rnd(0.02, 0.05), 0.006, 0.08, { endFreq: f * 1.5, pan: rnd(-0.8, 0.8) }); }, 0, 0.35);
  k.poisson(9, (t) => k.burst(t, { type: "brown", ft: "lowpass", f: 260, q: 0.5, peak: rnd(0.1, 0.18), atk: 0.35, dec: rnd(0.8, 1.4), pan: rnd(-0.5, 0.5) }), 2, 3);
}

// ───── طرح‌ها: طبیعت ─────
function wind(k: Kit) {
  const bp = k.filter("bandpass", 500, 1.1), g = k.gain(0.5);
  k.chain(k.wide("pink"), bp, g, k.out);
  const gust = k.modBus(13);
  k.mod(gust, 280, bp.frequency);
  k.mod(gust, 0.3, g.gain);
  k.chain(k.noise("brown"), k.filter("lowpass", 250), k.gain(0.3), k.out);
  const wb = k.filter("bandpass", 1100, 20), wg = k.gain(0.03);
  k.chain(k.noise("white"), wb, wg, k.out);
  k.drift(wb.frequency, 350, 17);
  k.drift(wg.gain, 0.03, 23);
  // وزش‌های ناگهانی
  k.poisson(16, (t) => k.burst(t, { type: "pink", ft: "bandpass", f: rnd(400, 900), q: 0.9, peak: rnd(0.15, 0.3), atk: rnd(1.5, 3), dec: rnd(2.5, 5), pan: rnd(-0.6, 0.6) }), 3, 7);
}

function blizzard(k: Kit) {
  const bp = k.filter("bandpass", 700, 1.2), g = k.gain(0.65);
  k.chain(k.wide("pink"), bp, g, k.out);
  const gust = k.modBus(11);
  k.mod(gust, 400, bp.frequency);
  k.mod(gust, 0.4, g.gain);
  k.chain(k.noise("brown"), k.filter("lowpass", 220), k.gain(0.4), k.out);
  const snow = k.gain(0.06);
  k.chain(k.wide("white"), k.filter("highpass", 3500), k.filter("lowpass", 9000), snow, k.out);
  k.mod(gust, 0.04, snow.gain);
  for (const [f, lv] of [[640, 0.04], [980, 0.03]] as const) {
    const hb = k.filter("bandpass", f, 24), hg = k.gain(lv);
    k.chain(k.noise("white"), hb, hg, k.out);
    k.drift(hb.frequency, f * 0.35, 13);
    k.drift(hg.gain, lv * 0.8, 19);
  }
  k.poisson(10, (t) => k.burst(t, { type: "pink", ft: "bandpass", f: rnd(500, 1100), q: 0.8, peak: rnd(0.25, 0.45), atk: rnd(1.2, 2.5), dec: rnd(2.5, 4.5), pan: rnd(-0.7, 0.7) }), 2, 4);
}

function forest(k: Kit) {
  const wg = k.gain(0.1);
  k.chain(k.wide("pink"), k.filter("lowpass", 450), wg, k.out);
  k.drift(wg.gain, 0.05, 23);
  [[4300, -0.6], [4700, 0.5], [5150, -0.1]].forEach(([f, p]) => cricket(k, f, p, 0.012));
  const rv = k.reverb(0.35);
  k.poisson(38, (t) => { owlCall(k, t, rnd(360, 440), rnd(-0.7, 0.7), 0.045, rv); }, 8, 18);
  k.poisson(6, (t) => k.burst(t, { type: "pink", ft: "bandpass", f: rnd(1800, 3500), q: 1.5, peak: rnd(0.02, 0.05), atk: rnd(0.2, 0.6), dec: rnd(0.4, 0.9), pan: rnd(-0.8, 0.8) }), 2, 1.5);
}

function crickets(k: Kit) {
  const air = k.gain(0.05);
  k.chain(k.wide("pink"), k.filter("lowpass", 700), air, k.out);
  k.drift(air.gain, 0.02, 29);
  [[3700, -0.8], [4050, 0.7], [4350, -0.3], [4700, 0.2], [5000, -0.6], [5400, 0.5], [3900, 0.9]].forEach(([f, p]) => cricket(k, f, p, 0.02));
}

function cicada(k: Kit, f: number, pan: number, level: number) {
  const bp = k.filter("bandpass", f, 5), am = k.gain(0.55), gate = k.gain(0);
  k.chain(k.noise("white"), bp, am, gate, k.route(k.out, pan));
  k.texture(rnd(70, 110), 0.45, am.gain);
  k.drift(bp.frequency, f * 0.04, 14);
  k.events(10, 34, (t) => {
    const atk = rnd(1.5, 3.5), hold = rnd(3, 9), dec = rnd(2, 4), lv = level * rnd(0.7, 1);
    gate.gain.setValueAtTime(0, t);
    gate.gain.linearRampToValueAtTime(lv, t + atk);
    gate.gain.setValueAtTime(lv, t + atk + hold);
    gate.gain.linearRampToValueAtTime(0, t + atk + hold + dec);
    return atk + hold + dec + rnd(1.5, 7);
  }, rnd(0, 6));
}

function cicadas(k: Kit) {
  const warm = k.gain(0.06);
  k.chain(k.wide("pink"), k.filter("lowpass", 600), warm, k.out);
  k.drift(warm.gain, 0.03, 31);
  [[4800, -0.7, 0.07], [5600, 0.6, 0.06], [6400, -0.2, 0.05], [4300, 0.3, 0.05]].forEach(([f, p, l]) => cicada(k, f, p, l));
}

function frogCroak(k: Kit, t: number, f0: number, pan: number, peak: number, dest: AudioNode) {
  const c = k.c;
  const dur = rnd(0.14, 0.3);
  const saw = c.createOscillator(); saw.type = "sawtooth";
  saw.frequency.setValueAtTime(f0, t);
  saw.frequency.exponentialRampToValueAtTime(f0 * rnd(0.7, 0.9), t + dur);
  const bp = k.filter("bandpass", f0 * 3, 3.5);
  const am = c.createGain(); am.gain.value = 0.6;
  const lfo = c.createOscillator(); lfo.frequency.value = rnd(32, 50);
  lfo.connect(k.gain(0.4)).connect(am.gain);
  const env = c.createGain();
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(peak, t + 0.03);
  env.gain.linearRampToValueAtTime(0, t + dur);
  saw.connect(bp).connect(am).connect(env).connect(k.route(dest, pan));
  saw.start(t); lfo.start(t); saw.stop(t + dur + 0.05); lfo.stop(t + dur + 0.05);
}

function frogs(k: Kit) {
  const air = k.gain(0.06);
  k.chain(k.wide("pink"), k.filter("lowpass", 380), air, k.out);
  k.drift(air.gain, 0.03, 27);
  const rv = k.reverb(0.3, 2);
  // قورباغه‌های درشت: هر کدوم دسته‌ی چند قارقار و بعد سکوت
  [[190, -0.6], [240, 0.5], [300, -0.1], [215, 0.8]].forEach(([f0, p]) => {
    k.events(8, 34, (t) => {
      const n = pick([2, 3, 4, 6, 8]);
      let at = t;
      for (let i = 0; i < n; i++) {
        frogCroak(k, at, f0 * rnd(0.94, 1.06), p, rnd(0.03, 0.06), rv);
        at += rnd(0.3, 0.62);
      }
      return at - t + rnd(4, 18);
    }, rnd(0, 8));
  });
  // قورباغه‌ی درختی: پیپ‌های تیز سریع
  [[2300, 0.4], [2800, -0.5]].forEach(([f, p]) => {
    k.events(6, 26, (t) => {
      const n = pick([4, 6, 9, 12]);
      let at = t;
      for (let i = 0; i < n; i++) { k.tone(at, f * rnd(0.97, 1.04), rnd(0.012, 0.022), 0.004, 0.05, { dest: k.route(rv, p) }); at += rnd(0.1, 0.17); }
      return at - t + rnd(3, 14);
    }, rnd(2, 10));
  });
}

function owls(k: Kit) {
  const air = k.gain(0.08);
  k.chain(k.wide("brown"), k.filter("lowpass", 240), air, k.out);
  k.drift(air.gain, 0.04, 27);
  const leaves = k.gain(0.05);
  k.chain(k.wide("pink"), k.filter("bandpass", 600, 0.6), leaves, k.out);
  k.drift(leaves.gain, 0.04, 21);
  const rv = k.reverb(0.5, 3);
  cricket(k, 4200, 0.7, 0.008);
  k.events(10, 30, (t) => {
    const len = owlCall(k, t, rnd(330, 400), -0.5, 0.06, rv);
    if (Math.random() < 0.6) owlCall(k, t + len + rnd(1.5, 4.5), rnd(400, 480), 0.55, 0.045, rv);
    return len + rnd(8, 24);
  }, 3);
  k.poisson(60, (t) => { owlCall(k, t, rnd(480, 560), rnd(-0.9, 0.9), 0.014, rv); }, 14, 25);
}

function birdNote(k: Kit, t: number, f1: number, f2: number, dur: number, peak: number, dest: AudioNode) {
  k.tone(t, f1, peak, 0.006, dur, { endFreq: f2, dest });
}

function dawnBirds(k: Kit) {
  const air = k.gain(0.05);
  k.chain(k.wide("pink"), k.filter("lowpass", 1100), air, k.out);
  k.drift(air.gain, 0.025, 31);
  const rv = k.reverb(0.3, 2.2);
  const gate = (t: number, boost = 1) => Math.random() < Math.min(1, activity(t) * boost);
  // بلبل‌وار: عبارت چندنت با کانتور تصادفی
  k.poisson(7, (t) => {
    if (!gate(t)) return;
    const d = k.route(rv, rnd(-0.9, 0.9));
    let f = rnd(2600, 3800), at = t;
    const n = Math.floor(rnd(4, 9));
    for (let i = 0; i < n; i++) {
      const nf = f * rnd(0.78, 1.3);
      birdNote(k, at, f, nf, rnd(0.05, 0.12), rnd(0.018, 0.032), d);
      f = Math.min(4800, Math.max(2200, nf)); at += rnd(0.07, 0.17);
    }
  }, 1, 1.5);
  // تریل سریع
  k.poisson(11, (t) => {
    if (!gate(t, 0.9)) return;
    const d = k.route(rv, rnd(-0.9, 0.9));
    const base = rnd(3800, 4700), n = Math.floor(rnd(8, 16)), rate = rnd(11, 16);
    for (let i = 0; i < n; i++) birdNote(k, t + i / rate, base * (1 + 0.02 * i), base * (1 + 0.02 * i) * 0.92, 0.035, rnd(0.012, 0.022), d);
  }, 3, 2);
  // جیک‌جیک کوتاه
  k.poisson(5, (t) => {
    if (!gate(t)) return;
    const d = k.route(rv, rnd(-0.9, 0.9));
    const f = rnd(4500, 6000), n = pick([2, 3, 4]);
    for (let i = 0; i < n; i++) birdNote(k, t + i * rnd(0.11, 0.2), f, f * rnd(0.6, 0.85), 0.05, rnd(0.012, 0.024), d);
  }, 0, 1.2);
  // قمری: کوکوی آرام
  k.poisson(22, (t) => {
    if (!gate(t, 0.8)) return;
    const d = k.route(rv, rnd(-0.6, 0.6)), f = rnd(430, 520);
    k.tone(t, f, 0.04, 0.05, 0.28, { endFreq: f * 0.92, dest: d });
    k.tone(t + 0.42, f * 1.06, 0.05, 0.05, 0.32, { endFreq: f, dest: d });
    k.tone(t + 0.88, f, 0.04, 0.05, 0.4, { endFreq: f * 0.9, dest: d });
  }, 4, 8);
}

function fire(k: Kit) {
  const base = k.gain(0.35);
  k.chain(k.wide("brown"), k.filter("lowpass", 350), base, k.out);
  k.drift(base.gain, 0.1, 9);
  const hiss = k.gain(0.05);
  k.chain(k.noise("pink"), k.filter("highpass", 2500), k.filter("lowpass", 7000), hiss, k.out);
  k.drift(hiss.gain, 0.03, 11);
  const breeze = k.gain(0.07);
  k.chain(k.noise("pink"), k.filter("bandpass", 500, 0.8), breeze, k.out);
  k.drift(breeze.gain, 0.06, 25);
  k.poisson(0.16, (t) => k.burst(t, { ft: "bandpass", f: rnd(1200, 6500), q: rnd(1.5, 4), peak: rnd(0.1, 0.45), atk: 0.002, dec: rnd(0.01, 0.05), pan: rnd(-0.5, 0.5) }), 0, 0.03);
  k.poisson(5, (t) => k.burst(t, { ft: "bandpass", f: rnd(300, 900), q: 2, peak: rnd(0.4, 0.7), atk: 0.003, dec: rnd(0.06, 0.12), pan: rnd(-0.4, 0.4) }), 1, 1.5);
}

// ───── طرح‌ها: خانه و سفر ─────
function fireplace(k: Kit) {
  const base = k.gain(0.45);
  k.chain(k.wide("brown"), k.filter("lowpass", 260), base, k.out);
  k.drift(base.gain, 0.12, 13);
  const room = k.gain(0.1);
  k.chain(k.noise("pink"), k.filter("lowpass", 180), room, k.out);
  const hiss = k.gain(0.025);
  k.chain(k.noise("pink"), k.filter("highpass", 2000), k.filter("lowpass", 4500), hiss, k.out);
  k.drift(hiss.gain, 0.015, 17);
  k.poisson(0.2, (t) => k.burst(t, { ft: "bandpass", f: rnd(800, 4200), q: rnd(1.5, 3.5), peak: rnd(0.08, 0.3), atk: 0.002, dec: rnd(0.012, 0.045), pan: rnd(-0.3, 0.3) }), 0, 0.04);
  k.poisson(7, (t) => {
    k.burst(t, { ft: "bandpass", f: rnd(300, 600), q: 3, peak: rnd(0.4, 0.65), atk: 0.003, dec: rnd(0.08, 0.16), pan: rnd(-0.3, 0.3) });
    k.burst(t + 0.01, { ft: "highpass", f: 3000, q: 0.7, peak: 0.15, atk: 0.001, dec: 0.02 });
  }, 2, 2);
  // نشستن کنده‌ها
  k.poisson(34, (t) => k.tone(t, rnd(90, 130), 0.25, 0.01, 0.35, { endFreq: rnd(45, 60) }), 6, 18);
}

function fan(k: Kit) {
  const g = k.gain(0.55);
  const p = k.panner(0);
  const body = k.chain<GainNode>(k.wide("pink"), k.filter("lowpass", 900), g);
  if (p) { body.connect(p).connect(k.out); k.drift(p.pan, 0.3, 19); } else body.connect(k.out);
  k.drift(g.gain, 0.05, 23);
  k.chain(k.osc(110), k.gain(0.025), k.out);
  k.chain(k.osc(112.3), k.gain(0.012), k.out);
}

function ac(k: Kit) {
  const g = k.gain(0.7);
  k.chain(k.wide("brown"), k.filter("lowpass", 600), g, k.out);
  k.drift(g.gain, 0.06, 37);
  const hiss = k.gain(0.03);
  k.chain(k.noise("white"), k.filter("bandpass", 3000, 0.4), hiss, k.out);
  k.drift(hiss.gain, 0.012, 29);
  k.chain(k.osc(120), k.gain(0.014), k.out);
  k.chain(k.osc(60), k.gain(0.02), k.out);
}

function cabin(k: Kit) {
  const g = k.gain(0.85);
  k.chain(k.wide("brown"), k.filter("lowpass", 500), g, k.out);
  k.drift(g.gain, 0.06, 25);
  k.chain(k.noise("pink"), k.filter("bandpass", 900, 0.4), k.gain(0.25), k.out);
  k.chain(k.noise("white"), k.filter("highpass", 3500), k.gain(0.02), k.out);
  k.chain(k.osc(92), k.gain(0.02), k.out);
  k.chain(k.osc(94.3), k.gain(0.02), k.out);
}

function ship(k: Kit) {
  const rumble = k.gain(0.7);
  k.chain(k.wide("brown"), k.filter("lowpass", 260), rumble, k.out);
  const roll = k.modBus(9);
  k.mod(roll, 0.12, rumble.gain);
  k.chain(k.osc(47), k.gain(0.035), k.out);
  k.chain(k.osc(49.1), k.gain(0.03), k.out);
  const lap = k.gain(0.04);
  k.chain(k.wide("pink"), k.filter("bandpass", 700, 0.6), lap, k.out);
  k.mod(roll, 0.03, lap.gain);
  // موج به بدنه می‌خوره
  k.poisson(6, (t) => k.burst(t, { type: "brown", ft: "lowpass", f: rnd(220, 420), q: 0.6, peak: rnd(0.12, 0.25), atk: rnd(0.2, 0.5), dec: rnd(0.9, 1.8), pan: rnd(-0.6, 0.6) }), 1, 2);
  // ناله‌ی چوب
  k.poisson(12, (t) => {
    const f = rnd(90, 170), d = rnd(0.7, 1.8);
    const o = k.c.createOscillator(); o.type = "sawtooth";
    o.frequency.setValueAtTime(f, t);
    o.frequency.linearRampToValueAtTime(f * rnd(0.85, 1.25), t + d);
    const bp = k.filter("bandpass", f * 4, 6), g = k.gain(0);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(rnd(0.012, 0.03), t + d * 0.4);
    g.gain.linearRampToValueAtTime(0, t + d);
    o.connect(bp).connect(g).connect(k.route(k.out, rnd(-0.7, 0.7)));
    o.start(t); o.stop(t + d + 0.05);
  }, 3, 4);
}

function train(k: Kit) {
  const r = k.gain(0.7);
  k.chain(k.wide("brown"), k.filter("lowpass", 220), r, k.out);
  k.drift(r.gain, 0.1, 17);
  k.chain(k.noise("pink"), k.filter("bandpass", 400, 0.8), k.gain(0.15), k.out);
  const speed = (t: number) => 1 + 0.12 * Math.sin((2 * Math.PI * t) / 61) + 0.06 * Math.sin((2 * Math.PI * t) / 37 + 2);
  const clack = (t: number, s: number, pan: number) => {
    k.burst(t, { ft: "bandpass", f: rnd(950, 1250), q: 1.2, peak: 0.35 * s, atk: 0.002, dec: 0.06, pan });
    k.burst(t, { ft: "bandpass", f: rnd(2300, 2900), q: 2, peak: 0.12 * s, atk: 0.002, dec: 0.03, pan });
    k.tone(t, 70, 0.5 * s, 0.003, 0.1, { endFreq: 45, pan });
  };
  k.metronome((t) => {
    const sp = speed(t), pan = rnd(-0.15, 0.15), amp = rnd(0.85, 1.1);
    clack(t, amp, pan);
    clack(t + 0.13 / sp, 0.7 * amp, pan);
    if (Math.random() < 0.1) clack(t + 0.26 / sp, 0.5 * amp, pan);
    return (0.6 / sp) * rnd(0.97, 1.03);
  }, 0, 37);
  // پل و تونل: غرش گذرای بلندتر
  k.events(40, 110, (t) => {
    const d = rnd(4, 9);
    k.burst(t, { type: "brown", ft: "lowpass", f: rnd(300, 600), q: 0.6, peak: rnd(0.25, 0.45), atk: d * 0.4, dec: d * 0.6 });
    k.burst(t, { ft: "bandpass", f: rnd(500, 900), q: 0.6, peak: rnd(0.04, 0.08), atk: d * 0.4, dec: d * 0.6 });
  }, 20);
}

function city(k: Kit) {
  const g = k.gain(0.6);
  k.chain(k.wide("brown"), k.filter("lowpass", 220), g, k.out);
  k.drift(g.gain, 0.15, 14);
  const m = k.gain(0.08);
  k.chain(k.noise("pink"), k.filter("bandpass", 600, 0.3), m, k.out);
  k.drift(m.gain, 0.04, 19);
  k.poisson(9, (t) => {
    const dur = rnd(3, 5), peak = rnd(0.08, 0.15);
    const s = k.c.createBufferSource(); s.buffer = makeNoise(k.c, "white", 0);
    const bp = k.filter("bandpass", 250, 1);
    bp.frequency.setValueAtTime(250, t);
    bp.frequency.linearRampToValueAtTime(rnd(550, 800), t + dur / 2);
    bp.frequency.linearRampToValueAtTime(250, t + dur);
    const eg = k.gain(0);
    eg.gain.setValueAtTime(0, t);
    eg.gain.linearRampToValueAtTime(peak, t + dur / 2);
    eg.gain.linearRampToValueAtTime(0, t + dur);
    s.connect(bp).connect(eg).connect(k.route(k.out, rnd(-0.6, 0.6)));
    s.start(t, Math.random() * 20, dur + 0.05);
  }, 2, 4);
}

function traffic(k: Kit) {
  const hw = k.gain(0.5);
  k.chain(k.wide("brown"), k.filter("lowpass", 260), hw, k.out);
  k.drift(hw.gain, 0.15, 19);
  const mid = k.gain(0.09);
  k.chain(k.wide("pink"), k.filter("bandpass", 700, 0.4), mid, k.out);
  k.drift(mid.gain, 0.05, 23);
  const wet = k.gain(0.02);
  k.chain(k.noise("white"), k.filter("highpass", 3000), wet, k.out);
  k.drift(wet.gain, 0.012, 29);
  // ماشین‌هایی که از جلو رد می‌شن (چپ به راست یا برعکس)
  k.poisson(6, (t) => {
    const dur = rnd(1.5, 3), peak = rnd(0.07, 0.16), dirn = sign();
    const s = k.c.createBufferSource(); s.buffer = makeNoise(k.c, "pink", 1);
    const bp = k.filter("bandpass", 350, 1.2);
    bp.frequency.setValueAtTime(rnd(300, 420), t);
    bp.frequency.linearRampToValueAtTime(rnd(750, 1100), t + dur * 0.5);
    bp.frequency.linearRampToValueAtTime(rnd(280, 380), t + dur);
    const eg = k.gain(0);
    eg.gain.setValueAtTime(0, t);
    eg.gain.linearRampToValueAtTime(peak, t + dur * 0.5);
    eg.gain.linearRampToValueAtTime(0, t + dur);
    const p = k.panner(-0.8 * dirn);
    if (p) {
      p.pan.setValueAtTime(-0.8 * dirn, t); p.pan.linearRampToValueAtTime(0.8 * dirn, t + dur);
      s.connect(bp).connect(eg).connect(p).connect(k.out);
    } else s.connect(bp).connect(eg).connect(k.out);
    s.start(t, Math.random() * 20, dur + 0.05);
  }, 1, 2.5);
}

function cafe(k: Kit) {
  ([[420, 2, 0.12], [900, 3, 0.12], [1700, 3, 0.1]] as const).forEach(([f, q, lv], i) => {
    const g = k.gain(lv);
    const bp = k.filter("bandpass", f, q);
    k.chain(k.wide("pink", rnd(0.9, 1.1)), bp, g, k.out);
    k.texture(3.1 + i * 1.05, 0.08, g.gain);
    k.drift(g.gain, 0.08, 3.5);
    k.drift(bp.frequency, f * 0.12, 5.5);
  });
  const low = k.gain(0.1);
  k.chain(k.noise("pink"), k.filter("lowpass", 700), low, k.out);
  k.drift(low.gain, 0.03, 23);
  k.poisson(7, (t) => {
    const f = rnd(3200, 5200), p = rnd(0.02, 0.04), pan = rnd(-0.8, 0.8);
    k.tone(t, f, p, 0.002, rnd(0.15, 0.3), { pan });
    k.tone(t, f * 1.5, p * 0.5, 0.002, 0.15, { pan });
  }, 2, 2);
  // دستگاه اسپرسو
  k.events(35, 90, (t) => k.burst(t, { type: "white", ft: "bandpass", f: rnd(3500, 5500), q: 0.8, peak: 0.05, atk: 0.5, dec: rnd(2, 4), pan: rnd(-0.8, 0.8) }), 12);
}

function washer(k: Kit) {
  const motor = k.gain(0.3);
  k.chain(k.wide("brown"), k.filter("lowpass", 420), motor, k.out);
  k.drift(motor.gain, 0.08, 11);
  const hum = k.gain(0.014);
  k.chain(k.osc(72), hum, k.out);
  k.drift(hum.gain, 0.006, 17);
  // آب و لباس که در طبل می‌چرخن
  k.events(2.4, 6.5, (t) => {
    k.burst(t, { type: "brown", ft: "lowpass", f: rnd(400, 900), q: 0.7, peak: rnd(0.12, 0.28), atk: rnd(0.5, 1.2), dec: rnd(0.8, 1.7), pan: rnd(-0.4, 0.4) });
    if (Math.random() < 0.45) k.tone(t + rnd(0.3, 0.8), rnd(85, 110), rnd(0.06, 0.14), 0.01, 0.2, { endFreq: 55, pan: rnd(-0.4, 0.4) });
    if (Math.random() < 0.3) k.burst(t + rnd(0, 0.6), { ft: "bandpass", f: rnd(1200, 2600), q: 1.5, peak: 0.08, atk: 0.04, dec: 0.2, pan: rnd(-0.5, 0.5) });
  });
  // مرحله‌ی چرخش سریع (فقط گاهی)
  k.events(90, 200, (t) => {
    const up = rnd(10, 16), hold = rnd(14, 22), down = rnd(10, 14), tot = up + hold + down;
    const hi = rnd(190, 240);
    const o = k.c.createOscillator(); o.type = "triangle";
    o.frequency.setValueAtTime(70, t);
    o.frequency.exponentialRampToValueAtTime(hi, t + up);
    o.frequency.setValueAtTime(hi, t + up + hold);
    o.frequency.exponentialRampToValueAtTime(70, t + tot);
    const og = k.gain(0);
    og.gain.setValueAtTime(0, t); og.gain.linearRampToValueAtTime(0.03, t + up);
    og.gain.setValueAtTime(0.03, t + up + hold); og.gain.linearRampToValueAtTime(0, t + tot);
    o.connect(og).connect(k.out); o.start(t); o.stop(t + tot + 0.1);
    const s = k.c.createBufferSource(); s.buffer = makeNoise(k.c, "pink", 0);
    const bp = k.filter("bandpass", 200, 0.8);
    bp.frequency.setValueAtTime(200, t); bp.frequency.linearRampToValueAtTime(800, t + up);
    bp.frequency.setValueAtTime(800, t + up + hold); bp.frequency.linearRampToValueAtTime(200, t + tot);
    const sg = k.gain(0);
    sg.gain.setValueAtTime(0, t); sg.gain.linearRampToValueAtTime(0.35, t + up);
    sg.gain.setValueAtTime(0.35, t + up + hold); sg.gain.linearRampToValueAtTime(0, t + tot);
    s.connect(bp).connect(sg).connect(k.out); s.start(t, Math.random() * 20, tot + 0.1);
    return tot + rnd(30, 120);
  }, rnd(25, 70));
}

function clock(k: Kit) {
  const room = k.gain(0.04);
  k.chain(k.noise("pink"), k.filter("lowpass", 160), room, k.out);
  k.drift(room.gain, 0.02, 31);
  let tock = false;
  k.metronome((t) => {
    tock = !tock;
    const a = rnd(0.85, 1.1) * (tock ? 0.8 : 1);
    k.burst(t, { ft: "bandpass", f: tock ? rnd(2300, 2600) : rnd(3000, 3400), q: 3, peak: 0.28 * a, atk: 0.001, dec: 0.025, pan: -0.25 });
    k.tone(t, tock ? 1300 : 1750, 0.05 * a, 0.001, 0.04, { pan: -0.25 });
    k.tone(t, tock ? 240 : 310, 0.05 * a, 0.002, 0.06, { pan: -0.25 });
    return 1 + rnd(-0.005, 0.005);
  }, 0.2);
}

function purr(k: Kit) {
  const g = k.gain(0.5);
  k.chain(k.wide("brown"), k.filter("bandpass", 140, 1.4), k.filter("lowpass", 420), g, k.out);
  k.texture(25, 0.45, g.gain);
  const breath = k.modBus(2.6);
  k.mod(breath, 0.22, g.gain);
  const saw = k.osc(50, "sawtooth");
  const sg = k.gain(0.012);
  k.chain(saw, k.filter("lowpass", 300), sg, k.out);
  k.texture(25, 0.008, sg.gain);
  k.mod(breath, 0.004, sg.gain);
  k.drift(saw.frequency, 3, 23);
  k.chain(k.noise("pink"), k.filter("bandpass", 1500, 1), k.gain(0.008), k.out);
}

function rainCar(k: Kit) {
  const roof = k.gain(0.4);
  k.chain(k.wide("brown"), k.filter("lowpass", 320), roof, k.out);
  k.drift(roof.gain, 0.08, 21);
  rainBed(k, 700, 3800, 0.22, 0.2);
  k.chain(k.osc(46), k.gain(0.012), k.out);
  k.poisson(0.045, (t) => k.burst(t, { ft: "bandpass", f: rnd(900, 2600), q: 6, peak: rnd(0.08, 0.2), atk: 0.002, dec: rnd(0.03, 0.07), pan: rnd(-0.6, 0.6) }), 0, 0.01);
  k.poisson(0.9, (t) => k.tone(t, rnd(180, 300), rnd(0.05, 0.1), 0.003, 0.08, { endFreq: rnd(120, 180), pan: rnd(-0.6, 0.6) }), 0, 0.2);
  // ماشین گاهی از کنار رد می‌شه
  k.poisson(24, (t) => {
    const dur = rnd(3, 5);
    const s = k.c.createBufferSource(); s.buffer = makeNoise(k.c, "pink", 0);
    const bp = k.filter("bandpass", 400, 0.9);
    bp.frequency.setValueAtTime(300, t); bp.frequency.linearRampToValueAtTime(900, t + dur * 0.5); bp.frequency.linearRampToValueAtTime(280, t + dur);
    const g = k.gain(0);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(rnd(0.08, 0.14), t + dur * 0.5); g.gain.linearRampToValueAtTime(0, t + dur);
    s.connect(bp).connect(g).connect(k.route(k.out, rnd(-0.7, 0.7)));
    s.start(t, Math.random() * 20, dur + 0.05);
  }, 8, 10);
}

// ───── طرح‌ها: آرام ─────
function heartbeat(k: Kit) {
  const w = k.gain(0.5);
  k.chain(k.wide("brown"), k.filter("lowpass", 350), w, k.out);
  k.drift(w.gain, 0.08, 3);
  k.chain(k.noise("pink"), k.filter("bandpass", 200, 0.7), k.gain(0.1), k.out);
  const thump = (t: number, s: number) => k.tone(t, 75, 0.7 * s, 0.01, 0.14, { endFreq: 42 });
  const bpm = (t: number) => 60 + 5 * Math.sin((2 * Math.PI * t) / 47) + 3 * Math.sin((2 * Math.PI * t) / 79 + 1);
  k.metronome((t) => {
    const beat = 60 / bpm(t);
    thump(t, rnd(0.9, 1.05));
    thump(t + beat * 0.31, rnd(0.58, 0.72));
    return beat * rnd(0.985, 1.015);
  }, 0, 47);
}

function bowl(k: Kit) {
  const rv = k.reverb(0.5, 3.2);
  const roots = [174.6, 196, 220, 247, 262, 294, 330];
  k.events(11, 22, (t) => {
    const f0 = pick(roots) * rnd(0.995, 1.005);
    const pan = rnd(-0.4, 0.4), d = rnd(0.8, 1.2);
    [[1, 0.5, 14], [2.76, 0.2, 9], [5.4, 0.08, 5]].forEach(([m, p, dec]) => {
      for (const det of [-0.4, 0.4]) k.tone(t, f0 * m + det, p * 0.12, 0.02, dec * d, { dest: k.route(rv, pan) });
    });
  }, 0.3);
}

function drone(k: Kit) {
  const lp = k.filter("lowpass", 700, 0.3);
  lp.connect(k.out);
  k.drift(lp.frequency, 160, 29);
  const buses = [k.modBus(23), k.modBus(31)];
  [[55, 0.1], [82.41, 0.07], [110, 0.07], [164.81, 0.04], [220, 0.02]].forEach(([f, lv], i) => {
    for (const det of [-0.25, 0.25]) {
      const g = k.gain(lv);
      k.chain(k.osc(f + det), g, lp);
      k.mod(buses[i % 2], lv * 0.5, g.gain);
    }
  });
  k.chain(k.wide("brown"), k.filter("lowpass", 150), k.gain(0.1), k.out);
}

function chimes(k: Kit) {
  const rv = k.reverb(0.45, 2.8);
  const air = k.gain(0.02);
  k.chain(k.wide("pink"), k.filter("bandpass", 400, 0.8), air, k.out);
  k.drift(air.gain, 0.01, 27);
  const notes = [784, 880, 1047, 1175, 1319, 1568, 1760];
  k.poisson(5.5, (t) => {
    if (Math.random() > activity(t) + 0.15) return;
    const n = 1 + Math.floor(Math.random() * 4);
    const pan = rnd(-0.7, 0.7);
    let at = t;
    for (let i = 0; i < n; i++) {
      const f = pick(notes), p = rnd(0.03, 0.07), dec = rnd(2.5, 5);
      k.tone(at, f, p, 0.003, dec, { dest: k.route(rv, pan) });
      k.tone(at, f * 2.76, p * 0.2, 0.003, 1.5, { dest: k.route(rv, pan) });
      at += rnd(0.1, 0.35);
    }
  }, 1, 1.5);
}

const CHORDS: readonly (readonly number[])[] = [
  [38, 57, 62, 66], [43, 59, 62, 66], [47, 57, 62, 66], [45, 57, 61, 64], [40, 59, 62, 67], [38, 57, 64, 66],
];

function padLullaby(k: Kit) {
  const rv = k.reverb(0.6, 3.4);
  const lp = k.filter("lowpass", 850, 0.4);
  lp.connect(rv);
  k.drift(lp.frequency, 260, 23);
  let cur = Math.floor(Math.random() * CHORDS.length);
  const voices = CHORDS[cur].map((m, i) => {
    const g = k.gain(i === 0 ? 0.09 : 0.055);
    const a = k.osc(midi(m), "triangle"), b = k.osc(midi(m), "sine");
    a.detune.value = -7; b.detune.value = 6;
    a.connect(g); b.connect(g); g.connect(lp);
    k.drift(g.gain, g.gain.value * 0.35, 19 + i * 3);
    return [a, b] as const;
  });
  const shimmer = k.osc(midi(CHORDS[cur][3] + 12));
  const sg = k.gain(0.008);
  k.chain(shimmer, sg, rv);
  k.drift(sg.gain, 0.007, 21);
  // تغییر هارمونی هر 20 تا 45 ثانیه با لغزش نرم
  k.events(20, 45, (t) => {
    let nxt = cur;
    while (nxt === cur) nxt = Math.floor(Math.random() * CHORDS.length);
    cur = nxt;
    const glide = rnd(7, 12);
    voices.forEach(([a, b], i) => {
      const f = midi(CHORDS[cur][i]);
      for (const o of [a, b]) { o.frequency.cancelScheduledValues(t); o.frequency.setValueAtTime(o.frequency.value, t); o.frequency.exponentialRampToValueAtTime(f, t + glide); }
    });
    const sf = midi(CHORDS[cur][3] + 12);
    shimmer.frequency.cancelScheduledValues(t);
    shimmer.frequency.setValueAtTime(shimmer.frequency.value, t);
    shimmer.frequency.exponentialRampToValueAtTime(sf, t + glide);
  }, 18);
  k.chain(k.wide("brown"), k.filter("lowpass", 140), k.gain(0.06), k.out);
}

function binaural(k: Kit) {
  const base = rnd(105, 125);
  const l = k.osc(base), r = k.osc(base + 4);
  const pl = k.panner(-1), pr = k.panner(1);
  const gl = k.gain(0.1), gr = k.gain(0.1);
  if (pl && pr) { k.chain(l, gl, pl, k.out); k.chain(r, gr, pr, k.out); }
  else { k.chain(l, gl, k.out); k.chain(r, gr, k.out); }
  const slow = k.modBus(31);
  k.mod(slow, 10, l.frequency); k.mod(slow, 10, r.frequency);
  k.drift(r.frequency, 1.4, 37);
  const o2l = k.osc(base * 2), o2r = k.osc(base * 2 + 4);
  const g2 = k.gain(0.025);
  k.chain(o2l, g2, k.out); k.chain(o2r, g2);
  k.mod(slow, 20, o2l.frequency); k.mod(slow, 20, o2r.frequency);
  k.drift(g2.gain, 0.012, 27);
  const bed = k.gain(0.07);
  k.chain(k.wide("pink"), k.filter("lowpass", 320), bed, k.out);
  k.drift(bed.gain, 0.03, 29);
}

const PENTA = [62, 64, 66, 69, 71, 74, 76, 78, 81];

function musicBox(k: Kit) {
  const rv = k.reverb(0.4, 2.6);
  let idx = 3 + Math.floor(Math.random() * 3);
  const note = (t: number, m: number, v: number, pan: number) => {
    const f = midi(m), d = k.route(rv, pan);
    k.tone(t, f, 0.06 * v, 0.003, rnd(1.6, 2.6), { dest: d });
    k.tone(t, f * 3.01, 0.02 * v, 0.002, 0.5, { dest: d });
    k.tone(t, f * 5.98, 0.008 * v, 0.002, 0.2, { dest: d });
  };
  k.events(9, 28, (t) => {
    const n = Math.floor(rnd(3, 8));
    const step = rnd(0.5, 0.95), pan = rnd(-0.3, 0.3);
    let at = t;
    for (let i = 0; i < n; i++) {
      idx = Math.max(0, Math.min(PENTA.length - 1, idx + pick([-2, -1, -1, 0, 1, 1, 2])));
      note(at, PENTA[idx], rnd(0.7, 1), pan);
      at += step * pick([1, 1, 1, 1.5, 0.75]);
    }
    return at - t + rnd(6, 18);
  }, 1);
  k.chain(k.wide("pink"), k.filter("lowpass", 380), k.gain(0.025), k.out);
}

const BUILDERS: Record<SleepSoundKind, (k: Kit) => void> = {
  white: (k) => plainNoise(k, "white", 0.3),
  pink: (k) => plainNoise(k, "pink", 0.55),
  brown: (k) => plainNoise(k, "brown", 0.6),
  pinkSoft, brownDeep,
  rain, rainHeavy, rainRoof, rainTent, rainLeaves, storm, thunderFar, ocean, stream, waterfall, lake,
  wind, forest, fire, frogs, crickets, cicadas, owls, dawnBirds, blizzard,
  fan, ac, cabin, train, city, cafe, fireplace, rainCar, washer, ship, traffic, clock, purr,
  heartbeat, bowl, drone, chimes, padLullaby, binaural, musicBox,
};

/** بلندی ذاتی هر صدا (از اندازه‌گیری خروجی، برای یکسان‌شدن بلندی ظاهری) */
const TRIM: Partial<Record<SleepSoundKind, number>> = {
  white: 1.5, pink: 1.2, brown: 1.25, brownDeep: 0.5, waterfall: 0.55, drone: 0.5, cabin: 0.7, padLullaby: 0.6,
  ac: 0.8, ship: 0.8, train: 0.8, heartbeat: 0.8,
  musicBox: 2.5, clock: 2, crickets: 2.2, dawnBirds: 2.2, frogs: 2, cicadas: 2, lake: 2.2, chimes: 1.4, bowl: 1.4, owls: 1.5, forest: 1.4,
  thunderFar: 1.3, cafe: 1.3,
};

export function buildVoice(c: AudioContext, kind: SleepSoundKind): Voice {
  const k = new Kit(c, TRIM[kind] ?? 1);
  BUILDERS[kind](k);
  return { out: k.final, dispose: () => k.dispose(), report: k.report };
}
