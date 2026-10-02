import { FeaturePageGate } from "@/components/FeaturePageGate";

// خاموش/روشن از پنل ادمین (/admin/features) — فلگ «sleep»
export default function Layout({ children }: { children: React.ReactNode }) {
  return <FeaturePageGate feature="sleep">{children}</FeaturePageGate>;
}
