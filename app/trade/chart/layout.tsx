import { FeaturePageGate } from "@/components/FeaturePageGate";

// خاموش/روشن از پنل ادمین (/admin/features) — فلگ «tradeChart»
export default function Layout({ children }: { children: React.ReactNode }) {
  return <FeaturePageGate feature="tradeChart">{children}</FeaturePageGate>;
}
