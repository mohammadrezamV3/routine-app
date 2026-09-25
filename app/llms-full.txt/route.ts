import { BRAND_EN, BRAND_FA } from "@/lib/brand";
import { DESCRIPTION_FA, FACTS_FA, FEATURES_FA, PUBLIC_PAGES } from "@/lib/llmsContent";
import { absoluteUrl } from "@/lib/seo";
import { sortedPosts, type BlogBlock } from "@/lib/blogPosts";
import { FAQS } from "@/lib/faqContent";

// llms-full.txt — نسخه‌ی کامل llms.txt: توضیح بلندتر هر بخش، متن کامل
// مقاله‌های بلاگ و همان سوال‌وجواب‌های واقعیِ صفحه‌ی /faq. هدف این است که
// یک مدل زبانی بدون کراول‌کردن کل سایت، بتواند دقیق و صادقانه درباره‌ی
// آریون جواب بدهد.
export const dynamic = "force-static";
export const revalidate = 86400;

function blockToText(b: BlogBlock): string {
  if (b.type === "ul") return b.items.map((i) => `- ${i}`).join("\n");
  if (b.type === "h2" || b.type === "h3") return `\n${b.text}\n`;
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
  lines.push("## مقاله‌ها");
  for (const post of sortedPosts()) {
    lines.push(`### ${post.title}`);
    lines.push(`آدرس: ${absoluteUrl(`/blog/${post.slug}`)}`);
    lines.push(post.description);
    lines.push("");
    for (const block of post.blocks) lines.push(blockToText(block));
    lines.push("");
  }
  return lines.join("\n");
}

export async function GET() {
  return new Response(build(), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
