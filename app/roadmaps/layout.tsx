import { FeaturePageGate } from "@/components/FeaturePageGate";

// خاموش/روشن از پنل ادمین (/admin/features) — فلگ «roadmaps»
export default function Layout({ children }: { children: React.ReactNode }) {
  return <FeaturePageGate feature="roadmaps">{children}</FeaturePageGate>;
}
