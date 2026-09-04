import type { Metadata } from "next";
import Link from "next/link";
import { OG_BASE, SOCIAL, SUPPORT_EMAIL, BRAND_FA, BRAND_EN } from "@/lib/brand";
import { TelegramIcon, InstagramIcon } from "@/components/SocialIcons";
import { EnamadBadge } from "@/components/EnamadBadge";

export const metadata: Metadata = {
  title: { absolute: `درباره ${BRAND_FA} (${BRAND_EN}) — اپ فارسی روتین و ورزش` },
  description:
    `${BRAND_FA} (${BRAND_EN}) چیست، چرا ساخته شد و چه بخش‌هایی دارد: روتین روزانه، برنامه‌ی هفتگی، ` +
    `برنامه‌ی بدنسازی، کالری‌شماری، ژورنال ترید و رودمپ یادگیری — همه در یک حساب کاربری.`,
  alternates: { canonical: "/about" },
  openGraph: { ...OG_BASE, url: "/about", title: `درباره ${BRAND_FA}` },
};

// محتوای این صفحه عمدا واقعی و دقیقا منطبق بر کاری‌ست که اپ الان انجام
// می‌دهد — بدون ادعای اثبات‌نشدنی «بهترین» یا آمار ساختگی. دلیل سئویی‌اش
// هم همین است: گوگل صفحه‌ی نازک (این صفحه قبلا ۱۹ کلمه بود) را ارزشی
// نمی‌داند، ولی متن پرکلمه‌ی توخالی را هم جریمه می‌کند. متن زیر هم برای
// آدم مفید است هم عبارت‌هایی را پوشش می‌دهد که کاربر فارسی‌زبان واقعا
// جست‌وجو می‌کند.
const SECTIONS: { title: string; body: string }[] = [
  {
    title: `${BRAND_FA} چیست؟`,
    body:
      `${BRAND_FA} (${BRAND_EN}) یک اپلیکیشن فارسی برای نظم‌دادن به زندگی روزمره است. به‌جای اینکه برای هر بخش ` +
      `از زندگی‌ات یک اپ جدا نصب کنی — یکی برای برنامه‌ریزی روزانه، یکی برای برنامه‌ی ورزشی، ` +
      `یکی برای شمارش کالری و یکی برای ژورنال معاملات — همه‌ی این‌ها در آریون زیر یک حساب کاربری کنار هم‌اند. ` +
      `همه‌چیز فارسی است، با تقویم شمسی، و روی موبایل و کامپیوتر یکسان کار می‌کند.`,
  },
  {
    title: "چرا آریون ساخته شد؟",
    body:
      "مشکل اصلی نبود ابزار نبود؛ پخش‌بودن ابزارها بود. وقتی برنامه‌ی هفتگی‌ات در یک اپ است، تمرین‌هایت در " +
      "اپ دیگر و معاملاتت در یک فایل اکسل، هیچ‌وقت تصویر کاملی از اینکه هفته‌ات چطور گذشته نداری. آریون برای " +
      "همین ساخته شد: یک‌جا ثبت کن، یک‌جا ببین. ضمنا بیشتر اپ‌های این حوزه انگلیسی‌اند و با تقویم میلادی " +
      "کار می‌کنند، که برای کاربر فارسی‌زبان یعنی هر روز یک اصطکاک کوچک.",
  },
  {
    title: "داخل آریون چه چیزهایی هست؟",
    body:
      "برنامه‌ی روزانه و هفتگی برای ساختن روتین و تیک‌زدن کارها؛ " +
      "برنامه‌ی بدنسازی با تمرین‌های تفکیک‌شده و ثبت وزن و اندازه‌های بدن؛ " +
      "کالری‌شماری با پایگاه غذای فارسی و محاسبه‌ی نیاز روزانه؛ ژورنال ترید برای ثبت معاملات، سود و زیان و " +
      "چک‌لیست پیش از ورود؛ و رودمپ یادگیری که با کمک هوش مصنوعی برای هر مهارتی یک مسیر گام‌به‌گام می‌سازد.",
  },
  {
    title: "آریون برای چه کسانی مناسب است؟",
    body:
      "برای کسی که می‌خواهد روی روتین روزانه‌اش کنترل داشته باشد و پیشرفتش را ببیند، نه صرفا یک لیست کار " +
      "داشته باشد. اگر ورزش می‌کنی و می‌خواهی تمرین و تغذیه‌ات کنار برنامه‌ی روزانه‌ات باشد، یا معامله‌گری " +
      "که به یک ژورنال منظم فارسی نیاز دارد، آریون برای تو ساخته شده. اگر فقط یک بخش را لازم داری، " +
      "بخش‌های پایه‌ی آریون رایگان‌اند و می‌توانی بدون هزینه شروع کنی.",
  },
  {
    title: "داده‌ها و حریم خصوصی",
    body:
      "اطلاعاتی که در آریون ثبت می‌کنی فقط برای خودت قابل مشاهده است. رمز عبور با bcrypt هش می‌شود، نشست " +
      "ورود با توکن امضاشده مدیریت می‌شود و ارتباط با سایت روی HTTPS رمزنگاری‌شده است. جزئیات بیشتر در " +
      "صفحه‌ی قوانین و مقررات آمده است.",
  },
];

