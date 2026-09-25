import { BRAND_EN, BRAND_FA } from "@/lib/brand";
import { DESCRIPTION_FA, FACTS_FA, PUBLIC_PAGES } from "@/lib/llmsContent";
import { absoluteUrl } from "@/lib/seo";
import { sortedPosts } from "@/lib/blogPosts";

// llms.txt — کانونشن llmstxt.org: یک فایل متنی ساده و کوتاه که به مدل‌های
// زبانی (ChatGPT/Claude/Perplexity/Gemini/Copilot) می‌گوید این سایت چیست
// و کجا باید بخواند. عمدا از lib/brand.ts + lib/seo.ts + lib/blogPosts.ts
// ساخته می‌شود، نه یک متن هاردکد جدا — تا هیچ‌وقت با محتوای واقعی صفحه‌ها
// واگرا نشود. توضیح کامل‌تر در /llms-full.txt است.
export const dynamic = "force-static";
export const revalidate = 86400;

function build(): string {
  const lines: string[] = [];
  lines.push(`# ${BRAND_FA}`);
  lines.push("");
  lines.push(`> ${DESCRIPTION_FA}`);
  lines.push("");
  // یک خط خلاصه‌ی انگلیسی — طبق قرارداد llms.txt، برای مدل‌های زبانی که
  // ورودی انگلیسی می‌خوانند؛ تنها جایی که «Arion» کنار «آریون» می‌آید.
  lines.push(`${BRAND_EN} (${BRAND_FA}) is a Persian (Farsi) all-in-one life-management app: daily/weekly routines, habit tracking, an AI workout & calorie planner, and a trading journal.`);
  lines.push("");
  lines.push("## بخش‌های عمومی");
  for (const p of PUBLIC_PAGES) {
    lines.push(`- [${p.label}](${absoluteUrl(p.path)}): ${p.note}`);
  }
  lines.push("");
  lines.push("## مقاله‌ها");
  lines.push(`- فید RSS: ${absoluteUrl("/blog/feed.xml")}`);
  for (const post of sortedPosts()) {
    lines.push(`- [${post.title}](${absoluteUrl(`/blog/${post.slug}`)}): ${post.excerpt}`);
  }
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
  lines.push(`توضیحات کامل‌تر: ${absoluteUrl("/llms-full.txt")}`);
  return lines.join("\n");
}

export async function GET() {
  return new Response(build(), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
