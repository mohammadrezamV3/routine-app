import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";

const ROOT_TABS = new Set(["/", "/routine", "/exercise", "/trade", "/more"]);

/** فقط خودِ ریشه‌ی تب‌ها (نه زیرمسیرهای تو در توی فیچرها مثل /exercise/catalog) */
export function isRootTab(pathname: string): boolean {
  const p = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return ROOT_TABS.has(p || "/");
}

// دکمه‌ی برگشت هاردویر اندروید: توی تب‌های ریشه اپ رو می‌بنده (طبق رفتار
// استاندارد اندروید)، وگرنه توی history برمی‌گرده.
export function useHardwareBack() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let listenerHandle: { remove: () => void } | undefined;
    let cancelled = false;

    (async () => {
      try {
        const { App } = await import("@capacitor/app");
        const handle = await App.addListener("backButton", () => {
          if (isRootTab(location.pathname)) {
            App.exitApp();
          } else {
            navigate(-1);
          }
        });
        if (cancelled) {
          handle.remove();
        } else {
          listenerHandle = handle;
        }
      } catch {
        /* noop */
      }
    })();

    return () => {
      cancelled = true;
      listenerHandle?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);
}
