"use client";

import NextImage, { getImageProps } from "next/image";
import { useSyncExternalStore, type ComponentProps } from "react";

// Remember successful loads for this page session, not the image bytes. For a
// responsive picture, a loaded rendition means its source has been previewed.
const loadedSources = new Set<string>();
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getServerSnapshot() {
  return false;
}

export function Image({
  src,
  overrideSrc,
  placeholder,
  onLoad,
  ...props
}: ComponentProps<typeof NextImage>) {
  const { props: imageProps } = getImageProps({ ...props, overrideSrc, src });
  const source = imageProps.src;
  const loaded = useSyncExternalStore(
    subscribe,
    () => loadedSources.has(source),
    getServerSnapshot
  );

  return (
    <NextImage
      {...props}
      onLoad={(event) => {
        if (event.currentTarget.naturalWidth > 0 && !loadedSources.has(source)) {
          loadedSources.add(source);
          for (const listener of listeners) listener();
        }
        onLoad?.(event);
      }}
      overrideSrc={overrideSrc}
      placeholder={loaded ? "empty" : placeholder}
      src={src}
    />
  );
}
