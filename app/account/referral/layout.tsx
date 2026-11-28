import type { Metadata } from "next";
import { tr } from "@/lib/i18n";

export function generateMetadata(): Metadata {
  return { title: tr("دعوت دوستان", "Invite friends") };
}

export default function ReferralLayout({ children }: { children: React.ReactNode }) {
  return children;
}
