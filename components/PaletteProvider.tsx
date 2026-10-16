"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useSection } from "@/components/SectionProvider";
import { subscribe } from "@/lib/liveSync";
import { getPaletteSettings, setPaletteSettings, writePaletteCookies } from "@/lib/storage";
import { applyPaletteToDom } from "@/lib/paletteDom";
import {
  DEFAULT_CUSTOM_COLOR, normalizeHex, resolvePalette,
  type EffectivePalette, type PaletteSetting,
} from "@/lib/palette";

// تم رنگی سراسری اپ (تنظیمات > تم و رنگ). مقدار اولیه از layout.tsx میاد (همون چیزی که سرور روی
// <html data-palette> گذاشته)، پس SSR و هیدریشن یکیه. تغییر کاربر همون لحظه روی DOM اعمال می‌شه
// (بدون ریلود) و با تاخیر کوتاه ذخیره می‌شه تا کشیدن انتخابگر رنگ ده‌ها نوشتن نسازه.

type Ctx = {
  /** انتخاب کاربر (auto یعنی هر بخش پالت خودش) */
  setting: PaletteSetting;
  /** رنگ پالت سفارشی (#RRGGBB) یا null */
  custom: string | null;
  /** پالتی که واقعا اعمال شده */
  palette: EffectivePalette;
  /** کاربر خودش پالتی غیر از «خودکار» انتخاب کرده؟ (لوگو فقط وقتی همرنگ پالت می‌شه) */
  paletteSet: boolean;
  choose: (setting: PaletteSetting, custom?: string | null) => void;
};

const PaletteContext = createContext<Ctx>({
  setting: "auto", custom: null, palette: "routine", paletteSet: false, choose: () => {},
});

const SAVE_DELAY_MS = 450;

export function PaletteProvider({
  children, initialSetting = "auto", initialCustom = null,
}: { children: React.ReactNode; initialSetting?: PaletteSetting; initialCustom?: string | null }) {
  const section = useSection();
  const [state, setState] = useState<{ setting: PaletteSetting; custom: string | null }>({
    setting: initialSetting,
    custom: normalizeHex(initialCustom),
  });
  const palette = resolvePalette(state.setting, state.custom, section);

  // آخرین مقدار انتخاب‌شده و تایمر ذخیره
  const latest = useRef(state);
  latest.current = state;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(() => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    const { setting, custom } = latest.current;
    void setPaletteSettings(setting, custom);
  }, []);

  const choose = useCallback((setting: PaletteSetting, custom?: string | null) => {
    const prev = latest.current;
    const nextCustom = normalizeHex(custom === undefined ? prev.custom : custom)
      ?? (setting === "custom" ? prev.custom ?? DEFAULT_CUSTOM_COLOR : prev.custom);
    const next = { setting, custom: nextCustom };
    latest.current = next;
    setState(next);
    // DOM همین لحظه (بدون منتظر ری‌رندر) + کوکی برای لود بعدی و زیردامنه‌ها
    applyPaletteToDom(resolvePalette(setting, nextCustom, document.documentElement.getAttribute("data-section")), setting !== "auto", nextCustom);
    writePaletteCookies(setting, nextCustom);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, SAVE_DELAY_MS);
  }, [flush]);

  // تغییر از بیرون (تب/دستگاه دیگه) و هم‌گام‌سازی اولیه کوکی با تنظیم ذخیره‌شده
  useEffect(() => {
    let alive = true;
    const reconcile = async () => {
      const saved = await getPaletteSettings();
      if (!alive || timer.current || !saved.palette) return;
      const cur = latest.current;
      const custom = saved.custom ?? cur.custom;
      if (saved.palette === cur.setting && custom === cur.custom) return;
      const next = { setting: saved.palette, custom };
      latest.current = next;
      setState(next);
      applyPaletteToDom(resolvePalette(next.setting, next.custom, document.documentElement.getAttribute("data-section")), next.setting !== "auto", next.custom);
      writePaletteCookies(next.setting, next.custom);
    };
    void reconcile();
    const off = subscribe(["palette", "paletteCustom"], (_k, meta) => { if (meta.remote) void reconcile(); });
    return () => { alive = false; off(); };
  }, []);

  // ذخیره‌ی معوق موقع بسته‌شدن صفحه/ترک کامپوننت از دست نره
  useEffect(() => {
    const onHide = () => { if (timer.current) flush(); };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onHide);
      onHide();
    };
  }, [flush]);

  const value = useMemo<Ctx>(
    () => ({ setting: state.setting, custom: state.custom, palette, paletteSet: state.setting !== "auto", choose }),
    [state, palette, choose],
  );
  return <PaletteContext.Provider value={value}>{children}</PaletteContext.Provider>;
}

export function usePalette() {
  return useContext(PaletteContext);
}
