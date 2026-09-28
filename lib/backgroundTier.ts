// تشخیص «تیر» توان دستگاه برای بک‌گراند aurora (BackgroundCanvas.tsx).
//
// مسئله‌ای که حل می‌کند: نسخه‌ی قبلی فقط یک قانون داشت — «هر دستگاه لمسی
// (pointer:coarse) = بی‌انیمیشن، بدون بلور» (globals.css). این یعنی یک
// گوشی پرچم‌دارِ قوی دقیقا همون نسخه‌ی افتاده‌ی یک گوشی ضعیف رو می‌گرفت؛
// هیچ سیگنال واقعی توانِ دستگاه خونده نمی‌شد. اینجا برعکسش: با ترکیبی از
// سیگنال‌های سخت‌افزاری/شبکه‌ای + یک پروب واقعیِ FPS، سه تیر تعریف می‌شه:
//   - low : بی‌جون‌ترین حالت — یک بلاب ثابت، بدون بلور، بدون انیمیشن.
//   - mid : دو بلاب، بلور سبک‌تر، بدون پارالاکسِ ماوس/JS.
//   - high: افکت کامل (۳ بلاب، بلورِ کامل، پارالاکس روی pointer:fine) —
//           گوشیِ قوی هم می‌تونه به این تیر برسه، نه فقط دسکتاپ.
//
// همه‌چی try/catch شده چون سیگنال‌های navigator.connection/deviceMemory
// استاندارد نیستن (روی خیلی از مرورگرها undefinedن) و نباید کرش کنن.

export type BgTier = "low" | "mid" | "high";

const TIER_ORDER: BgTier[] = ["low", "mid", "high"];
const STORAGE_KEY = "bg-tier-v2";
// کش منقضی می‌شه تا یه jankِ گذرا (مثلا لودِ سنگین) دستگاهِ قوی رو برای همیشه پایین نگه نداره.
const CACHE_TTL_MS = 3 * 24 * 60 * 60 * 1000;
// آستانه‌ی «فریم بد»: ~22ms یعنی کمتر از ~45fps پایدار.
const JANK_FRAME_MS = 22;

export function stepDown(tier: BgTier): BgTier {
  const i = TIER_ORDER.indexOf(tier);
  return TIER_ORDER[Math.max(0, i - 1)];
}

function tierRank(t: BgTier): number {
  return TIER_ORDER.indexOf(t);
}

export function readCachedTier(): BgTier | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const { t, at } = JSON.parse(raw) as { t?: string; at?: number };
    if (typeof at !== "number" || Date.now() - at > CACHE_TTL_MS) return null;
    if (t === "low" || t === "mid" || t === "high") return t;
    return null;
  } catch {
    return null;
  }
}

export function writeCachedTier(tier: BgTier): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ t: tier, at: Date.now() }));
  } catch {
    // خصوصی/بلاک‌شده — بی‌خیال، فقط کش نمی‌مونه
  }
}

/** حدسِ همزمانِ (sync) تیر، فقط از روی سیگنال‌های موجود در navigator/screen — بدون پروب. */
export function computeHeuristicTier(): BgTier {
  if (typeof window === "undefined") return "high";
  try {
    const mq = (q: string) => !!(window.matchMedia && window.matchMedia(q).matches);
    if (mq("(prefers-reduced-motion: reduce)")) return "low";

    const nav = window.navigator as Navigator & {
      deviceMemory?: number;
      connection?: { saveData?: boolean; effectiveType?: string };
    };
    const cores = nav.hardwareConcurrency;
    const mem = nav.deviceMemory;
    const conn = nav.connection;
    const coarse = mq("(pointer: coarse)");
    const dpr = window.devicePixelRatio || 1;
    const screenArea =
      typeof window.screen === "object" && window.screen
        ? window.screen.width * window.screen.height
        : 0;

    // حالت صرفه‌جویی داده یا شبکه‌ی کند = همیشه low، صرف‌نظر از سخت‌افزار
    // (کاربر عمدا داره منابع رو کم مصرف می‌کنه)
    if (conn?.saveData) return "low";
    if (conn?.effectiveType === "slow-2g" || conn?.effectiveType === "2g") return "low";

    let score = 0;
    if (typeof cores === "number") {
      if (cores <= 4) score -= 2;
      else if (cores >= 8) score += 2;
    }
    if (typeof mem === "number") {
      // فقط کروم/اندروید گزارشش می‌کنه؛ روی iOS undefined و بی‌اثره
      if (mem <= 2) score -= 3;
      else if (mem <= 4) score -= 1;
      else if (mem >= 8) score += 2;
    }
    if (conn?.effectiveType === "3g") score -= 1;

    // بارِ رستر: DPR بالا روی صفحه‌ی بزرگ یعنی پیکسل بیشتر برای بلور کردن.
    // یک گوشیِ 3x DPR با صفحه‌ی بزرگ، حتی با CPU خوب، GPU رو برای بلورهای
    // بزرگ (تا 60vmax) بیشتر مشغول می‌کنه.
    const rasterBudget = dpr * dpr * screenArea;
    if (rasterBudget > 8_000_000) score -= 1; // مثلا 3x DPR روی صفحه‌ی بزرگ
    else if (rasterBudget < 2_000_000) score += 1; // صفحه‌ی کوچیک/DPR پایین

    if (coarse) score -= 1; // احتیاطِ پایه برای لمسی، نه حکمِ قطعی

    if (score <= -4) return "low";
    if (score <= 0) return "mid";
    return "high";
  } catch {
    return "mid"; // اگه چیزی خطا داد، محتاطانه وسط رو انتخاب کن
  }
}

