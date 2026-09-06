import {
  getWallpaperParallaxSnapshot,
  subscribeWallpaperParallax,
  type WallpaperParallaxSettings,
} from "@/lib/effects/wallpaper/settings";

export function wallpaperParallaxFrame(
  width: number,
  height: number,
  scrollProgress: number,
  pointerX: number,
  pointerY: number,
  settings: WallpaperParallaxSettings
) {
  if (
    !settings.enabled ||
    (settings.pointer === 0 && settings.scroll === 0) ||
    width <= 0 ||
    height <= 0
  )
    return { x: 0, y: 0, scale: 1 };
  const x = -Math.max(-1, Math.min(1, pointerX)) * settings.pointer;
  const y =
    -Math.max(-1, Math.min(1, pointerY)) * settings.pointer +
    Math.max(-1, Math.min(1, scrollProgress)) * settings.scroll;
  const scale = Math.max(
    1 + (2 * settings.pointer) / width,
    1 + (2 * (settings.pointer + settings.scroll)) / height
  );
  return { x, y, scale };
}

export function startWallpaperParallax(image: HTMLImageElement | null) {
  if (!image) return;
  const scene = image.parentElement;
  if (!scene) return;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let settings = getWallpaperParallaxSnapshot();
  let bounds = scene.getBoundingClientRect();
  let geometryDirty = true;
  let visible = bounds.bottom > 0 && bounds.top < window.innerHeight;
  let frame = 0;
  let previousTime = 0;
  let pointerX = 0;
  let pointerY = 0;
  let currentX = 0;
  let currentY = 0;

  const reset = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    previousTime = 0;
    image.style.removeProperty("transform");
    image.style.removeProperty("will-change");
  };

  const render = (time: number) => {
    frame = 0;
    if (!visible || document.hidden || reducedMotion.matches || !settings.enabled) {
      image.style.removeProperty("will-change");
      return;
    }
    if (geometryDirty) {
      bounds = scene.getBoundingClientRect();
      geometryDirty = false;
    }
    const elapsed = previousTime ? Math.min(64, time - previousTime) : 16;
    previousTime = time;
    const blend = settings.smoothing === 0 ? 1 : 1 - Math.exp(-elapsed / settings.smoothing);
    currentX += (pointerX - currentX) * blend;
    currentY += (pointerY - currentY) * blend;
    const progress =
      (window.innerHeight / 2 - bounds.top - bounds.height / 2) /
      ((window.innerHeight + bounds.height) / 2);
    const next = wallpaperParallaxFrame(
      bounds.width,
      bounds.height,
      progress,
      currentX,
      currentY,
      settings
    );
    image.style.transform = `translate3d(${next.x}px, ${next.y}px, 0) scale(${next.scale})`;
    if (Math.abs(pointerX - currentX) + Math.abs(pointerY - currentY) > 0.001) {
      frame = requestAnimationFrame(render);
    } else {
      previousTime = 0;
      image.style.removeProperty("will-change");
    }
  };

  const wake = () => {
    if (frame || !visible || document.hidden || reducedMotion.matches || !settings.enabled) return;
    image.style.willChange = "transform";
    frame = requestAnimationFrame(render);
  };

  const onGeometryChange = () => {
    geometryDirty = true;
    wake();
  };

  const onPointerMove = (event: PointerEvent) => {
    if (event.pointerType !== "mouse" || settings.pointer === 0) return;
    pointerX = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
    pointerY = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;
    wake();
  };

  const leavePointer = () => {
    pointerX = 0;
    pointerY = 0;
    wake();
  };

  const onPreferenceChange = () => {
    settings = getWallpaperParallaxSnapshot();
    if (!settings.enabled || reducedMotion.matches) reset();
    else onGeometryChange();
  };

  const onVisibilityChange = () => {
    if (document.hidden) {
      cancelAnimationFrame(frame);
      frame = 0;
      previousTime = 0;
      image.style.removeProperty("will-change");
    } else onGeometryChange();
  };

  const resize = new ResizeObserver(onGeometryChange);
  resize.observe(scene);
  const intersection = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) onGeometryChange();
    else {
      cancelAnimationFrame(frame);
      frame = 0;
      previousTime = 0;
      image.style.removeProperty("will-change");
    }
  });
  intersection.observe(scene);
  const unsubscribe = subscribeWallpaperParallax(onPreferenceChange);
  scene.addEventListener("pointermove", onPointerMove, { passive: true });
  scene.addEventListener("pointerleave", leavePointer, { passive: true });
  window.addEventListener("scroll", onGeometryChange, { passive: true });
  window.addEventListener("resize", onGeometryChange, { passive: true });
  document.addEventListener("visibilitychange", onVisibilityChange);
  reducedMotion.addEventListener("change", onPreferenceChange);
  wake();

  return () => {
    reset();
    unsubscribe();
    resize.disconnect();
    intersection.disconnect();
    scene.removeEventListener("pointermove", onPointerMove);
    scene.removeEventListener("pointerleave", leavePointer);
    window.removeEventListener("scroll", onGeometryChange);
    window.removeEventListener("resize", onGeometryChange);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    reducedMotion.removeEventListener("change", onPreferenceChange);
  };
}
