import { PageLoader } from "@/components/PageLoader";

// بازخورد فوری هنگام باز شدن صفحه: همون لحظه‌ی کلیک نشان برند با حلقه‌ی
// چرخان و اسکلت صفحه میاد (نه یک دایره‌ی کوچک روی صفحه‌ی خالی)، تا رندر
// سمت سرور تموم بشه.
export default function Loading() {
  return <PageLoader />;
}
