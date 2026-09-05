import Image from "next/image";

import type { ThemePreview } from "@/lib/themes/themes";

export function ThemePreviewImage({
  className,
  alt,
  fill = false,
  loading,
  sizes,
  preview,
}: {
  alt: string;
  className?: string;
  fill?: boolean;
  loading: "eager" | "lazy";
  sizes: string;
  preview: ThemePreview;
}) {
  const image = (
    <Image
      alt={alt}
      blurDataURL={preview?.blurDataURL}
      className={className}
      crossOrigin="anonymous"
      decoding="async"
      fill={fill}
      fetchPriority={loading === "eager" ? "high" : "auto"}
      height={fill ? undefined : (preview.height ?? 1080)}
      loading={loading}
      placeholder={preview?.blurDataURL ? "blur" : "empty"}
      sizes={sizes}
      src={preview.image}
      width={fill ? undefined : (preview.width ?? 1920)}
    />
  );

  if (!preview.renditions) return image;

  return (
    <picture className={fill ? "absolute inset-0" : "block"}>
      <source
        sizes={sizes}
        srcSet={preview.renditions
          .map((rendition) => `${rendition.path} ${rendition.width}w`)
          .join(", ")}
        type="image/webp"
      />
      {image}
    </picture>
  );
}
