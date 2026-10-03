import { FeaturePageGate } from "@/components/FeaturePageGate";

// خاموش/روشن از پنل ادمین (/admin/features) — فلگ «tradeNotes»
export default function Layout({ children }: { children: React.ReactNode }) {
  return <FeaturePageGate feature="tradeNotes">{children}</FeaturePageGate>;
}
