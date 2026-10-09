import Link from "next/link";
import { Calculator, Flame, Moon, Scale } from "lucide-react";
import { ToolPageShell } from "@/components/ToolPageShell";
import type { Metadata } from "next";
import { brandName } from "@/lib/brand";
import { tr } from "@/lib/i18n";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { PUBLIC_TOOLS, toolDescription, toolLabel } from "@/lib/tools";
import { itemListJsonLd } from "@/lib/toolsSeo";

export function generateMetadata(): Metadata {
  return pageMetadata({
    title: tr(`ابزارهای رایگان آنلاین: خواب، کالری، BMI و لات | ${brandName()}`, `Free online tools: sleep, calories, BMI and lot size | ${brandName()}`),
    description: tr(
      "ابزارهای رایگان آریون: محاسبه ساعت خواب، کالری روزانه، BMI و حجم لات فارکس. بدون نیاز به ورود به حساب و همه محاسبه‌ها در مرورگر خودت انجام می‌شود.",
      "Free Arion tools: sleep time, daily calories, BMI and forex lot size calculators. No sign-in needed and every calculation runs in your own browser.",
    ),
    path: "/tools",
  });
}

const ICONS: Record<string, typeof Moon> = {
  "/tools/sleep-calculator": Moon,
  "/tools/calorie-calculator": Flame,
  "/tools/bmi-calculator": Scale,
  "/tools/lot-size-calculator": Calculator,
};

const breadcrumb = () => [
  { name: brandName(), path: "/" },
  { name: tr("ابزارهای رایگان", "Free tools"), path: "/tools" },
];

export default function ToolsHubPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([breadcrumbJsonLd(breadcrumb()), itemListJsonLd(PUBLIC_TOOLS.map((t) => ({ path: t.path, label: toolLabel(t) })))]) }}
      />
      <ToolPageShell
        breadcrumb={breadcrumb()}
        h1={tr("ابزارهای رایگان آریون", "Free Arion tools")}
        lead={tr("چند ماشین‌حساب ساده برای خواب، تغذیه، تناسب اندام و معاملات. همه بدون ورود به حساب کار می‌کنند و محاسبه در مرورگر خودت انجام می‌شود.", "A few simple calculators for sleep, nutrition, fitness and trading. They all work without signing in and the calculation runs in your own browser.")}
        cta={{
          title: tr("از ماشین‌حساب تا برنامه‌ی روزانه", "From calculator to daily plan"),
          body: tr("اگر می‌خواهی نتیجه‌ی این ابزارها را به عادت روزانه تبدیل کنی، آریون برنامه‌ی روزانه، خواب، کالری، تمرین و ژورنال ترید را در یک جا کنار هم می‌گذارد. هر حساب تازه 14 روز دوره‌ی آزمایشی روتین دارد.", "If you want to turn the results of these tools into a daily habit, Arion puts your daily plan, sleep, calories, workouts and trading journal side by side in one place. Every new account gets a 14-day routine trial."),
          label: tr("ساخت حساب در آریون", "Create an Arion account"),
        }}
      >
        <ul className="tl-hub" style={{ listStyle: "none", padding: 0 }}>
          {PUBLIC_TOOLS.map((tool) => {
            const Icon = ICONS[tool.path] || Calculator;
            return (
              <li key={tool.path}>
                <Link href={tool.path} className="tl-hub-card">
                  <h2><Icon size={18} aria-hidden="true" /> {toolLabel(tool)}</h2>
                  <p>{toolDescription(tool)}</p>
                  <span className="tl-hub-go">{tr("باز کردن ابزار", "Open tool")}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </ToolPageShell>
    </>
  );
}
