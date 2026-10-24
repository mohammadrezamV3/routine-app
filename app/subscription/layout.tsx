import "@/app/_area/subscription.css";
import { OnlineOnly } from "@/components/OnlineOnly";

export default function AreaLayout({ children }: { children: React.ReactNode }) {
  return <OnlineOnly feature="payments">{children}</OnlineOnly>;
}
