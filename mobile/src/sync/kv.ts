// ذخیره‌سازیِ کلید-مقدارِ کوچک برای لایه‌ی سینک (refresh token، کاربر،
// cursor، خطاهای rejected). روی اندروید @capacitor/preferences (SharedPreferences)،
// روی وب همون پلاگین به localStorage برمی‌گرده. تست‌ها نسخه‌ی حافظه‌ای می‌دن.

export interface KV {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

export function preferencesKV(): KV {
  // import پویا تا تست‌ها (محیطِ node) مجبور به لودِ پلاگین نباشن.
  //
  // نکته‌ی مهم: پلاگین‌های Capacitor یک Proxy برمی‌گردونن که هر پراپرتی
  // (از جمله "then") رو intercept می‌کنه و یه تابعِ قابلِ‌فراخوانی پس می‌ده.
  // یعنی خودِ آبجکتِ پلاگین از دیدِ موتورِ جاوااسکریپت "thenable" به‌نظر
  // می‌رسه. اگه این آبجکت مستقیم از داخلِ یک `.then()`/async function
  // برگردونده بشه (مثلا `import(...).then(m => m.Preferences)`)، الگوریتمِ
  // resolve کردنِ پرامیس فکر می‌کنه با یک پرامیسِ دیگه طرفه و خودش
  // `Preferences.then(resolve, reject)` رو صدا می‌زنه — که چون متدِ واقعی
  // «then» روی پلاگین وجود نداره، خطای «"Preferences.then()" is not
  // implemented on web» پرت می‌شه (رویِ هر صفحه، به‌صورتِ unhandled). برای
  // جلوگیری، ماژول رو با side-effect توی یک متغیر cache می‌کنیم، نه با
  // return کردنِ مستقیمِ پلاگین از یک boundary ِ پرامیسی.
  let mod: typeof import("@capacitor/preferences") | undefined;
  let loading: Promise<void> | undefined;
  const ensureLoaded = (): Promise<void> => {
    if (mod) return Promise.resolve();
    if (!loading) {
      loading = import("@capacitor/preferences").then((m) => {
        mod = m;
      });
    }
    return loading;
  };
  return {
    async get(key) {
      await ensureLoaded();
      const { value } = await mod!.Preferences.get({ key });
      return value ?? null;
    },
    async set(key, value) {
      await ensureLoaded();
      await mod!.Preferences.set({ key, value });
    },
    async remove(key) {
      await ensureLoaded();
      await mod!.Preferences.remove({ key });
    },
  };
}

export function memoryKV(initial: Record<string, string> = {}): KV & { data: Map<string, string> } {
  const data = new Map(Object.entries(initial));
  return {
    data,
    async get(key) {
      return data.has(key) ? data.get(key)! : null;
    },
    async set(key, value) {
      data.set(key, value);
    },
    async remove(key) {
      data.delete(key);
    },
  };
}

export async function getJson<T>(kv: KV, key: string, fallback: T): Promise<T> {
  const raw = await kv.get(key);
  if (raw == null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function setJson(kv: KV, key: string, value: unknown): Promise<void> {
  await kv.set(key, JSON.stringify(value));
}
