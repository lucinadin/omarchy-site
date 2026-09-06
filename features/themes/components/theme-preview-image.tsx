import { Image } from "@/components/ui/image";
import type { BackgroundPreference } from "@/lib/themes/background";
import type { ThemePreview } from "@/lib/themes/themes";
import { wallpapers } from "@/lib/themes/wallpapers";

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

export function BackgroundPreviewImage({
  preference,
  color,
  loading,
}: {
  preference: BackgroundPreference;
  color: string;
  loading: "eager" | "lazy";
}) {
  if (preference.kind === "wallpaper") {
    return (
      <Image
        alt=""
        fill
        loading={loading}
        placeholder="blur"
        sizes="(max-width: 640px) 66vw, 512px"
        src={wallpapers[preference.themeId]}
      />
    );
  }
  return (
    <span
      className="home-theme-picker__solid"
      style={{ backgroundColor: preference.kind === "solid" ? preference.color : color }}
    >
      Solid color
    </span>
  );
}
