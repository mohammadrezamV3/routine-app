// گرادیان پایدار آواتار بدون عکس: از روی id یکی از پنج جفت رنگ ثابت.
// همه‌ی جفت‌ها با متن سفید روی هر دو تم روشن و تیره خوانا هستن.
export const AVATAR_PAIRS: readonly (readonly [string, string])[] = [
  ["#0E9F78", "#0A6E6B"],
  ["#4F6BF0", "#3A3FBE"],
  ["#C2417A", "#8E2A8F"],
  ["#D9730D", "#B5421A"],
  ["#7A55E0", "#533BB8"],
];

/** هش ساده و پایدار (FNV-1a) */
export function avatarHash(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function avatarPair(id: string): readonly [string, string] {
  return AVATAR_PAIRS[avatarHash(id || "?") % AVATAR_PAIRS.length];
}
