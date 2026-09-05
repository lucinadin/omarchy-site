"use client";

import { useSyncExternalStore } from "react";

import { isSecretLabUnlocked, SECRET_LAB_UNLOCKED_EVENT } from "@/lib/secret-lab-access";

function subscribeToSecretLabUnlock(onStoreChange: () => void) {
  window.addEventListener(SECRET_LAB_UNLOCKED_EVENT, onStoreChange);
  return () => window.removeEventListener(SECRET_LAB_UNLOCKED_EVENT, onStoreChange);
}

function getServerSecretLabSnapshot() {
  return false;
}

export function useSecretLabUnlocked() {
  return useSyncExternalStore(
    subscribeToSecretLabUnlock,
    isSecretLabUnlocked,
    getServerSecretLabSnapshot
  );
}
