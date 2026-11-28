"use client";

import { useEffect, useRef, useState } from "react";
import { LiquidGlass, useGlassTier, type GlassIntensity } from "@/components/LiquidGlass";
import { SegmentedTabs } from "@/components/SegmentedTabs";
import { GLASS_TIERS, type GlassTier } from "@/lib/liquidGlassTier";
import { tr } from "@/lib/i18n";

// پیش‌نمایش ادمین: همان کامپوننت در سه ردیف کنار هم روی پس‌زمینه‌ی شلوغ، با شمارنده‌ی FPS.
function useFps() {
  const [fps, setFps] = useState(0);
  useEffect(() => {
    let raf = 0, n = 0, last = performance.now();
    const loop = (t: number) => {
      n++;
      if (t - last >= 1000) { setFps(Math.round((n * 1000) / (t - last))); n = 0; last = t; }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return fps;
}

function Stage({ tier, intensity }: { tier: GlassTier; intensity: GlassIntensity }) {
  const names: Record<GlassTier, string> = {
    full: tr("کامل (شکست واقعی)", "Full (real refraction)"),
    lite: tr("سبک (blur و گرادیان)", "Lite (blur + gradients)"),
    static: tr("ثابت (بدون بلور)", "Static (no blur)"),
  };
  return (
    <div className="lgp-stage" data-tier={tier}>
      <span className="lgp-blob" /><span className="lgp-blob b2" />
      <div className="lgp-label">{names[tier]}</div>
      <div className="lgp-row">
        <LiquidGlass as="button" type="button" forceTier={tier} intensity={intensity} radius={999} interactive className="lgp-btn">{tr("دکمه", "Button")}</LiquidGlass>
        <LiquidGlass as="button" type="button" forceTier={tier} intensity={intensity} radius={14} interactive className="lgp-btn">{tr("دکمه‌ی گرد", "Rounded")}</LiquidGlass>
        <LiquidGlass as="button" type="button" forceTier={tier} intensity={intensity} radius={999} className="lgp-btn">+</LiquidGlass>
      </div>
      <LiquidGlass forceTier={tier} intensity={intensity} radius={24} interactive className="lgp-card">
        <b>{tr("کارت شیشه‌ای", "Glass card")}</b>
        <span>{tr("متن روی شیشه خوانا می‌مونه و لبه نور می‌گیره.", "Text stays readable and the rim catches light.")}</span>
      </LiquidGlass>
      <LiquidGlass forceTier={tier} intensity={intensity} radius={999} className="lgp-nav">
        <span className="on">{tr("امروز", "Today")}</span><span>{tr("هفته", "Week")}</span><span>{tr("ماه", "Month")}</span>
      </LiquidGlass>
      <LiquidGlass forceTier={tier} intensity={intensity} radius={28} className="lgp-sheet">
        <span className="lgp-handle" />
        <b>{tr("برگه‌ی پایینی", "Bottom sheet")}</b>
        <span>{tr("نمونه‌ی برگه روی پس‌زمینه‌ی متحرک.", "Sheet sample over the moving background.")}</span>
      </LiquidGlass>
    </div>
  );
}

export default function LiquidGlassPreviewPage() {
  const tier = useGlassTier();
  const fps = useFps();
  const [intensity, setIntensity] = useState<GlassIntensity>("normal");
  const mounted = useRef(false);
  const [client, setClient] = useState(false);
  useEffect(() => { mounted.current = true; setClient(true); }, []);
  return (
    <div>
      <div className="lgp-hud" style={{ marginBottom: 16 }}>
        <b>{tr("شیشه‌ی مایع", "Liquid glass")}</b>
        <span>{tr("ردیف این دستگاه", "This device tier")}: <b data-testid="lg-tier">{client ? tier : "-"}</b></span>
        <span>FPS: <b data-testid="lg-fps">{fps}</b></span>
        <SegmentedTabs<GlassIntensity>
          className="lgp-seg"
          ariaLabel={tr("شدت", "Intensity")}
          active={intensity}
          onChange={setIntensity}
          options={[
            { value: "subtle", label: tr("کم", "Subtle") },
            { value: "normal", label: tr("عادی", "Normal") },
            { value: "strong", label: tr("زیاد", "Strong") },
          ]}
        />
      </div>
      <div className="lgp-grid">
        {GLASS_TIERS.map((t) => <Stage key={t} tier={t} intensity={intensity} />)}
      </div>
    </div>
  );
}
