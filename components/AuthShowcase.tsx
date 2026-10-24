import type { CSSProperties } from "react";
import { SECTION_META } from "@/lib/sections";
import { BrandWordmark } from "./BrandWordmark";
import { tr } from "@/lib/i18n";

/*
  Static hero image for the split login page. ONE element only: CSS sizes it
  as a top banner (<1024px) or the full-height side panel (>=1024px), so the
  browser downloads a single file per viewport (srcset + sizes). Decorative:
  the parent is aria-hidden and the image has an empty alt.
  Files come from scripts/gen-login-hero.mjs (public/images/auth).
  Styles live in app/_area/auth.css (auth-showcase block).
*/

const BASE = "/images/auth/login-hero";
const WIDTHS = [640, 1000, 1254] as const;
const SIZES = "(min-width:1024px) 58vw, 100vw";
const srcSet = (ext: "avif" | "webp") => WIDTHS.map((w) => `${BASE}-${w}.${ext} ${w}w`).join(", ");

export function AuthShowcase() {
  const pills = [
    { key: "routine", label: tr("روتین", "Routine") },
    { key: "trade", label: tr("ترید", "Trade") },
    { key: "workout", label: tr("تمرین", "Training") },
  ] as const;

  return (
    <div className="as-root">
      <picture>
        <source type="image/avif" srcSet={srcSet("avif")} sizes={SIZES} />
        <img
          className="as-img"
          src={`${BASE}-1000.webp`}
          srcSet={srcSet("webp")}
          sizes={SIZES}
          width={1254}
          height={1254}
          alt=""
          decoding="async"
          fetchPriority="high"
        />
      </picture>
      <div className="as-fade" />
      <div className="as-cap">
        <span className="as-cap-brand"><BrandWordmark height={13} theme="dark" decorative /></span>
        <b className="as-cap-title">{tr("هر روز، یک قدم دقیق‌تر", "A little sharper, every day")}</b>
        <ul className="as-cap-pills">
          {pills.map((p) => (
            <li key={p.key} style={{ "--as-dot": SECTION_META[p.key].colors.mid } as CSSProperties}>
              {p.label}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default AuthShowcase;
