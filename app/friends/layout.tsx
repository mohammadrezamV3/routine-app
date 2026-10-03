import { FeaturePageGate } from "@/components/FeaturePageGate";

// خاموش/روشن از پنل ادمین (/admin/features) — فلگ «friends»
export default function Layout({ children }: { children: React.ReactNode }) {
  return <FeaturePageGate feature="friends">{children}</FeaturePageGate>;
}
