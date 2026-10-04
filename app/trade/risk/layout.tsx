import { FeaturePageGate } from "@/components/FeaturePageGate";

// خاموش/روشن از پنل ادمین (/admin/features) — فلگ «tradeRisk»
export default function Layout({ children }: { children: React.ReactNode }) {
  return <FeaturePageGate feature="tradeRisk">{children}</FeaturePageGate>;
}
