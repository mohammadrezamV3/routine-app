import { FeaturePageGate } from "@/components/FeaturePageGate";

// خاموش/روشن از پنل ادمین (/admin/features) — فلگ «metatrader»
export default function Layout({ children }: { children: React.ReactNode }) {
  return <FeaturePageGate feature="metatrader">{children}</FeaturePageGate>;
}
