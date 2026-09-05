"use client";

import Image from "next/image";
import {
  addTransitionType,
  startTransition,
  useEffect,
  useState,
  useSyncExternalStore,
  ViewTransition,
} from "react";

import { Button } from "@/components/ui/button";
import type { WorkstationPhoto } from "@/features/workstations/workstations-data";
import { CloseIcon } from "@/icons";
import { Modal } from "@/lib/ui/modal";

const compactLayoutQuery = "(max-width: 520px)";

function subscribeToCompactLayout(onChange: () => void) {
  const mediaQuery = window.matchMedia(compactLayoutQuery);
  mediaQuery.addEventListener("change", onChange);
  return () => mediaQuery.removeEventListener("change", onChange);
}

function getCompactLayoutSnapshot() {
  return window.matchMedia(compactLayoutQuery).matches;
}

function getServerCompactLayoutSnapshot() {
  return false;
}

export function WorkstationGallery({ photos }: { photos: readonly WorkstationPhoto[] }) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const isCompactLayout = useSyncExternalStore(
    subscribeToCompactLayout,
    getCompactLayoutSnapshot,
    getServerCompactLayoutSnapshot
  );
  const selectedPhoto = selectedIndex === null ? null : photos[selectedIndex];

  function openPhoto(index: number) {
    if (isCompactLayout) return;

    startTransition(() => {
      addTransitionType("workstation-open");
      setSelectedIndex(index);
    });
  }

  function closePhoto() {
    if (selectedIndex === null) return;

    startTransition(() => {
      addTransitionType("workstation-close");
      setSelectedIndex(null);
    });
  }

  useEffect(() => {
    const mediaQuery = window.matchMedia(compactLayoutQuery);
    const closeForCompactLayout = (event: MediaQueryListEvent) => {
      if (event.matches) setSelectedIndex(null);
    };

    mediaQuery.addEventListener("change", closeForCompactLayout);
    return () => mediaQuery.removeEventListener("change", closeForCompactLayout);
  }, []);

  return (
    <>
      <div className="gap-fluid-xs columns-4 [@media(max-width:1050px)]:columns-3 [@media(max-width:520px)]:columns-1 [@media(max-width:800px)]:columns-2">
        {photos.map((photo, index) => {
          const transitionName = `workstation-image-${photo.id}`;
          const image = (
            <Image
              alt=""
              className="block h-auto w-full transition-[filter,transform] [transition-duration:180ms,220ms] [transition-timing-function:ease,ease]"
              height={photo.height}
              loading="lazy"
              sizes="(max-width: 520px) calc(100vw - 2.5rem), (max-width: 800px) 46vw, (max-width: 1050px) 30vw, 23vw"
              src={photo.src}
              width={photo.width}
            />
          );

          if (isCompactLayout) {
            return (
              <figure
                className="border-border mb-fluid-xs relative m-0 block w-full cursor-default break-inside-avoid overflow-hidden border bg-(--darker-background) p-0"
                key={photo.id}
              >
                {image}
              </figure>
            );
          }

          return (
            <button
              aria-label={`Enlarge community workstation ${index + 1}`}
              className="group [&:hover_figure]:border-primary mb-fluid-xs block w-full cursor-zoom-in break-inside-avoid border-0 bg-transparent p-0 [&:hover_img]:[transform:scale(1.015)] [&:hover_img]:[filter:saturate(1.05)]"
              key={photo.id}
              onClick={() => openPhoto(index)}
              type="button"
            >
              <figure className="border-border group-focus-visible:border-primary relative m-0 overflow-hidden border bg-(--darker-background)">
                {selectedIndex === index ? (
                  <span
                    aria-hidden="true"
                    className="block w-full bg-(--darker-background)"
                    style={{ aspectRatio: `${photo.width} / ${photo.height}` }}
                  />
                ) : (
                  <ViewTransition
                    default="none"
                    name={transitionName}
                    share={{
                      "workstation-close": "workstation-image-expand",
                      "workstation-open": "workstation-image-expand",
                      default: "none",
                    }}
                  >
                    {image}
                  </ViewTransition>
                )}
              </figure>
            </button>
          );
        })}
      </div>

      {!isCompactLayout && selectedPhoto && selectedIndex !== null ? (
        <Modal
          ariaLabel={`Community workstation ${selectedIndex + 1}`}
          className="pointer-events-none fixed inset-8 z-[201] grid h-auto w-auto place-items-center"
          onOpenChange={(open) => {
            if (!open) closePhoto();
          }}
          open
          overlayClassName="workstation-lightbox__backdrop fixed inset-0 z-[200] cursor-zoom-out border-0 bg-[color-mix(in_srgb,#000_78%,transparent)] p-0"
          renderOverlay={(overlay) => (
            <ViewTransition
              default="none"
              enter={{ "workstation-open": "workstation-backdrop-in", default: "none" }}
              exit={{ "workstation-close": "workstation-backdrop-out", default: "none" }}
            >
              {overlay}
            </ViewTransition>
          )}
        >
          <Button
            aria-label="Close enlarged workstation"
            className="pointer-events-auto absolute top-0 right-0 z-10"
            onClick={closePhoto}
            size="icon"
            variant="secondary"
          >
            <CloseIcon aria-hidden="true" size={16} />
          </Button>
          <ViewTransition
            default="none"
            name={`workstation-image-${selectedPhoto.id}`}
            share={{
              "workstation-close": "workstation-image-expand",
              "workstation-open": "workstation-image-expand",
              default: "none",
            }}
          >
            <div
              className="relative max-h-full max-w-full"
              style={{
                aspectRatio: `${selectedPhoto.width} / ${selectedPhoto.height}`,
                width: `min(calc(100vw - 4rem), calc((100dvh - 4rem) * ${selectedPhoto.width / selectedPhoto.height}))`,
              }}
            >
              <Image
                alt={`Community workstation ${selectedIndex + 1}`}
                className="object-contain"
                fill
                loading="eager"
                sizes="calc(100vw - 4rem)"
                src={selectedPhoto.src}
              />
            </div>
          </ViewTransition>
        </Modal>
      ) : null}
    </>
  );
}
