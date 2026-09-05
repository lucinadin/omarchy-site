"use client";

export function HomeEmptyWorkspace({ onOpenTerminal }: { onOpenTerminal?: () => void }) {
  return (
    <div className="flex h-full items-center justify-center">
      {onOpenTerminal ? (
        <button
          aria-label="Open terminal"
          className="text-meta/none text-foreground [&:hover]:border-primary focus-visible:border-primary hidden items-center gap-[0.65rem] border border-[color-mix(in_srgb,var(--foreground)_32%,var(--border))] bg-[color-mix(in_srgb,var(--background)_88%,transparent)] px-[0.85rem] py-[0.72rem] [font-family:var(--font-mono)] focus-visible:bg-[color-mix(in_srgb,var(--primary)_18%,var(--background))] [&:hover]:bg-[color-mix(in_srgb,var(--primary)_18%,var(--background))] [@media(max-width:620px)]:inline-flex"
          onClick={onOpenTerminal}
          type="button"
        >
          <span aria-hidden="true">❯_</span>
          <span>Open terminal</span>
        </button>
      ) : null}
    </div>
  );
}
