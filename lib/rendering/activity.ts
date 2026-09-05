/** Observe placement, not just tab visibility, so offscreen effects stop scheduling frames. */
export function observeRenderActivity(element: HTMLElement, onChange: (active: boolean) => void) {
  let disposed = false;
  const bounds = element.getBoundingClientRect();
  let intersects =
    bounds.width > 0 &&
    bounds.height > 0 &&
    bounds.bottom > 0 &&
    bounds.right > 0 &&
    bounds.top < window.innerHeight &&
    bounds.left < window.innerWidth;
  const isActive = () =>
    document.visibilityState === "visible" &&
    intersects &&
    element.checkVisibility({ visibilityProperty: true });
  const refresh = () => {
    if (!disposed) onChange(isActive());
  };
  const intersection = new IntersectionObserver((entries) => {
    const entry = entries.at(-1);
    if (!entry) return;
    intersects = entry.isIntersecting;
    refresh();
  });
  intersection.observe(element);
  const attributes = new MutationObserver(refresh);
  let ancestor: HTMLElement | null = element;
  while (ancestor) {
    attributes.observe(ancestor, {
      attributeFilter: ["class", "data-active", "data-active-workspace", "hidden", "style"],
      attributes: true,
    });
    ancestor = ancestor.parentElement;
  }
  document.addEventListener("visibilitychange", refresh);
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    intersection.disconnect();
    attributes.disconnect();
    document.removeEventListener("visibilitychange", refresh);
  };
  try {
    refresh();
  } catch (error) {
    dispose();
    throw error;
  }
  return { isActive, dispose };
}
