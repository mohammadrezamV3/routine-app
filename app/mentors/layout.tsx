import "@/app/_area/mentors.css";
import { FeaturePageGate } from "@/components/FeaturePageGate";
import { OnlineOnly } from "@/components/OnlineOnly";

// خاموش/روشن از پنل ادمین (/admin/features) — فلگ «mentors»
export default function Layout({ children }: { children: React.ReactNode }) {
  return <FeaturePageGate feature="mentors"><OnlineOnly feature="mentor">{children}</OnlineOnly></FeaturePageGate>;
}
