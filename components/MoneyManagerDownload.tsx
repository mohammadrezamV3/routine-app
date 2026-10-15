"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { SegmentedTabs } from "@/components/SegmentedTabs";
import { tr } from "@/lib/i18n";
import "./money-mgmt.css";

// دانلود اکسپرت مستقل مدیریت سرمایه. اکسپرت به سایت وصل نمی‌شه و همه‌ی تنظیماتش ورودی خود اکسپرته.
// فایل‌ها از GET /api/trade/money/ea (گیت‌شده با فلگ tradeMoneyMgmt و ماژول ترید) میان.

type Platform = "MT5" | "MT4";

const features = () => [
  tr("پنل روی چارت: ریسک درصدی، حد ضرر و حد سود، حجم لات زنده و دکمه‌های خرید و فروش", "On-chart panel: percent risk, stop loss and take profit, live lot size and buy and sell buttons"),
  tr("حجم معامله خودکار از روی درصد ریسک و فاصله‌ی حد ضرر، گرد‌شده به گام حجم بروکر", "Automatic trade volume from the risk percent and stop loss distance, rounded to the broker's volume step"),
  tr("بستن همه‌ی معاملات و سر به سر کردن همه با یک دکمه", "Close all trades or move all to breakeven with one button"),
  tr("سقف ریسک هر معامله، اجبار حد ضرر و حد ضرر خودکار", "Per-trade risk cap, forced stop loss and automatic stop loss"),
  tr("سقف تعداد معامله‌ی باز و تعداد معامله در روز", "Limits on open trades and trades per day"),
  tr("حد ضرر روزانه با قفل تا روز بعد و هدف سود روزانه", "Daily loss limit with a lock until the next day, and a daily profit target"),
  tr("سر به سر، تریلینگ و بستن بخشی از حجم بر پایه‌ی R", "Breakeven, trailing and partial close based on R"),
];

const inputs = (): { name: string; desc: string }[] => [
  { name: "DefaultRiskPct", desc: tr("درصد ریسک پیش‌فرض هر معامله از بالانس", "Default risk percent per trade, from the balance") },
  { name: "DefaultSLPips / DefaultTP / TpMode", desc: tr("حد ضرر به پیپ و حد سود به پیپ یا نسبت ریسک به سود", "Stop loss in pips and take profit in pips or as a risk-to-reward ratio") },
  { name: "ManageAllSymbols / ManageMagic", desc: tr("قوانین روی همه‌ی نمادها یا فقط نماد چارت، و روی همه‌ی معاملات یا فقط یک مجیک (صفر یعنی دستی)", "Rules apply to all symbols or only the chart symbol, and to all trades or only one magic number (zero means manual)") },
  { name: "MaxRiskPerTradePct", desc: tr("حجم اضافه‌ی معامله‌ای که ریسکش از سقف بیشتره بسته می‌شه", "The excess volume of a trade whose risk is above the cap gets closed") },
  { name: "RequireSL / AutoSLPips / SLGraceSec", desc: tr("اجبار حد ضرر؛ حد ضرر خودکار یا بستن معامله بعد از مهلت", "Force a stop loss; set it automatically or close the trade after the grace period") },
  { name: "MaxOpenTrades / MaxDailyTrades", desc: tr("سقف معامله‌ی باز و معامله در روز؛ جدیدترین‌ها بسته می‌شن", "Limit on open trades and trades per day; the newest ones get closed") },
  { name: "MaxDailyLossPct", desc: tr("ضرر روزانه از بالانس شروع روز؛ همه بسته و تا روز بعد قفل", "Daily loss from the day's starting balance; everything is closed and locked until the next day") },
  { name: "DailyProfitTargetPct / LockOnTarget", desc: tr("هدف سود روزانه و قفل بعد از رسیدن به اون", "Daily profit target and a lock once it is reached") },
  { name: "BreakEvenAtR / BEOffsetPoints", desc: tr("انتقال حد ضرر به نقطه‌ی ورود وقتی سود به این R رسید", "Move the stop loss to the entry price once profit reaches this R") },
  { name: "TrailingStartR / TrailingDistR", desc: tr("شروع و فاصله‌ی تریلینگ بر پایه‌ی R", "Trailing start and distance based on R") },
  { name: "PartialCloseAtR / PartialClosePct", desc: tr("بستن درصدی از حجم یک بار در این R", "Close a percentage of the volume once at this R") },
];

