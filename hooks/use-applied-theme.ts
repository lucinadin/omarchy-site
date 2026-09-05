"use client";

import { useSyncExternalStore } from "react";

import { defaultThemeId } from "@/lib/themes/official";
import { getAppliedThemeId, themeAppliedEvent } from "@/lib/themes/theme-runtime";

function subscribe(onChange: () => void) {
  window.addEventListener(themeAppliedEvent, onChange);
  return () => window.removeEventListener(themeAppliedEvent, onChange);
}

function getServerSnapshot() {
  return defaultThemeId;
}

export function useAppliedTheme() {
  return useSyncExternalStore(subscribe, getAppliedThemeId, getServerSnapshot);
}
