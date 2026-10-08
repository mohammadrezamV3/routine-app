import { BRAND_EN, BRAND_FA } from "@/lib/brand";
import { BLOG_CATEGORY_PAGES, DESCRIPTION_FA, FACTS_FA, FEATURES_FA, PUBLIC_PAGES, TOOL_PAGES } from "@/lib/llmsContent";
import { absoluteUrl } from "@/lib/seo";
import { fillPriceCopy } from "@/lib/planPricing";
import { getPricingConfig } from "@/lib/planPricingServer";
import { sortedPosts, type BlogBlock } from "@/lib/blogPosts";
import { FAQS } from "@/lib/faqContent";

// llms-full.txt — نسخه‌ی کامل llms.txt: توضیح بلندتر هر بخش، متن کامل
// مقاله‌های بلاگ و همان سوال‌وجواب‌های واقعی صفحه‌ی /faq. هدف این است که
// یک مدل زبانی بدون کراول‌کردن کل سایت، بتواند دقیق و صادقانه درباره‌ی
// آریون جواب بدهد.
export const dynamic = "force-static";
// قیمت داخل متن از پنل ادمین (/admin/pricing) پر می‌شه — هر ساعت تازه
export const revalidate = 3600;

function blockToText(b: BlogBlock): string {
  if (b.type === "ul") return b.items.map((i) => `- ${i}`).join("\n");
  if (b.type === "ol") return b.items.map((i, n) => `${n + 1}. ${i}`).join("\n");
  if (b.type === "h2" || b.type === "h3") return `\n${b.text}\n`;
  if (b.type === "tip") return b.title ? `نکته (${b.title}): ${b.text}` : `نکته: ${b.text}`;
  if (b.type === "table") {
    return [b.head, ...b.rows].map((r) => r.join(" | ")).join("\n");
  }
  if (b.type === "cta") return `${b.label}: ${absoluteUrl(b.href)}`;
  return b.text;
}

function build(): string {
  const lines: string[] = [];
  lines.push(`# ${BRAND_FA} — توضیح کامل`);
  lines.push("");
  lines.push(`${BRAND_EN} (${BRAND_FA}) is a Persian (Farsi) all-in-one life-management app.`);
  lines.push("");
  lines.push(DESCRIPTION_FA);
  lines.push("");
  lines.push("## حقایق");
  lines.push(`- چیست: ${FACTS_FA.what}`);
  lines.push(`- مخاطب: ${FACTS_FA.who}`);
  lines.push(`- قیمت‌گذاری: ${FACTS_FA.pricing}`);
  lines.push(`- پلتفرم‌ها: ${FACTS_FA.platforms}`);
  lines.push(`- زبان: ${FACTS_FA.language}`);
  lines.push(`- تماس: ${FACTS_FA.contact}`);
  lines.push(`- شبکه‌های اجتماعی: ${FACTS_FA.socials.join(", ")}`);
  lines.push("");
  lines.push("## امکانات");
  for (const f of FEATURES_FA) lines.push(`- ${f}`);
  lines.push("");
  lines.push("## بخش‌های عمومی سایت");
  for (const p of PUBLIC_PAGES) {
    lines.push(`### ${p.label}`);
    lines.push(`آدرس: ${absoluteUrl(p.path)}`);
    lines.push(p.note);
    lines.push("");
  }
  lines.push("## سوالات متداول");
  for (const f of FAQS) {
    lines.push(`### ${f.q}`);
    lines.push(f.a);
    lines.push("");
  }
  lines.push("## ابزارهای رایگان");
  for (const t of TOOL_PAGES) {
    lines.push(`### ${t.label}`);
    lines.push(`آدرس: ${absoluteUrl(t.path)}`);
    lines.push(t.note);
    lines.push("");
  }
  lines.push("## دسته‌های مقاله‌ها");
  for (const c of BLOG_CATEGORY_PAGES) {
    lines.push(`### ${c.label}`);
    lines.push(`آدرس: ${absoluteUrl(c.path)}`);
    lines.push(c.note);
    lines.push("");
  }
  lines.push("## مقاله‌ها");
  for (const post of sortedPosts()) {
    lines.push(`### ${post.title}`);
    lines.push(`آدرس: ${absoluteUrl(`/blog/${post.slug}`)}`);
    lines.push(post.description);
    lines.push("");
    for (const block of post.blocks) lines.push(blockToText(block));
    lines.push("");
    if (post.faq && post.faq.length > 0) {
      lines.push("پرسش‌های متداول این مقاله:");
      for (const f of post.faq) {
        lines.push(`Q: ${f.q}`);
        lines.push(`A: ${f.a}`);
      }
      lines.push("");
    }
  }
  return lines.join("\n");
}

export async function GET() {
  return new Response(fillPriceCopy(build(), await getPricingConfig()), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
