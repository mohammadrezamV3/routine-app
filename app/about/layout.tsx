import { FeaturePageGate } from "@/components/FeaturePageGate";

// خاموش/روشن از پنل ادمین (/admin/features) — فلگ «about»
export default function Layout({ children }: { children: React.ReactNode }) {
  return <FeaturePageGate feature="about">{children}</FeaturePageGate>;
}
