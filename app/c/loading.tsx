import { PageLoader } from "@/components/PageLoader";

// جاگیر سبک per-route (نه app/loading.tsx ریشه، چون notFound رو soft-404 می‌کرد)
export default function Loading() {
  return <PageLoader />;
}
