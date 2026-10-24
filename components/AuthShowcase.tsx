"use client";

import { useTheme } from "./ThemeProvider";
import { useSection } from "./SectionProvider";
import type { SectionKey } from "@/lib/sections";

/*
  Static hero image for the split login page. ONE <picture> only: CSS sizes it
  as a top banner (<1024px) or the full-height side panel (>=1024px), so the
  browser downloads a single file per viewport. Decorative: the parent is
  aria-hidden and the image has an empty alt.
  Every image has the Arion logo, wordmark and the four section labels baked
  into the center, so nothing is drawn on top of them (no caption card).
  Image = effective section (useSection(): host section / arion_section cookie,
  routine on the main domain) x theme (useTheme()). Both initial values are the
  ones the root layout resolved on the server, so the first HTML already has
  the right <picture> (one download, no flash); a client change swaps it.
    routine: night green, day warm sunrise   trade: night blue, day blue sky
    workout: night red, day red sunset
  The <1024px banner uses a dedicated center crop (`-m`, ratio ~1.73:1) so the
  logo and labels are not sliced. Files come from scripts/gen-login-hero.mjs
  (public/images/auth); exact commands are in the script header.
  Styles live in app/_area/auth.css (auth-showcase block); the per-image
  desktop crop position is the --as-x var set by the .as-<section>-<theme> class.
*/

type Mode = "night" | "day";
type ImgSet = { full: readonly number[]; mobile: readonly number[] };
const NIGHT: ImgSet = { full: [640, 1000, 1254], mobile: [640, 1004] };
// routine/workout night: label row sits lower, so their banner crop is taller (1180 wide)
const NIGHT_LOW: ImgSet = { full: [640, 1000, 1254], mobile: [640, 1180] };
const DAY: ImgSet = { full: [640, 1000, 1254], mobile: [640, 1254] };
const SETS: Record<SectionKey, Record<Mode, ImgSet>> = {
  routine: { night: NIGHT_LOW, day: DAY },
  trade: { night: NIGHT, day: DAY },
  workout: { night: NIGHT_LOW, day: DAY },
};
const SIZES = "(min-width:1024px) 50vw, 100vw";
const BANNER_MEDIA = "(max-width:1023px)";

export function AuthShowcase() {
  const theme = useTheme().theme === "light" ? "light" : "dark";
  const section = useSection();
  const mode: Mode = theme === "light" ? "day" : "night";
  const id = `${section}-${mode}`;
  const base = `/images/auth/login-hero-${id}`;
  const { full, mobile } = SETS[section][mode];
  const set = (ext: "avif" | "webp") => full.map((w) => `${base}-${w}.${ext} ${w}w`).join(", ");
  const mset = (ext: "avif" | "webp") => mobile.map((w) => `${base}-m-${w}.${ext} ${w}w`).join(", ");

  return (
    <div className={`as-root as-${theme} as-${id}`}>
      {/* key: عوض‌شدن تم یا بخش کل picture رو دوباره می‌سازه تا مرورگر source درست رو انتخاب کنه */}
      <picture key={id}>
        <source media={BANNER_MEDIA} type="image/avif" srcSet={mset("avif")} sizes="100vw" />
        <source media={BANNER_MEDIA} type="image/webp" srcSet={mset("webp")} sizes="100vw" />
        <source type="image/avif" srcSet={set("avif")} sizes={SIZES} />
        <img
          className="as-img"
          src={`${base}-1000.webp`}
          srcSet={set("webp")}
          sizes={SIZES}
          width={1254}
          height={1254}
          alt=""
          decoding="async"
          fetchPriority="high"
        />
      </picture>
      <div className="as-fade" />
    </div>
  );
}

export default AuthShowcase;
