import { parseJsonObject } from "@/lib/json";

export const homeDesktopSurfaceEvent = "omarchy:desktop:surface";

type HomeDesktopSurfaceEventDetail = {
  surface: "theme";
};

export function getHomeDesktopSurfaceEventDetail(
  event: Event
): HomeDesktopSurfaceEventDetail | null {
  if (!(event instanceof CustomEvent)) return null;
  const detail = parseJsonObject(event.detail);
  if (detail?.surface !== "theme") return null;
  return { surface: detail.surface };
}

export function requestHomeDesktopSurface(surface: "theme") {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent<HomeDesktopSurfaceEventDetail>(homeDesktopSurfaceEvent, {
      detail: { surface },
    })
  );
}

export function getVisibleHomeDesktopCommandHost() {
  const host = document.querySelector<HTMLElement>("#home-desktop-command-host");
  if (!host) return null;

  const bounds = host.getBoundingClientRect();
  const isVisible =
    bounds.width > 0 &&
    bounds.height > 0 &&
    bounds.bottom > 0 &&
    bounds.right > 0 &&
    bounds.top < window.innerHeight &&
    bounds.left < window.innerWidth;

  return isVisible ? host : null;
}

function waitForScrollToSettle() {
  return new Promise<void>((resolve) => {
    let previousX = window.scrollX;
    let previousY = window.scrollY;
    let stableFrames = 0;
    let frameCount = 0;

    const check = () => {
      const currentX = window.scrollX;
      const currentY = window.scrollY;
      const unchanged = currentX === previousX && currentY === previousY;
      stableFrames = unchanged ? stableFrames + 1 : 0;
      frameCount += 1;

      if ((frameCount >= 6 && stableFrames >= 4) || frameCount >= 90) {
        resolve();
        return;
      }

      previousX = currentX;
      previousY = currentY;
      requestAnimationFrame(check);
    };

    requestAnimationFrame(check);
  });
}

export async function prepareHomeDesktopCommandHost() {
  const host = getVisibleHomeDesktopCommandHost();
  if (!host) return null;

  host.scrollIntoView({ block: "nearest", inline: "nearest" });
  await waitForScrollToSettle();

  return getVisibleHomeDesktopCommandHost();
}
