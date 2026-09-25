import { useEffect, useRef, useState } from "react";
import { liveQuery } from "dexie";

// جایگزین کوچک dexie-react-hooks: یک اشتراک زنده روی Dexie liveQuery.
// دپس با JSON.stringify مقایسه می‌شود (نه reference) چون صداکننده‌ها معمولا
// یک آرایه‌ی تازه هر رندر می‌سازند ([accountId, filter, ...]).
export function useLiveQuery<T>(querier: () => Promise<T> | T, deps: unknown[] = [], initial?: T): T | undefined {
  const [value, setValue] = useState<T | undefined>(initial);
  const depsKey = JSON.stringify(deps);
  const querierRef = useRef(querier);
  querierRef.current = querier;

  useEffect(() => {
    let alive = true;
    const sub = liveQuery(() => querierRef.current()).subscribe({
      next: (v) => {
        if (alive) setValue(v);
      },
      error: (err) => {
        console.error("useLiveQuery", err);
      },
    });
    return () => {
      alive = false;
      sub.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depsKey]);

  return value;
}
