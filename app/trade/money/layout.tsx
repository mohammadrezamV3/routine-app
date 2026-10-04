import { FeaturePageGate } from "@/components/FeaturePageGate";

// خاموش/روشن از پنل ادمین (/admin/features) — فلگ «tradeMoneyMgmt»
export default function Layout({ children }: { children: React.ReactNode }) {
  return <FeaturePageGate feature="tradeMoneyMgmt">{children}</FeaturePageGate>;
}
