import { readFileSync } from "fs";
import { join } from "path";
import type { CSSProperties } from "react";
import { ImageResponse } from "next/og";
import { BRAND_FA } from "./brand";

// چرا فونتِ محلی و نه next/font: next/font فقط توی کامپوننت‌های React عادی
// کار می‌کنه، نه توی ImageResponse (که خودش موتور رندر جدا/Satori داره و
// باید بافرِ خودِ فایلِ فونت رو مستقیم بگیره). فارسی/عربی بدون یه فونتِ
// دارای گلیفِ عربی-اسکریپت، به‌جای حروف مربع خالی رندر می‌شه — پس همون
// فونتِ خودِ اپ (Vazirmatn) رو به‌صورت فایلِ .ttf ثابت کنارِ ریپو نگه
// می‌داریم (`assets/fonts`)، مستقل از next/font/google.
//
// runtime باید nodejs باشه (نه edge) چون از `fs` برای خوندنِ فایلِ فونت
// از دیسک استفاده می‌کنیم.
const FONTS_DIR = join(process.cwd(), "assets", "fonts");

let cachedFonts: { name: string; data: Buffer; weight: 400 | 700; style: "normal" }[] | null = null;
function loadFonts() {
  if (cachedFonts) return cachedFonts;
  cachedFonts = [
    { name: "Vazirmatn", data: readFileSync(join(FONTS_DIR, "Vazirmatn-Medium.ttf")), weight: 400 as const, style: "normal" as const },
    { name: "Vazirmatn", data: readFileSync(join(FONTS_DIR, "Vazirmatn-Bold.ttf")), weight: 700 as const, style: "normal" as const },
  ];
  return cachedFonts;
}

export const OG_IMAGE_SIZE = { width: 1200, height: 630 };

// پالت تیره‌ی خودِ اپ (نه یک پالت جدید و اختراعی) — طبق قانونِ «هیچ‌وقت
// خودسرانه بک‌گراند/رنگ اضافه نکن»، همون #0E1011 / #00A86B ثابتِ تمِ تاریکِ
// اپ که کاربر صریح خواسته.
const BG = "#0E1011";
const ACCENT = "#00A86B";
const TEXT = "#F2F5F3";
const MUTED = "#8B9791";

/**
 * تصویرِ اشتراک‌گذاریِ ۱۲۰۰×۶۳۰ برندشده: «آریون» درشت + تیترِ فارسیِ خودِ
 * صفحه. هر مسیرِ عمومی یک `opengraph-image.tsx` نازک داره که همین تابع رو
 * با تیترِ خودش صدا می‌زنه — تا استایل/فونت/پالت یک‌جا نگه‌داری بشه.
 */
// ساتوری (موتورِ next/og) الگوریتمِ bidiِ کامل ندارد: یک رشته‌ی فارسیِ
// چندکلمه‌ای را با همون ترتیبِ منطقیِ کاراکترها می‌چینه، نه ترتیبِ
// بصریِ RTL — یعنی کلمه‌ها (نه حروفِ داخلِ هرکلمه) برعکس نمایش داده
// می‌شدن. راه‌حلِ رایج برای همین محدودیتِ شناخته‌شده: کلمه‌ها را خودمان
// جدا می‌کنیم و با `flexDirection: row-reverse` می‌چینیم، تا ترتیبِ
// بصری درست بشه (خودِ هر کلمه چون تک‌واحده مشکلی نداره).
function RtlWords({ text, style }: { text: string; style: CSSProperties }) {
  const words = text.split(" ");
  return (
    <div style={{ display: "flex", flexDirection: "row-reverse", flexWrap: "wrap", gap: "0.35em" }}>
      {words.map((w, i) => (
        <span key={i} style={style}>
          {w}
        </span>
      ))}
    </div>
  );
}

export function renderOgImage(headline: string) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: BG,
          padding: "72px 88px",
          fontFamily: "Vazirmatn",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <RtlWords text={headline} style={{ fontSize: 40, fontWeight: 400, color: MUTED }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", width: 64, height: 6, borderRadius: 3, backgroundColor: ACCENT }} />
          <div style={{ display: "flex", fontSize: 108, fontWeight: 700, color: TEXT, direction: "rtl" }}>
            {BRAND_FA}
          </div>
        </div>
      </div>
    ),
    { ...OG_IMAGE_SIZE, fonts: loadFonts() }
  );
}
