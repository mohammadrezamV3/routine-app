"use client";

import { useTheme } from "./ThemeProvider";

/*
  Static hero image for the split login page. ONE <picture> only: CSS sizes it
  as a top banner (<1024px) or the full-height side panel (>=1024px), so the
  browser downloads a single file per viewport. Decorative: the parent is
  aria-hidden and the image has an empty alt.
  Both images have the Arion logo, wordmark and the four section labels baked
  into the center, so nothing is drawn on top of them (no caption card).
  Theme: dark = login-hero-night, light = login-hero-day. The theme comes from
  useTheme(), whose initial value is the one the root layout resolved on the
  server (cookie / account), so the first HTML already has the right <picture>
  (one download, no flash); a client toggle swaps it. The <1024px banner uses a
  dedicated center crop (`-m`, ratio ~1.73:1) so the logo and labels are not
  sliced. Files come from scripts/gen-login-hero.mjs (public/images/auth):
    night  <src> login-hero-night
           <src> login-hero-night-m 125,350,1004,580
    day    <src> login-hero-day
           <src> login-hero-day-m 0,310,1254,725
  Styles live in app/_area/auth.css (auth-showcase block).
*/

const SETS = {
  dark: { base: "/images/auth/login-hero-night", full: [640, 1000, 1254], mobile: [640, 1004] },
  light: { base: "/images/auth/login-hero-day", full: [640, 1000, 1254], mobile: [640, 1254] },
} as const;
const SIZES = "(min-width:1024px) 50vw, 100vw";
const BANNER_MEDIA = "(max-width:1023px)";

export function AuthShowcase() {
  const theme = useTheme().theme === "light" ? "light" : "dark";
  const { base, full, mobile } = SETS[theme];
  const set = (ext: "avif" | "webp") => full.map((w) => `${base}-${w}.${ext} ${w}w`).join(", ");
  const mset = (ext: "avif" | "webp") => mobile.map((w) => `${base}-m-${w}.${ext} ${w}w`).join(", ");

  return (
    <div className={`as-root as-${theme}`}>
      {/* key: عوض‌شدن تم کل picture رو دوباره می‌سازه تا مرورگر source درست رو انتخاب کنه */}
      <picture key={theme}>
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
