"use client";

import { BLANK_PIXEL, HEADER_DESKTOP_MEDIA, sectionWordmarkSm } from "@/lib/sectionAssets";
import { brandName } from "@/lib/brand";
import { useTheme } from "./ThemeProvider";

/*
  The ARION wordmark, always the same image the header logo uses
  (lib/sectionAssets.ts), never typed text.
  - height: CSS length of the rendered image (aspect 358/49 like the header)
  - theme: force a variant (e.g. "dark" = white letters on an always-dark image);
    default follows the current app theme
  - desktopOnly: use the header <picture media> trick so nothing downloads on
    mobile (the header shows the A mark there)
  - decorative: alt="" + aria-hidden; otherwise alt is the brand name
*/
export function BrandWordmark({
  height = 14,
  theme,
  desktopOnly = false,
  decorative = false,
  className,
}: {
  height?: number | string;
  theme?: "dark" | "light";
  desktopOnly?: boolean;
  decorative?: boolean;
  className?: string;
}) {
  const app = useTheme().theme;
  const t = theme ?? (app === "light" ? "light" : "dark");
  const src = sectionWordmarkSm(t);
  const style = { height: typeof height === "number" ? `${height}px` : height, aspectRatio: "358 / 49", width: "auto" } as const;
  const alt = decorative ? "" : brandName();
  const common = { alt, width: 264, height: 36, draggable: false, style, className: `brand-wordmark${className ? ` ${className}` : ""}`, ...(decorative ? { "aria-hidden": true as const } : {}) };
  if (desktopOnly) {
    return (
      <picture>
        <source media={HEADER_DESKTOP_MEDIA} srcSet={src} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={BLANK_PIXEL} decoding="async" {...common} />
      </picture>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} decoding="async" {...common} />;
}