export default function AboutPage() {
  const rows = [
    { label: "سازنده", value: "Arion Group" },
    { label: "ایمیل", value: SUPPORT_EMAIL, href: `mailto:${SUPPORT_EMAIL}` },
    { label: "تلگرام", value: SOCIAL.telegram.handle, href: SOCIAL.telegram.url, icon: <TelegramIcon size={14} /> },
    { label: "اینستاگرام", value: SOCIAL.instagram.handle, href: SOCIAL.instagram.url, icon: <InstagramIcon size={14} /> },
  ];

  return (
    <section>
      <h1>{`درباره ${BRAND_FA}`}</h1>
      <div className="dateline" style={{ marginBottom: 18 }}>
        {`${BRAND_FA} (${BRAND_EN}) — همه‌ی نظم زندگی‌ات، یک‌جا`}
      </div>

      {SECTIONS.map((s) => (
        <div key={s.title} style={{ marginTop: 20 }}>
          <h2>{s.title}</h2>
          <div style={{ marginTop: 6, fontSize: 13.5, color: "var(--muted)", lineHeight: 1.9 }}>{s.body}</div>
        </div>
      ))}

      {/* لینک داخلی به صفحه‌های عمومی دیگر — هم برای کاربر مفید است، هم به
          کراولر کمک می‌کند بقیه‌ی صفحه‌ها را پیدا کند (این سایت هیچ بک‌لینک
          بیرونی ندارد، پس لینک‌دهی داخلی تنها مسیر کشف صفحه‌هاست). */}
      <div style={{ marginTop: 20 }}>
        <h2>بیشتر بخوان</h2>
        <div style={{ marginTop: 6, fontSize: 13.5, color: "var(--muted)", lineHeight: 1.9 }}>
          جواب سوال‌های رایج در{" "}
          <Link href="/faq" style={{ color: "var(--accent)", textDecoration: "none" }}>
            سوالات متداول
          </Link>{" "}
          آمده، و شرایط استفاده در{" "}
          <Link href="/terms" style={{ color: "var(--accent)", textDecoration: "none" }}>
            قوانین و مقررات
          </Link>
          .
        </div>
      </div>

      <div style={{ marginTop: 26 }}>
        <h2>راه‌های تماس</h2>
      </div>
      <div className="about-list">
        {rows.map((r) => (
          <div key={r.label} className="about-row">
            <span className="about-label">{r.label}</span>
            {r.href ? (
              <a
                href={r.href}
                className="mono"
                style={{ color: "var(--accent)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}
                dir="ltr"
                {...(r.href.startsWith("http")
                  ? { target: "_blank", rel: "me noopener noreferrer" }
                  : {})}
              >
                {r.icon}
                {r.value}
              </a>
            ) : (
              <span className="mono" dir="ltr">{r.value}</span>
            )}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 24 }}>
        <EnamadBadge />
      </div>
    </section>
  );
}
