"use client";

import { cva } from "class-variance-authority";
import {
  addTransitionType,
  lazy,
  startTransition,
  Suspense,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { ThemeCardFooter } from "@/features/themes/components/theme-card-footer";
import { ThemePreviewImage } from "@/features/themes/components/theme-preview-image";
import type { ThemePreviewItem } from "@/features/themes/theme-preview-model";
import { useAppliedTheme } from "@/hooks";
import { CheckIcon, CopyIcon, ExternalLinkIcon, PaletteIcon, ShareIcon } from "@/icons";
import { notifySite } from "@/lib/site-notification-events";
import { getThemeTransitionOrigin, type ThemeTransitionOrigin } from "@/lib/themes/theme-runtime";
import { copyThemeInstallValue, shareThemeLink } from "@/lib/themes/theme-share-client";
import { getThemeShareKey } from "@/lib/themes/theme-sharing";
import { useThemePreferenceRequest } from "@/providers";

const ThemePreviewDialog = lazy(() =>
  import("./theme-preview-dialog").then((module) => ({ default: module.ThemePreviewDialog }))
);

const themeCardOverlayVariants = cva(
  "text-micro/ui text-bright-foreground absolute inline-flex [transform:translateY(-4px)] items-center gap-[0.4rem] border border-[color:color-mix(in_srgb,var(--foreground)_28%,transparent)] bg-[color:color-mix(in_srgb,var(--darker-background)_88%,transparent)] opacity-0 [transition:opacity_160ms_ease,transform_160ms_ease] [.group:focus-within_&]:[transform:translateY(0)] [.group:focus-within_&]:opacity-100 [.group:hover_&]:[transform:translateY(0)] [.group:hover_&]:opacity-100 [@media(hover:none)]:[transform:translateY(0)] [@media(hover:none)]:opacity-100",
  {
    variants: {
      placement: {
        quick:
          "[&:hover]:border-primary [&:hover]:text-primary focus-visible:border-primary focus-visible:text-primary right-3 bottom-3 z-[3] size-8 cursor-pointer justify-center p-0",
        repository:
          "[&:hover]:border-primary [&:hover]:text-primary top-3 right-3 z-[3] px-[0.6rem] py-[0.48rem] underline-offset-[0.2em]",
        share:
          "[&:hover]:border-primary [&:hover]:text-primary focus-visible:border-primary focus-visible:text-primary right-[3.2rem] bottom-3 z-[3] size-8 cursor-pointer justify-center p-0",
      },
    },
  }
);

export function ThemePreviewCollection({
  children,
  initialThemeKey,
  themes,
}: {
  children?: ReactNode;
  initialThemeKey?: string;
  themes: readonly ThemePreviewItem[];
}) {
  const { applyTheme: requestThemeApplication, cancelPendingTheme } = useThemePreferenceRequest();
  const pendingApplyRef = useRef<AbortController | null>(null);
  useEffect(() => () => pendingApplyRef.current?.abort(), []);
  const appliedThemeId = useAppliedTheme();
  const initialTheme = initialThemeKey
    ? (themes.find(
        (theme) => getThemeShareKey({ kind: theme.kind, slug: theme.slug }) === initialThemeKey
      ) ?? null)
    : null;
  const [selectedTheme, setSelectedTheme] = useState<ThemePreviewItem | null>(() => initialTheme);

  useEffect(() => {
    if (!selectedTheme) return;
    const cancelOpening = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      // An open dialog owns its close animation; this only cancels a pending first open.
      if (event.target instanceof Element && event.target.closest("dialog")) return;
      setSelectedTheme(null);
    };
    window.addEventListener("keydown", cancelOpening);
    return () => window.removeEventListener("keydown", cancelOpening);
  }, [selectedTheme]);

  function openTheme(theme: ThemePreviewItem) {
    cancelPendingTheme();
    startTransition(() => {
      addTransitionType("dialog-open");
      setSelectedTheme(theme);
    });
  }

  async function applyTheme(preview: ThemePreviewItem, origin: ThemeTransitionOrigin) {
    pendingApplyRef.current?.abort();
    const request = new AbortController();
    pendingApplyRef.current = request;
    try {
      await requestThemeApplication({ origin, themeId: preview.id, signal: request.signal });
    } catch {
      notifySite("Community themes could not be loaded");
    }
    if (pendingApplyRef.current === request) pendingApplyRef.current = null;
  }

  return (
    <>
      <div className="gap-fluid-md grid grid-cols-3 [@media(max-width:520px)]:!grid-cols-1 [@media(max-width:800px)]:grid-cols-2">
        {themes.map((theme) => (
          <ThemePreviewCard
            isApplied={theme.availability === "ready" && theme.id === appliedThemeId}
            key={theme.id}
            onApply={applyTheme}
            onPreview={openTheme}
            theme={theme}
          />
        ))}
        {children}
      </div>

      {selectedTheme ? (
        <Suspense fallback={null}>
          <ThemePreviewDialog
            key={selectedTheme.id}
            onClose={() => setSelectedTheme(null)}
            theme={selectedTheme}
          />
        </Suspense>
      ) : null}
    </>
  );
}

