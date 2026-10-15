"use client";

import { LandingHero } from "@/components/LandingHero";
import { LandingOtherSections } from "@/components/LandingOtherSections";
import { lazySection } from "@/components/lazyOnView";
import { SECTION_META, type SectionKey } from "@/lib/sections";

// لندینگ کاربر واردنشده — طراحی از نو: هیرو با ماکت زنده‌ی اپ، معرفی
// تعاملی ماژول‌ها، و بخش‌های اعتمادسازی تا CTA پایانی. هیرو و ویترین
// idهای sec-landing-hero / sec-landing-features رو خودشون دارن.
//
// سرعت: فقط هیرو توی باندل اولیه‌ست. بقیه‌ی بخش‌ها HTML کامل سرور رو دارن
// (سئو: تیترها، متن، سوالات متداول) ولی JS و هیدریشنشون تا نزدیک‌شدن به
// دید عقب می‌افته (components/lazyOnView.tsx).
/* eslint-disable @typescript-eslint/no-var-requires */
// require فقط داخل شاخه‌ی typeof window === "undefined": webpack روی کلاینت
// اون شاخه رو حذف می‌کنه، پس این ماژول‌ها فقط با import پویا (تنبل) میان.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Mod = Record<string, React.ComponentType<any>>;
const isServer = typeof window === "undefined";
const serverSections = isServer ? () => require("@/components/LandingSections") as Mod : null;
const serverShowcase = isServer ? () => require("@/components/LandingShowcase") as Mod : null;
const serverPlans = isServer ? () => require("@/components/PlanShowcase") as Mod : null;
const serverFooter = isServer ? () => require("@/components/LandingFooter") as Mod : null;

type SecProps = { section?: SectionKey | null };

const S = (name: string, h: number, cv?: [number, number]) =>
  lazySection<SecProps>(
    () => import("@/components/LandingSections").then((m) => ({ default: (m as unknown as Mod)[name] })),
    serverSections && (() => serverSections()[name]),
    h,
    cv,
  );

const Stats = S("LandingStats", 120, [201, 118]);
const Dashboard = S("LandingDashboard", 900, [985, 585]);
const Showcase = lazySection<SecProps>(
  () => import("@/components/LandingShowcase").then((m) => ({ default: m.LandingShowcase })),
  serverShowcase && (() => serverShowcase().LandingShowcase),
  900,
);
const How = S("LandingHowItWorks", 450, [286, 220]);
const Bento = S("LandingBento", 1300, [1901, 925]);
const Features = S("LandingFeatureGrid", 900, [1775, 737]);
const WhyUs = S("LandingWhyUs", 500, [939, 370]);
const Trust = S("LandingTestimonialQuote", 350, [204, 204]);
const Plans = lazySection(
  () => import("@/components/PlanShowcase").then((m) => ({ default: function LandingPlans() { return <m.PlansSection mode="landing" />; } })),
  serverPlans && (() => function LandingPlansSsr() {
    const P = serverPlans().PlansSection as React.ComponentType<{ mode: "landing" }>;
    return <P mode="landing" />;
  }),
  1200,
);
const Faq = S("LandingFAQ", 700, [738, 671]);
const FinalCta = S("LandingFinalCTA", 300, [338, 342]);
const Footer = lazySection<SecProps>(
  () => import("@/components/LandingFooter").then((m) => ({ default: m.LandingFooter })),
  serverFooter && (() => serverFooter().LandingFooter),
  700,
  [798, 495],
);

function Sec({ id, children }: { id: string; children: React.ReactNode }) {
  return <section id={id} style={{ paddingTop: 32 }}>{children}</section>;
}

export function LandingPage({ section = null }: { section?: SectionKey | null }) {
  // دامنه‌ی اصلی: همون چیدمان قبلی، بدون هیچ پراپ یا پوششی (رفتار قبلی دقیقا حفظ می‌شه).
  if (!section) {
    return (
      <>
        <LandingHero />
        <Sec id="sec-landing-stats"><Stats /></Sec>
        <Sec id="sec-landing-dashboard"><Dashboard /></Sec>
        <Showcase />
        <Sec id="sec-landing-how"><How /></Sec>
        <Sec id="sec-landing-bento"><Bento /></Sec>
        <Sec id="sec-landing-allfeatures"><Features /></Sec>
        <Sec id="sec-landing-whyus"><WhyUs /></Sec>
        <Sec id="sec-landing-trust"><Trust /></Sec>
        <Sec id="sec-landing-plans"><Plans /></Sec>
        <Sec id="faq"><Faq /></Sec>
        <Sec id="sec-landing-cta"><FinalCta /></Sec>
        <Footer />
      </>
    );
  }

  // زیردامنه‌ی یک بخش: همه‌ی بخش‌ها به دامنه‌ی همون بخش فیلتر یا بازچیده می‌شن.
  // پوشش display:contents فقط رنگ بخش رو به نوشته‌ی گرادیانی هیرو می‌رسونه (landing-hero.css)
  // و چیدمان رو تغییر نمی‌ده. ردیف قیمت‌ها با CSS مرتب می‌شه (home.css) تا پلن همین بخش اول بیاد.
  const c = SECTION_META[section].colors;
  const vars = { "--section-from": c.from, "--section-mid": c.mid, "--section-to": c.to } as React.CSSProperties;
  const p = { section };
  return (
    <div className="lsec-root" data-landing-section={section} style={vars}>
      <LandingHero section={section} />
      <Sec id="sec-landing-stats"><Stats {...p} /></Sec>
      {section !== "trade" && <Sec id="sec-landing-dashboard"><Dashboard {...p} /></Sec>}
      <Showcase {...p} />
      <Sec id="sec-landing-how"><How {...p} /></Sec>
      <Sec id="sec-landing-bento"><Bento {...p} /></Sec>
      <Sec id="sec-landing-allfeatures"><Features {...p} /></Sec>
      <Sec id="sec-landing-whyus"><WhyUs {...p} /></Sec>
      <Sec id="sec-landing-trust"><Trust /></Sec>
      <Sec id="sec-landing-plans"><Plans /></Sec>
      <Sec id="faq"><Faq {...p} /></Sec>
      <Sec id="sec-landing-cta"><FinalCta {...p} /></Sec>
      <LandingOtherSections section={section} />
      <Footer {...p} />
    </div>
  );
}
