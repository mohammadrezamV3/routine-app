import { FeaturePageGate } from "@/components/FeaturePageGate";

// خاموش/روشن از پنل ادمین (/admin/features) — فلگ «forexClock»
export default function Layout({ children }: { children: React.ReactNode }) {
  return <FeaturePageGate feature="forexClock">{children}</FeaturePageGate>;
}
