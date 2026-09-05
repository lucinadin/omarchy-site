"use client";

import {
  addTransitionType,
  startTransition,
  useEffect,
  useId,
  useRef,
  useState,
  ViewTransition,
} from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { KbdShortcut } from "@/components/ui/kbd";
import { SegmentedControl, SegmentedControlItem } from "@/components/ui/segmented-control";
import { ThemePreviewImage } from "@/features/themes/components/theme-preview-image";
import type { InstallThemePreview } from "@/features/themes/theme-preview-model";
import { ChevronRightIcon, CloseIcon, CopyIcon, ExternalLinkIcon, ShareIcon } from "@/icons";
import { copyThemeInstallValue, shareThemeLink } from "@/lib/themes/theme-share-client";

const installMethodOptions = [
  { label: "Menu", value: "menu" },
  { label: "CLI", value: "cli" },
] as const;

type InstallMethod = (typeof installMethodOptions)[number]["value"];

const dialogExitDuration = 190;

function getTransitionDelay() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : dialogExitDuration;
}

export function InstallThemeDialog({
  onClose,
  theme,
}: {
  onClose: () => void;
  theme: InstallThemePreview;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const dialogTitleId = useId();
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [closeRequested, setCloseRequested] = useState(false);
  const [contentVisible, setContentVisible] = useState(true);
  const [installMethod, setInstallMethod] = useState<InstallMethod>("menu");
  const installCommand = `omarchy theme install ${theme.repository}`;

  function clearTransitionTimer() {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  }

  function requestClose() {
    if (closeRequested) return;

    clearTransitionTimer();
    setCloseRequested(true);
    startTransition(() => {
      addTransitionType("dialog-close");
      setContentVisible(false);
    });

    closeTimerRef.current = setTimeout(() => {
      const dialog = dialogRef.current;
      if (dialog?.open) dialog.close();
      else onClose();
    }, getTransitionDelay());
  }

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();

    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  return (
    <dialog
      aria-labelledby={dialogTitleId}
      className="theme-preview-dialog text-foreground m-auto max-h-[calc(100dvh-4rem)] w-[min(960px,calc(100vw-4rem))] max-w-none overflow-visible border-0 bg-transparent p-0 [@media(max-width:520px)]:max-h-[calc(100dvh-1rem)] [@media(max-width:520px)]:w-[calc(100vw-1rem)]"
      data-closing={closeRequested ? "" : undefined}
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
      onClose={onClose}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
      ref={dialogRef}
    >
      {contentVisible ? (
        <ViewTransition
          default="none"
          enter={{ "dialog-open": "dialog-scale-in", default: "none" }}
          exit={{ "dialog-close": "dialog-scale-out", default: "none" }}
        >
          <div className="border-border bg-background grid max-h-[calc(100dvh-4rem)] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden border [@media(max-width:520px)]:max-h-[calc(100dvh-1rem)]">
            <header className="border-border grid grid-cols-[minmax(0,1fr)_auto] items-center border-b py-0 pr-[0.4rem] pl-3">
              <div className="flex min-w-0 items-baseline gap-[0.55rem]">
                <span className="text-micro/ui text-primary uppercase">Community</span>
                <h2
                  className="text-meta text-bright-foreground m-0 truncate font-medium"
                  id={dialogTitleId}
                >
                  {theme.name}
                </h2>
              </div>
              <nav aria-label="Theme preview actions" className="flex items-center gap-[0.15rem]">
                <Button
                  aria-label={`Share ${theme.name}`}
                  onClick={() =>
                    void shareThemeLink({
                      name: theme.name,
                      reference: { kind: theme.kind, slug: theme.slug },
                    })
                  }
                  size="compactIcon"
                  title="Share theme"
                  variant="ghost"
                >
                  <ShareIcon aria-hidden="true" />
                </Button>
                <a
                  aria-label={`Open ${theme.name} on GitHub`}
                  className={buttonVariants({ size: "compactIcon", variant: "ghost" })}
                  href={theme.repository}
                  rel="noreferrer"
                  target="_blank"
                  title="View on GitHub"
                >
                  <ExternalLinkIcon aria-hidden="true" />
                </a>
                <Button
                  aria-label="Close theme preview"
                  onClick={requestClose}
                  size="compactIcon"
                  variant="ghost"
                >
                  <CloseIcon aria-hidden="true" />
                </Button>
              </nav>
            </header>

            <div className="min-h-0 overflow-auto bg-(--darker-background)">
              <ThemePreviewImage
                alt={`${theme.name} theme preview`}
                className="mx-auto block h-auto max-h-[calc(100dvh-12rem)] w-full object-contain [@media(max-width:520px)]:max-h-[calc(100dvh-14rem)]"
                loading="eager"
                sizes="(max-width: 900px) 100vw, 92vw"
                preview={theme.preview}
              />
            </div>

            <footer className="border-border border-t px-[1.15rem] py-4">
              <div className="grid min-w-0 gap-[0.65rem]">
                <div className="text-meta text-muted-foreground flex min-h-6 items-center gap-[0.4rem] overflow-x-auto whitespace-nowrap">
                  {installMethod === "menu" ? (
                    <>
                      <KbdShortcut modifierLabel="Super" modifierSymbol="❖" variant="hint">
                        Space
                      </KbdShortcut>
                      <ChevronRightIcon aria-hidden="true" size={13} />
                      <span className="text-bright-foreground">Install</span>
                      <ChevronRightIcon aria-hidden="true" size={13} />
                      <span className="text-bright-foreground">Style</span>
                      <ChevronRightIcon aria-hidden="true" size={13} />
                      <span className="text-bright-foreground">Theme</span>
                    </>
                  ) : (
                    <>
                      <code aria-hidden="true" className="text-primary">
                        $
                      </code>
                      <span className="text-bright-foreground">Run in terminal</span>
                    </>
                  )}
                </div>
                <InstallCopyRow
                  installMethod={installMethod}
                  onInstallMethodChange={setInstallMethod}
                  value={installMethod === "menu" ? theme.repository : installCommand}
                />
              </div>
            </footer>
          </div>
        </ViewTransition>
      ) : null}
    </dialog>
  );
}

function InstallCopyRow({
  installMethod,
  onInstallMethodChange,
  value,
}: {
  installMethod: InstallMethod;
  onInstallMethodChange: (method: InstallMethod) => void;
  value: string;
}) {
  const copyLabel = installMethod === "menu" ? "Theme URL" : "Install command";

  return (
    <div className="border-border grid min-h-9 grid-cols-[auto_minmax(0,1fr)_2.25rem] items-stretch border">
      <SegmentedControl
        aria-label="Install method"
        className="h-full border-0 border-r"
        onValueChange={(nextValue) => {
          const method = installMethodOptions.find((option) => option.value === nextValue);
          if (method !== undefined) onInstallMethodChange(method.value);
        }}
        value={installMethod}
      >
        {installMethodOptions.map((option) => (
          <SegmentedControlItem key={option.value} value={option.value}>
            {option.label}
          </SegmentedControlItem>
        ))}
      </SegmentedControl>
      <code className="text-micro/ui text-foreground flex min-w-0 [scrollbar-width:thin] items-center overflow-x-auto bg-(--darker-background) px-[0.65rem] whitespace-nowrap">
        {value}
      </code>
      <button
        aria-label={`CopyIcon ${copyLabel.toLowerCase()}`}
        className="border-border bg-surface text-muted-foreground [&:hover]:text-primary focus-visible:text-primary grid cursor-pointer place-items-center border-0 border-l"
        onClick={() => void copyThemeInstallValue(value, `${copyLabel} copied`)}
        type="button"
      >
        <CopyIcon aria-hidden="true" size={14} />
        <span className="sr-only">Copy {copyLabel.toLowerCase()}</span>
      </button>
    </div>
  );
}
