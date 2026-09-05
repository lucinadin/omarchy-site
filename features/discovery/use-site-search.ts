"use client";

import { useDeferredValue, useEffect, useState } from "react";

import { findSearchMatches, loadSearchEntries } from "@/features/discovery/search-client";
import type { SearchMatch } from "@/features/discovery/types";

type SearchStatus = "error" | "idle" | "loading" | "ready";

type SiteSearchState = {
  matches: SearchMatch[];
  query?: string;
  status: SearchStatus;
};

const idleState: SiteSearchState = { matches: [], status: "idle" };

export function useSiteSearch(query: string, limit = 12): SiteSearchState {
  const deferredQuery = useDeferredValue(query.trim());
  const [state, setState] = useState<SiteSearchState>(idleState);

  useEffect(() => {
    if (!deferredQuery) return;

    let cancelled = false;

    void loadSearchEntries()
      .then((entries) => {
        if (cancelled) return;
        setState({
          matches: findSearchMatches(entries, deferredQuery, limit),
          query: deferredQuery,
          status: "ready",
        });
      })
      .catch(() => {
        if (cancelled) return;
        setState({ matches: [], query: deferredQuery, status: "error" });
      });

    return () => {
      cancelled = true;
    };
  }, [deferredQuery, limit]);

  if (!deferredQuery) return idleState;
  if (state.query !== deferredQuery) return { matches: [], status: "loading" };
  return state;
}
