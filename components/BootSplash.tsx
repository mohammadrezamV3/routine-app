import { BRAND_FA } from "@/lib/brand";

// اسپلش ورود اپ: از اولین بایت HTML سرور (قبل از دانلود جاوااسکریپت) روی صفحه‌ست،
// تا وقتی صفحه هم کامل لود شده (window load) و هم React هیدریت شده
// (BootSplashRelease). بعد به بالا پخش می‌شه و کنار می‌ره. همین نود در ناوبری
// داخلی هم دوباره نشون داده می‌شه (lib/navSplash.ts) وقتی رفتن به صفحه‌ی بعد
// بیشتر از یک لحظه طول بکشه.
//
// چرا حذف DOM نه: این نود مال React‌ه؛ اسکریپت فقط data-boot روی <html> رو
// عوض می‌کنه (out ← خروج، done ← display:none) تا با reconcile تداخل نداشته باشه.
// سقف زمانی: اسکریپت بعد از ۸ ثانیه به هر حال خارجش می‌کنه، و CSS بعد از ۱۲
// ثانیه (حتی اگه اسکریپت اجرا نشه) خودش پنهانش می‌کنه؛ بدون جاوااسکریپت هم
// noscript اصلا نشونش نمی‌ده.
const PHRASES = ["روزت رو می‌چینیم", "عادت‌ها رو گرم می‌کنیم", "استریکت رو پیدا می‌کنیم", "تقریبا آماده‌ست"];

// حداقل نمایش از اولین فریم (نه اجرای اسکریپت) حساب می‌شه تا انیمیشن ورود (~1.1s)
// هیچ‌وقت نیمه‌کاره قطع نشه؛ done با پایان واقعی محوشدن پرده (animationend)،
// با یک تایمر پشتیبان برای دستگاه کند.
const BOOT_SCRIPT = `(function(){try{
var d=document.documentElement,t0=0,H=!!window.__appHydrated,L=document.readyState==="complete",done=false;d.setAttribute("data-boot","on");
requestAnimationFrame(function(){t0=Date.now();go()});
function fin(){d.setAttribute("data-boot","done")}
function go(){if(done||!H||!L||!t0)return;done=true;
var w=Math.max(0,1150-(Date.now()-t0));
setTimeout(function(){d.setAttribute("data-boot","out");
var s=document.querySelector(".boot-splash");
if(s)s.addEventListener("animationend",function(e){if(e.target===s&&e.animationName==="bs-out")fin()});
setTimeout(fin,1300)},w)}
window.addEventListener("load",function(){L=true;go()});
window.addEventListener("app:hydrated",function(){H=true;go()});
setTimeout(function(){H=L=true;if(!t0)t0=1;go()},10000);
}catch(e){document.documentElement.setAttribute("data-boot","done")}})();`;

const RINGS = [
  { r: 46, a: "var(--ring-1a)", b: "var(--ring-1b)" },
  { r: 35, a: "var(--ring-2a)", b: "var(--ring-2b)" },
  { r: 24, a: "var(--ring-3a)", b: "var(--ring-3b)" },
];

export function BootSplash() {
  return (
    <>
      <noscript>
        <style>{".boot-splash{display:none!important}"}</style>
      </noscript>
      <div className="boot-splash" role="status" aria-label="در حال بارگذاری" suppressHydrationWarning>
        <div className="bs-aura" aria-hidden="true" />
        <div className="bs-grid" aria-hidden="true" />
        <div className="bs-stage">
          <div className="bs-mark">
            <span className="bs-halo" aria-hidden="true" />
            <svg className="bs-rings" viewBox="0 0 100 100" aria-hidden="true">
              <defs>
                {RINGS.map((g, i) => (
                  <linearGradient key={i} id={`bs-g${i}`} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" style={{ stopColor: g.a }} />
                    <stop offset="100%" style={{ stopColor: g.b }} />
                  </linearGradient>
                ))}
              </defs>
              {RINGS.map((g, i) => (
                <g key={i} className={`bs-ring bs-ring-${i + 1}`}>
                  <circle className="bs-track" cx="50" cy="50" r={g.r} pathLength={100} stroke={`url(#bs-g${i})`} />
                  <circle className="bs-arc" cx="50" cy="50" r={g.r} pathLength={100} stroke={`url(#bs-g${i})`} />
                </g>
              ))}
            </svg>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/logo-icon-dark-theme.png" alt="" className="bs-logo is-dark" width={36} height={31} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/logo-icon-light-theme.webp" alt="" className="bs-logo is-light" width={36} height={31} />
          </div>
          <div className="bs-brand">{BRAND_FA}</div>
          <div className="bs-tagline" aria-hidden="true">PLAN · FOCUS · ACHIEVE</div>
          <div className="bs-phrases" aria-hidden="true">
            {PHRASES.map((p, i) => (
              <span key={i} style={{ animationDelay: `${0.55 + i * 1.6}s` }}>{p}</span>
            ))}
          </div>
        </div>
      </div>
      <script dangerouslySetInnerHTML={{ __html: BOOT_SCRIPT }} />
    </>
  );
}
