import { pick } from "./i18n";

// جدول برچسب دوزبانه: هر خوندن با زبان جاری حل می‌شه (بدون tr() در سطح ماژول).
// استفاده با زبان جاری حل می‌شه، پس هیچ tr() در سطح ماژول اجرا نمی‌شه.
export function localizedRecord<K extends string>(pairs: Record<K, [string, string]>): Record<K, string> {
  const resolve = (v: [string, string]) => pick({ fa: v[0], en: v[1] });
  return new Proxy(pairs as unknown as Record<K, string>, {
    get(target, key, receiver) {
      if (typeof key === "string" && Object.prototype.hasOwnProperty.call(target, key)) {
        return resolve((target as unknown as Record<string, [string, string]>)[key]);
      }
      return Reflect.get(target, key, receiver);
    },
    getOwnPropertyDescriptor(target, key) {
      const d = Reflect.getOwnPropertyDescriptor(target, key);
      if (d && typeof key === "string" && "value" in d) {
        return { ...d, value: resolve(d.value as unknown as [string, string]) };
      }
      return d;
    },
  });
}

