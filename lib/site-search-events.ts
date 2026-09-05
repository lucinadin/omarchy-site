export const siteSearchEvent = "omarchy:site-search";

export type SiteSearchView = "apps" | "root";

type SiteSearchRequest = { view: SiteSearchView };

/* oxlint-disable typescript/unified-signatures -- The zero-argument overload keeps this
directly assignable to a JSX event handler without treating its event as a search view. */
export function requestSiteSearch(): void;
export function requestSiteSearch(view: SiteSearchView): void;
/* oxlint-enable typescript/unified-signatures */
export function requestSiteSearch(view: SiteSearchView = "root") {
  window.dispatchEvent(new CustomEvent<SiteSearchRequest>(siteSearchEvent, { detail: { view } }));
}

export function requestedSiteSearchView(event: Event): SiteSearchView {
  if (!(event instanceof CustomEvent)) return "root";
  return event.detail?.view === "apps" ? "apps" : "root";
}
