// shimِ next/dynamic روی React.lazy. `ssr` معنایی نداره (همه‌چیز کلاینته)؛
// `loading` به‌عنوانِ fallbackِ Suspense رندر می‌شه، مثلِ Next.
import { ComponentType, createElement, lazy, ReactNode, Suspense } from "react";

type Loader<P> = () => Promise<ComponentType<P> | { default: ComponentType<P> }>;
type DynamicOptions = { ssr?: boolean; loading?: (props: { isLoading?: boolean; pastDelay?: boolean; error?: Error | null }) => ReactNode };

export default function dynamic<P = Record<string, unknown>>(loader: Loader<P>, options: DynamicOptions = {}): ComponentType<P> {
  const Lazy = lazy(async () => {
    const mod = await loader();
    const Comp = (typeof mod === "function" ? mod : (mod as { default: ComponentType<P> }).default) as ComponentType<P>;
    return { default: Comp };
  });
  const fallback = options.loading ? options.loading({ isLoading: true, pastDelay: true, error: null }) : null;
  function DynamicComponent(props: P) {
    return createElement(Suspense, { fallback }, createElement(Lazy as ComponentType<any>, props as any));
  }
  return DynamicComponent as ComponentType<P>;
}
