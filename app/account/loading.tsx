import { LoadingBlock } from "@/components/Spinner";

// بازخوردِ فوری هنگامِ باز شدنِ صفحه (رندرِ سمتِ سرور روی اینترنتِ کند
// چند لحظه طول می‌کشه و بدونِ این، تپ «باز نمی‌شه» حس می‌شد).
export default function Loading() {
  return <LoadingBlock />;
}
