import { FeaturePageGate } from "@/components/FeaturePageGate";

// مقاله‌ها قبلا SSG بودن؛ گیت فلگ باید هر درخواست سنجیده بشه
export const dynamic = "force-dynamic";

// خاموش/روشن از پنل ادمین (/admin/features) — فلگ «blog»
export default function Layout({ children }: { children: React.ReactNode }) {
  return <FeaturePageGate feature="blog">{children}</FeaturePageGate>;
}
