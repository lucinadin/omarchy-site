"use client";

import { useSyncExternalStore } from "react";

import { getHostModifierLabel, type HostModifierLabel } from "@/lib/platform/host";

function subscribeToHostPlatform() {
  return () => {
    // The host platform cannot change during a document lifetime.
  };
}

function getServerHostModifierLabel(): HostModifierLabel {
  return "Super";
}

export function useHostModifierLabel() {
  return useSyncExternalStore(
    subscribeToHostPlatform,
    getHostModifierLabel,
    getServerHostModifierLabel
  );
}
