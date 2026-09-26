// اسمِ نمایشیِ دستگاه برای «دستگاه‌های فعال» (سرور حداکثر ۶۰ کاراکتر نگه می‌داره).
// بدونِ پلاگینِ @capacitor/device: از userAgentِ WebView مدل/نسخه‌ی اندروید
// درمیاد (مثلا "SM-A525F · Android 14").
export function deviceNameFromUA(ua: string): string {
  const android = /Android\s+([\d.]+)(?:;\s*([^;)]+))?/i.exec(ua);
  if (android) {
    const ver = android[1];
    let model = (android[2] || "").replace(/\s*Build\/.*$/i, "").trim();
    if (!model || /^(wv|K|Linux|U)$/i.test(model)) model = "Android";
    return `${model} · Android ${ver}`.slice(0, 60);
  }
  if (/iPhone|iPad/i.test(ua)) return (/iPad/i.test(ua) ? "iPad" : "iPhone").slice(0, 60);
  const browser = /(Firefox|Edg|Chrome|Safari)\/[\d.]+/.exec(ua)?.[1] ?? "Browser";
  const os = /Windows|Mac OS X|Linux/.exec(ua)?.[0] ?? "";
  return `${browser === "Edg" ? "Edge" : browser}${os ? " · " + os : ""}`.slice(0, 60);
}

export function getDeviceName(): string {
  try {
    return deviceNameFromUA(typeof navigator !== "undefined" ? navigator.userAgent : "");
  } catch {
    return "Arion";
  }
}
