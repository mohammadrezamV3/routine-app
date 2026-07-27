"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { TradeJournal } from "@/components/TradeJournal";

const CHECKLIST = [
  "سطح H1 با برخورد قبلی معتبره؟",
  "گره معاملاتی در M5 شکل گرفته؟",
  "کندل تاییدی صادر شده؟",
  "DXY همسوئه یا حداقل واگرایی مشکوک نداره؟",
  "خبر مهمی در ۳۰-۶۰ دقیقه آینده نیست؟",
  "حجم پوزیشن بر اساس ریسک محاسبه شده؟",
  "حد ضرر و هدف سود قبل از ورود مشخصه؟",
];

const TIPS = [
  "قبل از ورود، سطح میجور H1 رو با حداقل ۲-۳ برخورد قبلی تأیید کن، نه هر خط دلبخواهی.",
  "بعد از شکست سطح، منتظر برگشت قیمت به گره معاملاتی در M5 باش و وارد نشو تا تاییدیه کندلی نگیری.",
  "ریسک هر معامله حداکثر ۱-۲٪ سرمایه، با نسبت ریسک به ریوارد حداقل ۱:۲.",
  "قبل از ورود همبستگی DXY رو چک کن؛ اگر با EURUSD واگرا بود، احتمال fakeout رو جدی بگیر.",
  "قبل از رویدادهای پرنوسان (NFP، تصمیم نرخ بهره فدرال) حجم یا حضورت رو کم کن.",
  "کار آلارم‌محور باشه، نه چسبیدن به چارت — آلارم روی سطوح کلیدی بذار.",
];

const PRO = [
  "بک‌تست سیستماتیک روی حداقل ۱۰۰ معامله تاریخی قبل از افزایش حجم واقعی.",
  "ژورنال معاملاتی منظم: دلیل ورود، حجم، نتیجه، حالت روانی موقع معامله.",
  "مطالعه روانشناسی معامله‌گری کنار تحلیل تکنیکال.",
];

// طبق تصمیم پروژه: چک‌لیست و ژورنال فقط آمار خام و یادآوری‌ان — هیچ‌کدوم
// تفسیر یا پیشنهاد معاملاتی تولید نمی‌کنن.
export default function TradePage() {
  const { status } = useSession();
  const [tab, setTab] = useState<"checklist" | "journal">("checklist");
  const [checked, setChecked] = useState<Record<number, boolean>>({});

  return (
    <section>
      <h1>ترید</h1>

      <div className="day-picker" style={{ marginTop: 10 }}>
        <span className={`day-pill${tab === "checklist" ? " on" : ""}`} onClick={() => setTab("checklist")}>چک‌لیست</span>
        <span className={`day-pill${tab === "journal" ? " on" : ""}`} onClick={() => setTab("journal")}>ژورنال</span>
      </div>

      {tab === "checklist" ? (
        <>
          <div className="checklist-glass" style={{ marginTop: 14 }}>
            {CHECKLIST.map((label, i) => {
              const on = !!checked[i];
              return (
                <div key={i} onClick={() => setChecked((c) => ({ ...c, [i]: !c[i] }))} className="task">
                  <div className={`check${on ? " on" : ""}`}>
                    <svg className="c-check" viewBox="0 0 24 24" fill="none">
                      <path d="M2.5 13l5.5 5.5L21.5 4.5" stroke="var(--bg)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div className={`task-name${on ? " done" : ""}`}>{label}</div>
                </div>
              );
            })}
          </div>

          <div className="tm-extra">
            <div className="domain-sub">نکات کلیدی</div>
            <ul>{TIPS.map((t, i) => <li key={i}>{t}</li>)}</ul>
          </div>
          <div className="tm-extra">
            <div className="domain-sub">مسیر حرفه‌ای‌شدن</div>
            <ul>{PRO.map((t, i) => <li key={i}>{t}</li>)}</ul>
          </div>
        </>
      ) : status === "authenticated" ? (
        <TradeJournal />
      ) : (
        <>
          <div className="section-note" style={{ marginTop: 14 }}>برای ژورنال ترید اول وارد حساب بشو.</div>
          <Link href="/auth/login" className="nav-link" style={{ display: "inline-block", marginTop: 10 }}>ورود / ثبت‌نام →</Link>
        </>
      )}
    </section>
  );
}
