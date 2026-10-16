"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Moon, Palette, Sparkles, Sun, SunMoon } from "lucide-react";
import { AccountPageHead, AccountBlock } from "@/components/AccountUI";
import { SegmentedTabs } from "@/components/SegmentedTabs";
import { useTheme } from "@/components/ThemeProvider";
import { usePalette } from "@/components/PaletteProvider";
import {
  CUSTOM_SWATCHES, DEFAULT_CUSTOM_COLOR, PALETTE_ORDER, normalizeHex, palettePreview, paletteLogo,
  type EffectivePalette, type PaletteSetting,
} from "@/lib/palette";
import { isEn, tr } from "@/lib/i18n";

// «تنظیمات › تم و رنگ» — انتخاب حالت شب/روز و پالت رنگی کل اپ (lib/palette.ts). «خودکار» یعنی مثل
// قبل هر بخش (ترید، ورزش) رنگ خودش رو داره؛ بقیه یک پالت برای همه‌ی بخش‌ها. تغییر همون لحظه
// اعمال می‌شه (PaletteProvider).

const labelOf = (id: PaletteSetting): string => {
  switch (id) {
    case "auto": return tr("خودکار", "Automatic");
    case "routine": return tr("روتین", "Routine");
    case "trade": return tr("ترید", "Trading");
    case "workout": return tr("بدنسازی", "Workout");
    case "amethyst": return tr("آمتیست", "Amethyst");
    case "sunset": return tr("غروب", "Sunset");
    case "graphite": return tr("گرافیت", "Graphite");
    default: return tr("سفارشی", "Custom");
  }
};

const FIXED_DOTS = ["#00A86B", "#00B4FF", "#E8344F"] as const; // روتین، ترید، ورزش (برای پیش‌نمایش «خودکار»)
const NEUTRAL_BG = { dark: "#101113", light: "#F2EEE8" } as const;

function Half({ mode, id, custom }: { mode: "dark" | "light"; id: PaletteSetting; custom: string | null }) {
  let style: Record<string, string>;
  let dots: React.ReactNode;
  if (id === "auto") {
    style = { "--pv-bg": NEUTRAL_BG[mode] };
    dots = FIXED_DOTS.map((c) => <i key={c} style={{ background: c }} />);
  } else {
    const p = palettePreview(id as EffectivePalette, mode, custom);
    style = { "--pv-bg": p.bg };
    dots = [<i key="a" style={{ background: p.accent }} />, <i key="s" style={{ background: p.secondary }} />];
  }
  return <span className="ap-pal-half" style={style as React.CSSProperties}>{dots}</span>;
}

