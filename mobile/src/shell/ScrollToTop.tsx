// مثلِ ناوبریِ Next: هر push/replace صفحه رو به بالا می‌بره (مگر
// `scroll={false}` / `{ scroll: false }` که shimها در state می‌ذارن)؛ برگشت
// (POP) موقعیت رو دست نمی‌زنه.
import { useLayoutEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

export function ScrollToTop() {
  const location = useLocation();
  const type = useNavigationType();
  useLayoutEffect(() => {
    if (type === "POP") return;
    if ((location.state as { noScroll?: boolean } | null)?.noScroll) return;
    if (location.hash) return;
    window.scrollTo(0, 0);
  }, [location.pathname, location.search, location.key, location.hash, location.state, type]);
  return null;
}
