"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { SegmentedTabs } from "@/components/SegmentedTabs";
import "./money-mgmt.css";

// دانلود اکسپرت مستقل مدیریت سرمایه. اکسپرت به سایت وصل نمی‌شه و همه‌ی تنظیماتش ورودی خود اکسپرته.
// فایل‌ها از GET /api/trade/money/ea (گیت‌شده با فلگ tradeMoneyMgmt و ماژول ترید) میان.

type Platform = "MT5" | "MT4";

const FEATURES = [
  "پنل روی چارت: ریسک درصدی، حد ضرر و حد سود، حجم لات زنده و دکمه‌های خرید و فروش",
  "حجم معامله خودکار از روی درصد ریسک و فاصله‌ی حد ضرر، گرد‌شده به گام حجم بروکر",
  "بستن همه‌ی معاملات و سر به سر کردن همه با یک دکمه",
  "سقف ریسک هر معامله، اجبار حد ضرر و حد ضرر خودکار",
  "سقف تعداد معامله‌ی باز و تعداد معامله در روز",
  "حد ضرر روزانه با قفل تا روز بعد و هدف سود روزانه",
  "سر به سر، تریلینگ و بستن بخشی از حجم بر پایه‌ی R",
];

const INPUTS: { name: string; desc: string }[] = [
  { name: "DefaultRiskPct", desc: "درصد ریسک پیش‌فرض هر معامله از بالانس" },
  { name: "DefaultSLPips / DefaultTP / TpMode", desc: "حد ضرر به پیپ و حد سود به پیپ یا نسبت ریسک به سود" },
  { name: "ManageAllSymbols / ManageMagic", desc: "قوانین روی همه‌ی نمادها یا فقط نماد چارت، و روی همه‌ی معاملات یا فقط یک مجیک (صفر یعنی دستی)" },
  { name: "MaxRiskPerTradePct", desc: "حجم اضافه‌ی معامله‌ای که ریسکش از سقف بیشتره بسته می‌شه" },
  { name: "RequireSL / AutoSLPips / SLGraceSec", desc: "اجبار حد ضرر؛ حد ضرر خودکار یا بستن معامله بعد از مهلت" },
  { name: "MaxOpenTrades / MaxDailyTrades", desc: "سقف معامله‌ی باز و معامله در روز؛ جدیدترین‌ها بسته می‌شن" },
  { name: "MaxDailyLossPct", desc: "ضرر روزانه از بالانس شروع روز؛ همه بسته و تا روز بعد قفل" },
  { name: "DailyProfitTargetPct / LockOnTarget", desc: "هدف سود روزانه و قفل بعد از رسیدن به اون" },
  { name: "BreakEvenAtR / BEOffsetPoints", desc: "انتقال حد ضرر به نقطه‌ی ورود وقتی سود به این R رسید" },
  { name: "TrailingStartR / TrailingDistR", desc: "شروع و فاصله‌ی تریلینگ بر پایه‌ی R" },
  { name: "PartialCloseAtR / PartialClosePct", desc: "بستن درصدی از حجم یک بار در این R" },
];

const STEPS = [
  "فایل رو دانلود کن و در متاتریدر از منوی File گزینه‌ی Open Data Folder رو بزن.",
  "فایل رو داخل پوشه‌ی MQL5/Experts (برای MT5) یا MQL4/Experts (برای MT4) کپی کن.",
  "MetaEditor رو باز کن (F4)، فایل رو باز کن و Compile (F7) بزن؛ باید بدون خطا تموم بشه.",
  "در متاتریدر پنل Navigator رو تازه کن و اکسپرت رو روی چارت دلخواه بکش.",
  "دکمه‌ی Algo Trading (در MT4: AutoTrading) رو روشن کن و در تب Common معامله‌ی الگوریتمی رو مجاز کن.",
  "در تب Inputs قوانین رو تنظیم کن (صفر یعنی خاموش) و تایید رو بزن.",
];

export function MoneyManagerDownload() {
  const [platform, setPlatform] = useState<Platform>("MT5");
  const ext = platform === "MT5" ? "mq5" : "mq4";
  return (
    <div className="mm-root">
      <section className="trade-surface mm-card">
        <div className="mm-head">
          <h2 className="mm-title">اکسپرت مدیریت سرمایه</h2>
          <span className="mm-badge">آزمایشی (فقط ادمین)</span>
        </div>
        <ul className="mm-list">
          {FEATURES.map((f) => <li key={f}>{f}</li>)}
        </ul>
        <p className="mm-note">این اکسپرت مستقل کار می‌کنه: به سایت وصل نمی‌شه و همه‌ی تنظیماتش ورودی خود اکسپرته.</p>
      </section>

      <section className="trade-surface mm-card">
        <h2 className="mm-title">دانلود</h2>
        <SegmentedTabs<Platform>
          options={[{ value: "MT5", label: "MT5" }, { value: "MT4", label: "MT4" }]}
          active={platform}
          onChange={setPlatform}
          ariaLabel="پلتفرم"
        />
        <a
          className="trade-primary-btn mm-download"
          href={`/api/trade/money/ea?platform=${platform}`}
          download={`Arion-MoneyManager-${platform}.${ext}`}
        >
          <Download size={16} />
          <span>دانلود نسخه‌ی {platform}</span>
        </a>
      </section>

      <section className="trade-surface mm-card">
        <h2 className="mm-title">نصب</h2>
        <ol className="mm-steps">
          {STEPS.map((s) => <li key={s}>{s}</li>)}
        </ol>
      </section>

      <section className="trade-surface mm-card">
        <h2 className="mm-title">ورودی‌های اصلی</h2>
        <div className="mm-table">
          {INPUTS.map((r) => (
            <div key={r.name} className="mm-row">
              <span className="mm-key">{r.name}</span>
              <span className="mm-desc">{r.desc}</span>
            </div>
          ))}
        </div>
        <p className="mm-note">همه‌ی مقدارهای صفر یعنی اون قانون خاموشه. ریسک، حد ضرر و حد سود رو می‌شه مستقیم از روی پنل چارت هم عوض کرد.</p>
      </section>

      <p className="mm-warn">
        قبل از استفاده روی حساب واقعی حتما اکسپرت رو روی حساب دمو آزمایش کن. معامله‌گری ریسک داره و مسئولیت تنظیمات و نتیجه با خود توئه.
      </p>
    </div>
  );
}
