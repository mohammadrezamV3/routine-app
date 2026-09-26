import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";

export function useNetworkStatus(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let cancelled = false;

    async function setup() {
      if (!Capacitor.isNativePlatform()) {
        // روی وب از window.navigator استفاده کن.
        setOnline(navigator.onLine);
        const onOnline = () => setOnline(true);
        const onOffline = () => setOnline(false);
        window.addEventListener("online", onOnline);
        window.addEventListener("offline", onOffline);
        cleanup = () => {
          window.removeEventListener("online", onOnline);
          window.removeEventListener("offline", onOffline);
        };
        return;
      }
      try {
        const { Network } = await import("@capacitor/network");
        const status = await Network.getStatus();
        if (!cancelled) setOnline(status.connected);
        const listener = await Network.addListener("networkStatusChange", (s) => {
          setOnline(s.connected);
        });
        cleanup = () => {
          listener.remove();
        };
      } catch {
        /* noop */
      }
    }

    setup();
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);

  return online;
}
