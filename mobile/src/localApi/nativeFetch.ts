// fetchِ اصلیِ مرورگر، قبل از patchِ localApi — ApiClient همیشه از این می‌ره تا
// درخواستِ خودش (حتی اگه آدرسِ سرور هم‌مبدأ باشه) هرگز دوباره رهگیری نشه.
// عمدا بدونِ هیچ import (SyncProvider ↔ localApi چرخه نسازن).
let native: typeof fetch | null = null;

export function setNativeFetch(f: typeof fetch): void {
  native = f;
}

export function nativeFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return (native ?? fetch)(input, init);
}
