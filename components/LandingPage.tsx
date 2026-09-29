"use client";

import { PlansSection } from "@/components/PlanShowcase";
import { LandingFooter } from "@/components/LandingFooter";
import { LandingHero } from "@/components/LandingHero";
import { LandingShowcase } from "@/components/LandingShowcase";
import {
  LandingStats,
  LandingDashboard,
  LandingHowItWorks,
  LandingBento,
  LandingFeatureGrid,
  LandingWhyUs,
  LandingTestimonialQuote,
  LandingFAQ,
  LandingFinalCTA,
} from "@/components/LandingSections";

// لندینگِ کاربرِ واردنشده — طراحیِ از نو: هیرو با ماکتِ زنده‌ی اپ، معرفیِ
// تعاملیِ ماژول‌ها، و بخش‌های اعتمادسازی تا CTAِ پایانی. هیرو و ویترین
// idهای sec-landing-hero / sec-landing-features رو خودشون دارن.
function Sec({ id, children }: { id: string; children: React.ReactNode }) {
  return <section id={id} style={{ paddingTop: 32 }}>{children}</section>;
}

export function LandingPage() {
  return (
    <>
      <LandingHero />
      <Sec id="sec-landing-stats"><LandingStats /></Sec>
      <Sec id="sec-landing-dashboard"><LandingDashboard /></Sec>
      <LandingShowcase />
      <Sec id="sec-landing-how"><LandingHowItWorks /></Sec>
      <Sec id="sec-landing-bento"><LandingBento /></Sec>
      <Sec id="sec-landing-allfeatures"><LandingFeatureGrid /></Sec>
      <Sec id="sec-landing-whyus"><LandingWhyUs /></Sec>
      <Sec id="sec-landing-trust"><LandingTestimonialQuote /></Sec>
      <Sec id="sec-landing-plans"><PlansSection mode="landing" /></Sec>
      <Sec id="faq"><LandingFAQ /></Sec>
      <Sec id="sec-landing-cta"><LandingFinalCTA /></Sec>
      <LandingFooter />
    </>
  );
}