function ThemePreviewCard({
  isApplied,
  onApply,
  onPreview,
  theme,
}: {
  isApplied: boolean;
  onApply: (theme: ThemePreviewItem, origin: ThemeTransitionOrigin) => Promise<void>;
  onPreview: (theme: ThemePreviewItem) => void;
  theme: ThemePreviewItem;
}) {
  return (
    <article
      className="group border-border bg-background relative min-w-0 overflow-hidden border [contain-intrinsic-size:auto_260px] [content-visibility:auto] [&:focus-within_img]:[transform:scale(1.018)] [&:focus-within_img]:[filter:saturate(1.06)_contrast(1.02)] [&:hover_img]:[transform:scale(1.018)] [&:hover_img]:[filter:saturate(1.06)_contrast(1.02)]"
      data-kind={theme.kind}
    >
      <button
        aria-label={`Preview ${theme.name}`}
        className="focus-visible:outline-ring absolute inset-0 z-[2] w-full cursor-zoom-in border-0 bg-transparent p-0 focus-visible:outline-2 focus-visible:-outline-offset-2"
        onClick={() => onPreview(theme)}
        type="button"
      />
      <div className="border-border relative overflow-hidden border-b bg-(--darker-background) after:pointer-events-none after:absolute after:inset-0 after:bg-[linear-gradient(180deg,transparent_48%,color-mix(in_srgb,var(--darker-background)_82%,transparent))] after:content-['']">
        <ThemePreviewImage
          alt={`${theme.name} theme preview`}
          className="block aspect-video h-auto w-full object-cover [transition:filter_180ms_ease,transform_240ms_ease]"
          loading="lazy"
          sizes="(max-width: 720px) 100vw, (max-width: 1200px) 50vw, 33vw"
          preview={theme.preview}
        />
        <a
          aria-label={`Open ${theme.name} on GitHub`}
          className={themeCardOverlayVariants({ placement: "repository" })}
          href={theme.repository}
          rel="noreferrer"
          target="_blank"
        >
          GitHub <ExternalLinkIcon aria-hidden="true" size={12} />
        </a>
        {theme.availability === "ready" ? (
          <button
            aria-label={`Use ${theme.name} colors on this site`}
            className={themeCardOverlayVariants({ placement: "quick" })}
            onClick={(event) => void onApply(theme, getThemeTransitionOrigin(event))}
            title={`Use ${theme.name} colors`}
            type="button"
          >
            {isApplied ? (
              <CheckIcon aria-hidden="true" size={14} />
            ) : (
              <PaletteIcon aria-hidden="true" size={14} />
            )}
          </button>
        ) : (
          <button
            aria-label={`CopyIcon ${theme.name} install command`}
            className={themeCardOverlayVariants({ placement: "quick" })}
            onClick={() =>
              void copyThemeInstallValue(
                `omarchy theme install ${theme.repository}`,
                `${theme.name} install command copied`
              )
            }
            title="Copy install command"
            type="button"
          >
            <CopyIcon aria-hidden="true" size={14} />
          </button>
        )}
        <button
          aria-label={`Share ${theme.name}`}
          className={themeCardOverlayVariants({ placement: "share" })}
          onClick={() =>
            void shareThemeLink({
              name: theme.name,
              reference: { kind: theme.kind, slug: theme.slug },
            })
          }
          title="Share theme"
          type="button"
        >
          <ShareIcon aria-hidden="true" size={14} />
        </button>
      </div>
      <ThemeCardFooter
        detail={`${theme.kind === "official" ? "Built in" : "Community"}${theme.mode ? ` · ${theme.mode}` : ""}`}
        title={theme.name}
      />
    </article>
  );
}
