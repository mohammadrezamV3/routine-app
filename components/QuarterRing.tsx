import { ComponentProps } from "react";
import { cn } from "@/lib/utils";

// دایره‌ی لودینگ — طبق درخواست صریح، جایگزین همه‌جای «اسپینر + متن»
// (مثلا «در حال ثبت…») می‌شود: فقط همین حلقه‌ی چرخان، بدون هیچ متنی.
//
// باگِ «دایره‌ی لودینگ نمی‌چرخه»: قبلا انیمیشن در `style` ست می‌شد و بعد
// `{...props}` پخش می‌شد؛ Spinner همیشه `style`ِ خودش (اندازه/ضخامت) رو
// می‌فرستاد و همون کلِ آبجکتِ style — از جمله animation — رو جایگزین می‌کرد.
// حالا چرخش از کلاسِ .quarter-ring (globals.css) میاد و style ادغام می‌شه، پس
// هیچ prop ای نمی‌تونه خاموشش کنه.
export function QuarterRing({ className, style, ...props }: ComponentProps<"span">) {
  return (
    <span
      role="status"
      className={cn(
        "quarter-ring inline-block rounded-full border-t-[3px] border-r-[3px] border-t-current border-r-transparent",
        className,
      )}
      style={style}
      {...props}
    >
      <span className="sr-only">Loading</span>
    </span>
  );
}