/** اولین حدس برای رندر — کشِ قبلی رو ترجیح می‌ده (پرش کمتر بینِ لودها). */
export function initialTierGuess(): BgTier {
  return readCachedTier() ?? computeHeuristicTier();
}

/** میانگینِ زمانِ فریم (ms) رو طیِ `durationMs` با requestAnimationFrame اندازه می‌گیره. */
export function probeFrameTime(durationMs = 1000): Promise<number> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === "undefined") {
      resolve(0);
      return;
    }
    let last: number | null = null;
    let total = 0;
    let count = 0;
    let raf = 0;
    const start = performance.now();
    function tick(now: number) {
      if (last !== null) {
        const dt = now - last;
        // پرش‌های خیلی بزرگ (تب مینیمایز/تعویض تب وسطِ پروب) رو حساب نکن
        if (dt < 250) {
          total += dt;
          count++;
        }
      }
      last = now;
      if (now - start < durationMs) {
        raf = requestAnimationFrame(tick);
      } else {
        resolve(count > 0 ? total / count : 0);
      }
    }
    raf = requestAnimationFrame(tick);
    // اگه تب مخفی بود probe رو بی‌خودی طولانی نکن
    if (document.hidden) {
      cancelAnimationFrame(raf);
      resolve(0);
    }
  });
}

/** بعد از پروبِ اولیه: اگه فریم‌ها کند بودن، یک پله تیر رو پایین بیار. */
export function refineTierWithProbe(base: BgTier, avgFrameMs: number): BgTier {
  if (avgFrameMs <= 0) return base; // پروب معتبر نبود، دست نزن
  if (avgFrameMs > JANK_FRAME_MS) return stepDown(base);
  return base;
}

export interface JankMonitorHandle {
  start(): void;
  stop(): void;
}

/**
 * مانیتورِ پیوسته: هر چند ثانیه یک پنجره‌ی کوتاه از فریم‌ها رو اندازه
 * می‌گیره و اگه پیوسته کند بود یک پله دیگه پایین می‌کشه (هیچ‌وقت بالا
 * نمی‌بره — تصمیمِ محافظه‌کارانه برای جلوگیری از پرپر زدنِ افکت).
 * وقتی تب مخفیه (document.hidden) کامل مکث می‌کنه.
 */
export function createJankMonitor(
  getTier: () => BgTier,
  onDowngrade: (next: BgTier) => void,
  windowMs = 4000,
): JankMonitorHandle {
  let stopped = true;
  let timer: ReturnType<typeof setTimeout> | null = null;

  async function loop() {
    while (!stopped) {
      if (document.hidden) {
        await sleep(1000);
        continue;
      }
      const current = getTier();
      if (current === "low") {
        // پایین‌ترین تیر، دیگه چیزی برای پایین‌کشیدن نیست؛ فقط صبر کن
        await sleep(windowMs);
        continue;
      }
      const avg = await probeFrameTime(Math.min(600, windowMs));
      if (stopped) return;
      if (avg > JANK_FRAME_MS) {
        const next = stepDown(current);
        if (tierRank(next) < tierRank(current)) {
          onDowngrade(next);
        }
      }
      await sleep(windowMs);
    }
  }

  function sleep(ms: number) {
    return new Promise<void>((r) => {
      timer = setTimeout(r, ms);
    });
  }

  return {
    start() {
      if (!stopped) return;
      stopped = false;
      loop();
    },
    stop() {
      stopped = true;
      if (timer) clearTimeout(timer);
    },
  };
}
