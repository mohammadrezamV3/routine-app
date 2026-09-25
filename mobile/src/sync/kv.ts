// ذخیره‌سازیِ کلید-مقدارِ کوچک برای لایه‌ی سینک (refresh token، کاربر،
// cursor، خطاهای rejected). روی اندروید @capacitor/preferences (SharedPreferences)،
// روی وب همون پلاگین به localStorage برمی‌گرده. تست‌ها نسخه‌ی حافظه‌ای می‌دن.

export interface KV {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

export function preferencesKV(): KV {
  // import پویا تا تست‌ها (محیطِ node) مجبور به لودِ پلاگین نباشن
  const load = () => import("@capacitor/preferences").then((m) => m.Preferences);
  return {
    async get(key) {
      const p = await load();
      const { value } = await p.get({ key });
      return value ?? null;
    },
    async set(key, value) {
      const p = await load();
      await p.set({ key, value });
    },
    async remove(key) {
      const p = await load();
      await p.remove({ key });
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
