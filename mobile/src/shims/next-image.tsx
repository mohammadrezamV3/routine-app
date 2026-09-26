// shimِ next/image — همون `<img>`ی که Next با unoptimized رندر می‌کنه
// (data-nimg، color:transparent، lazy مگر priority، و استایلِ fill).
import { CSSProperties, forwardRef, ImgHTMLAttributes } from "react";

type StaticImport = { src: string; width?: number; height?: number };

export type ImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "width" | "height" | "loading"> & {
  src: string | StaticImport;
  alt: string;
  width?: number | `${number}`;
  height?: number | `${number}`;
  fill?: boolean;
  priority?: boolean;
  quality?: number | `${number}`;
  placeholder?: string;
  blurDataURL?: string;
  unoptimized?: boolean;
  loader?: unknown;
  loading?: "lazy" | "eager";
  overrideSrc?: string;
  onLoadingComplete?: (img: HTMLImageElement) => void;
};

const FILL_STYLE: CSSProperties = { position: "absolute", height: "100%", width: "100%", left: 0, top: 0, right: 0, bottom: 0 };

const Image = forwardRef<HTMLImageElement, ImageProps>(function Image(
  { src, alt, width, height, fill, priority, quality: _q, placeholder: _p, blurDataURL: _b, unoptimized: _u, loader: _l, loading, overrideSrc: _o, onLoadingComplete, onLoad, style, sizes, ...rest },
  ref
) {
  const url = typeof src === "string" ? src : src.src;
  const w = fill ? undefined : width ?? (typeof src === "object" ? src.width : undefined);
  const h = fill ? undefined : height ?? (typeof src === "object" ? src.height : undefined);
  return (
    <img
      ref={ref}
      alt={alt}
      {...rest}
      width={w}
      height={h}
      sizes={fill ? sizes : undefined}
      loading={priority ? undefined : loading ?? "lazy"}
      {...(priority ? { fetchpriority: "high" } : {})}
      decoding="async"
      data-nimg={fill ? "fill" : "1"}
      style={{ ...(fill ? FILL_STYLE : null), color: "transparent", ...style }}
      src={url}
      onLoad={(e) => {
        onLoad?.(e);
        onLoadingComplete?.(e.currentTarget);
      }}
    />
  );
});

export default Image;
