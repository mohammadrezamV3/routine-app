import { FeaturePageGate } from "@/components/FeaturePageGate";

// خاموش/روشن از پنل ادمین (/admin/features) — فلگ «streak»
export default function Layout({ children }: { children: React.ReactNode }) {
  return <FeaturePageGate feature="streak">{children}</FeaturePageGate>;
}
