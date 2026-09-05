const portals: HTMLElement[] = [];
const originalInert = new Map<HTMLElement, boolean>();
let originalOverflow = "";
let observer: MutationObserver | null = null;

function isolateTopModal() {
  for (const [element, inert] of originalInert) element.inert = inert;
  originalInert.clear();

  let branch = portals.at(-1);
  while (branch && branch !== document.body) {
    const parent = branch.parentElement;
    if (!parent) break;
    for (const sibling of parent.children) {
      if (sibling !== branch && sibling instanceof HTMLElement) {
        originalInert.set(sibling, sibling.inert);
        sibling.inert = true;
      }
    }
    branch = parent;
  }
}

/** Keep nested and desktop-portaled modals modal without moving them to the top layer. */
export function isolateModal(portal: HTMLElement) {
  if (portals.length === 0) {
    originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    observer = new MutationObserver(isolateTopModal);
    observer.observe(document.body, { childList: true });
  }
  portals.push(portal);
  isolateTopModal();

  return () => {
    const index = portals.indexOf(portal);
    if (index !== -1) portals.splice(index, 1);
    isolateTopModal();
    if (portals.length === 0) {
      observer?.disconnect();
      observer = null;
      document.body.style.overflow = originalOverflow;
    }
  };
}
