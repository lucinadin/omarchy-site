import type { ThemeKind } from "@/lib/themes/themes";

export type ThemeShareReference = {
  kind: ThemeKind;
  slug: string;
};

export function getThemeShareKey({ kind, slug }: ThemeShareReference) {
  return `${kind}/${slug}`;
}

export function parseThemeShareKey(value: string | string[] | undefined) {
  if (value === undefined || Array.isArray(value)) return null;

  const [kind, slug, ...rest] = value.split("/");
  if ((kind !== "community" && kind !== "official") || !slug || rest.length > 0) return null;

  return { kind, slug } satisfies ThemeShareReference;
}

export function getThemeShareHref(reference: ThemeShareReference) {
  return `/themes/${getThemeShareKey(reference)}/`;
}

export function getThemeOpenGraphHref({ kind, slug }: ThemeShareReference) {
  return `/assets/og/themes/${kind}/${slug}.png`;
}
