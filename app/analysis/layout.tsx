import { FeaturePageGate } from "@/components/FeaturePageGate";

// خاموش/روشن از پنل ادمین (/admin/features) — فلگ «weeklyAnalysis»
export default function Layout({ children }: { children: React.ReactNode }) {
  return <FeaturePageGate feature="weeklyAnalysis">{children}</FeaturePageGate>;
}