export default function ThemeSettingsPage() {
  const { theme, toggle } = useTheme();
  const { setting, custom, palette, choose } = usePalette();
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const current = custom ?? DEFAULT_CUSTOM_COLOR;

  // پیش‌نویس فیلد هگز: تایپ نیمه‌کاره نباید رنگ رو بپرونه؛ فقط وقتی کامل و معتبر شد اعمال می‌شه
  const [hexDraft, setHexDraft] = useState(current);
  useEffect(() => { setHexDraft(current); }, [current]);

  const selectAt = (i: number) => {
    const n = PALETTE_ORDER.length;
    const idx = ((i % n) + n) % n;
    choose(PALETTE_ORDER[idx]);
    refs.current[idx]?.focus();
  };
  const onKeyDown = (e: React.KeyboardEvent, i: number) => {
    const rtl = !isEn();
    let step = 0;
    if (e.key === "ArrowRight") step = rtl ? -1 : 1;
    else if (e.key === "ArrowLeft") step = rtl ? 1 : -1;
    else if (e.key === "ArrowDown") step = 1;
    else if (e.key === "ArrowUp") step = -1;
    if (!step) return;
    e.preventDefault();
    selectAt(i + step);
  };

  const logo = paletteLogo(palette, theme, custom);
  const logoStyle = { "--lg-from": logo[0], "--lg-mid": logo[1], "--lg-to": logo[2] } as React.CSSProperties;

  return (
    <section>
      <AccountPageHead
        title={tr("تم و رنگ", "Theme and color")}
        hint={tr("حالت شب یا روز و رنگ کل اپ", "Day or night mode and the color of the whole app")}
        backHref="/account/general"
        backLabel={tr("تنظیمات", "Settings")}
      />

      <AccountBlock title={tr("حالت نمایش", "Display mode")} icon={<SunMoon />} index={0}>
        <SegmentedTabs<"light" | "dark">
          ariaLabel={tr("حالت نمایش", "Display mode")}
          options={[
            { value: "light", label: <span className="ap-pal-mode"><Sun size={15} aria-hidden="true" />{tr("روز", "Day")}</span> },
            { value: "dark", label: <span className="ap-pal-mode"><Moon size={15} aria-hidden="true" />{tr("شب", "Night")}</span> },
          ]}
          active={theme}
          onChange={(v) => { if (v !== theme) toggle(); }}
        />
      </AccountBlock>

      <AccountBlock title={tr("رنگ اپ", "App color")} icon={<Palette />} index={1}>
        <div className="ap-pal-grid" role="radiogroup" aria-label={tr("رنگ اپ", "App color")}>
          {PALETTE_ORDER.map((id, i) => {
            const on = setting === id;
            return (
              <button
                key={id}
                ref={(el) => { refs.current[i] = el; }}
                type="button"
                role="radio"
                aria-checked={on}
                tabIndex={on ? 0 : -1}
                className={`ap-pal-card${on ? " is-on" : ""}`}
                onClick={() => choose(id)}
                onKeyDown={(e) => onKeyDown(e, i)}
              >
                <span className="ap-pal-prev" aria-hidden="true">
                  <Half mode="dark" id={id} custom={custom ?? DEFAULT_CUSTOM_COLOR} />
                  <Half mode="light" id={id} custom={custom ?? DEFAULT_CUSTOM_COLOR} />
                </span>
                <span className="ap-pal-name">
                  <span>{labelOf(id)}</span>
                  {id === "auto" && <small>{tr("هر بخش رنگ خودش", "Each section keeps its own")}</small>}
                  {on && <Check size={14} className="ap-pal-check" aria-hidden="true" />}
                </span>
              </button>
            );
          })}
        </div>

        {setting === "custom" && (
          <div className="ap-pal-custom">
            <div className="ap-pal-custom-row">
              <input
                type="color"
                className="ap-pal-picker"
                aria-label={tr("انتخاب رنگ", "Pick a color")}
                value={current.toLowerCase()}
                onChange={(e) => choose("custom", e.target.value)}
              />
              <input
                type="text"
                className="wsearch-newform-name ap-pal-hex mono"
                dir="ltr"
                maxLength={7}
                spellCheck={false}
                autoComplete="off"
                aria-label={tr("کد رنگ", "Color code")}
                value={hexDraft}
                onChange={(e) => {
                  const v = e.target.value;
                  setHexDraft(v);
                  const hex = normalizeHex(v);
                  if (hex) choose("custom", hex);
                }}
                onBlur={() => setHexDraft(current)}
              />
            </div>
            <div className="ap-pal-swatches" role="group" aria-label={tr("رنگ‌های پیشنهادی", "Suggested colors")}>
              {CUSTOM_SWATCHES.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`ap-pal-swatch${normalizeHex(current) === c ? " is-on" : ""}`}
                  style={{ "--sw": c } as React.CSSProperties}
                  aria-label={c}
                  aria-pressed={normalizeHex(current) === c}
                  onClick={() => choose("custom", c)}
                />
              ))}
            </div>
          </div>
        )}
      </AccountBlock>

      <AccountBlock title={tr("پیش‌نمایش لوگو", "Logo preview")} icon={<Sparkles />} index={2}>
        <div className="ap-pal-logo" style={logoStyle} dir="ltr">
          <span className="ap-pal-logo-mark" aria-hidden="true" />
          <span className="ap-pal-logo-word">ARION</span>
        </div>
      </AccountBlock>
    </section>
  );
}
