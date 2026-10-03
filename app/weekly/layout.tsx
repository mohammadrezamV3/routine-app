import { FeaturePageGate } from "@/components/FeaturePageGate";

// خاموش/روشن از پنل ادمین (/admin/features) — فلگ «routine»
export default function Layout({ children }: { children: React.ReactNode }) {
  return <FeaturePageGate feature="routine">{children}</FeaturePageGate>;
}
