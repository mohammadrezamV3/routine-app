import Link from "next/link";
import { Calculator, Flame, Moon, Scale } from "lucide-react";
import { ToolPageShell } from "@/components/ToolPageShell";
import { BRAND_FA } from "@/lib/brand";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { PUBLIC_TOOLS } from "@/lib/tools";
import { itemListJsonLd } from "@/lib/toolsSeo";

export const metadata = pageMetadata({
  title: `ابزارهای رایگان آنلاین: خواب، کالری، BMI و لات | ${BRAND_FA}`,
  description:
    "ابزارهای رایگان آریون: محاسبه ساعت خواب، کالری روزانه، BMI و حجم لات فارکس. بدون نیاز به ورود به حساب و همه محاسبه‌ها در مرورگر خودت انجام می‌شود.",
  path: "/tools",
});

const ICONS: Record<string, typeof Moon> = {
  "/tools/sleep-calculator": Moon,
  "/tools/calorie-calculator": Flame,
  "/tools/bmi-calculator": Scale,
  "/tools/lot-size-calculator": Calculator,
};

const BREADCRUMB = [
  { name: BRAND_FA, path: "/" },
  { name: "ابزارهای رایگان", path: "/tools" },
];

export default function ToolsHubPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([breadcrumbJsonLd(BREADCRUMB), itemListJsonLd(PUBLIC_TOOLS)]) }}
      />
      <ToolPageShell
        breadcrumb={BREADCRUMB}
        h1="ابزارهای رایگان آریون"
        lead="چند ماشین‌حساب ساده برای خواب، تغذیه، تناسب اندام و معاملات. همه بدون ورود به حساب کار می‌کنند و محاسبه در مرورگر خودت انجام می‌شود."
        cta={{
          title: "از ماشین‌حساب تا برنامه‌ی روزانه",
          body: "اگر می‌خواهی نتیجه‌ی این ابزارها را به عادت روزانه تبدیل کنی، آریون برنامه‌ی روزانه، خواب، کالری، تمرین و ژورنال ترید را در یک جا کنار هم می‌گذارد. هر حساب تازه 14 روز دوره‌ی آزمایشی روتین دارد.",
          label: "ساخت حساب در آریون",
        }}
      >
        <ul className="tl-hub" style={{ listStyle: "none", padding: 0 }}>
          {PUBLIC_TOOLS.map((tool) => {
            const Icon = ICONS[tool.path] || Calculator;
            return (
              <li key={tool.path}>
                <Link href={tool.path} className="tl-hub-card">
                  <h2><Icon size={18} aria-hidden="true" /> {tool.label}</h2>
                  <p>{tool.description}</p>
                  <span className="tl-hub-go">باز کردن ابزار</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </ToolPageShell>
    </>
  );
}