const steps = () => [
  tr("فایل رو دانلود کن و در متاتریدر از منوی File گزینه‌ی Open Data Folder رو بزن.", "Download the file and in MetaTrader choose File > Open Data Folder."),
  tr("فایل رو داخل پوشه‌ی MQL5/Experts (برای MT5) یا MQL4/Experts (برای MT4) کپی کن.", "Copy the file into the MQL5/Experts folder (for MT5) or MQL4/Experts (for MT4)."),
  tr("MetaEditor رو باز کن (F4)، فایل رو باز کن و Compile (F7) بزن؛ باید بدون خطا تموم بشه.", "Open MetaEditor (F4), open the file and press Compile (F7). It should finish without errors."),
  tr("در متاتریدر پنل Navigator رو تازه کن و اکسپرت رو روی چارت دلخواه بکش.", "In MetaTrader refresh the Navigator panel and drag the EA onto any chart."),
  tr("دکمه‌ی Algo Trading (در MT4: AutoTrading) رو روشن کن و در تب Common معامله‌ی الگوریتمی رو مجاز کن.", "Turn on the Algo Trading button (AutoTrading in MT4) and allow algorithmic trading in the Common tab."),
  tr("در تب Inputs قوانین رو تنظیم کن (صفر یعنی خاموش) و تایید رو بزن.", "Set the rules in the Inputs tab (zero means off) and click OK."),
];

export function MoneyManagerDownload() {
  const [platform, setPlatform] = useState<Platform>("MT5");
  const ext = platform === "MT5" ? "mq5" : "mq4";
  return (
    <div className="mm-root">
      <section className="trade-surface mm-card">
        <div className="mm-head">
          <h2 className="mm-title">{tr("اکسپرت مدیریت سرمایه", "Money management EA")}</h2>
          <span className="mm-badge">{tr("آزمایشی (فقط ادمین)", "Experimental (admins only)")}</span>
        </div>
        <ul className="mm-list">
          {features().map((f) => <li key={f}>{f}</li>)}
        </ul>
        <p className="mm-note">{tr("این اکسپرت مستقل کار می‌کنه: به سایت وصل نمی‌شه و همه‌ی تنظیماتش ورودی خود اکسپرته.", "This EA works standalone: it does not connect to the site and all its settings are inputs of the EA itself.")}</p>
      </section>

      <section className="trade-surface mm-card">
        <h2 className="mm-title">{tr("دانلود", "Download")}</h2>
        <SegmentedTabs<Platform>
          options={[{ value: "MT5", label: "MT5" }, { value: "MT4", label: "MT4" }]}
          active={platform}
          onChange={setPlatform}
          ariaLabel={tr("پلتفرم", "Platform")}
        />
        <a
          className="trade-primary-btn mm-download"
          href={`/api/trade/money/ea?platform=${platform}`}
          download={`Arion-MoneyManager-${platform}.${ext}`}
        >
          <Download size={16} />
          <span>{tr(`دانلود نسخه‌ی ${platform}`, `Download ${platform} version`)}</span>
        </a>
      </section>

      <section className="trade-surface mm-card">
        <h2 className="mm-title">{tr("نصب", "Installation")}</h2>
        <ol className="mm-steps">
          {steps().map((s) => <li key={s}>{s}</li>)}
        </ol>
      </section>

      <section className="trade-surface mm-card">
        <h2 className="mm-title">{tr("ورودی‌های اصلی", "Main inputs")}</h2>
        <div className="mm-table">
          {inputs().map((r) => (
            <div key={r.name} className="mm-row">
              <span className="mm-key">{r.name}</span>
              <span className="mm-desc">{r.desc}</span>
            </div>
          ))}
        </div>
        <p className="mm-note">{tr("همه‌ی مقدارهای صفر یعنی اون قانون خاموشه. ریسک، حد ضرر و حد سود رو می‌شه مستقیم از روی پنل چارت هم عوض کرد.", "A value of zero means that rule is off. Risk, stop loss and take profit can also be changed directly from the chart panel.")}</p>
      </section>

      <p className="mm-warn">
        {tr("قبل از استفاده روی حساب واقعی حتما اکسپرت رو روی حساب دمو آزمایش کن. معامله‌گری ریسک داره و مسئولیت تنظیمات و نتیجه با خود توئه.", "Before using it on a live account, test the EA on a demo account. Trading is risky and you are responsible for the settings and the result.")}
      </p>
    </div>
  );
}
