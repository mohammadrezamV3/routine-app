import { FeaturePageGate } from "@/components/FeaturePageGate";

// خاموش/روشن از پنل ادمین (/admin/features) — فلگ «trade»
export default function Layout({ children }: { children: React.ReactNode }) {
  return <FeaturePageGate feature="trade">{children}</FeaturePageGate>;
}
