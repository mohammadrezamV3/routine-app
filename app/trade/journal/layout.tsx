import { FeaturePageGate } from "@/components/FeaturePageGate";

// خاموش/روشن از پنل ادمین (/admin/features) — فلگ «tradeJournal»
export default function Layout({ children }: { children: React.ReactNode }) {
  return <FeaturePageGate feature="tradeJournal">{children}</FeaturePageGate>;
}
