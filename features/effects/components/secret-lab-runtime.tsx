"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import type { SecretLabView } from "@/features/effects/components/secret-lab-panel";
import {
  SECRET_LAB_LAUNCHER_EVENT,
  SECRET_LAB_OPEN_EVENT,
  unlockSecretLab,
} from "@/lib/secret-lab-access";
import { isEditableTarget } from "@/lib/ui/editable-target";

const SecretLabPanel = dynamic(
  () =>
    import("@/features/effects/components/secret-lab-panel").then(
      (module) => module.SecretLabPanel
    ),
  { ssr: false }
);

const accessSequence = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "b",
  "a",
] as const;

export function SecretLabRuntime() {
  const [view, setView] = useState<SecretLabView | null>(null);

  useEffect(() => {
    let sequenceIndex = 0;

    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;

      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      if (key === accessSequence[sequenceIndex]) {
        sequenceIndex += 1;
      } else {
        sequenceIndex = key === accessSequence[0] ? 1 : 0;
      }

      if (sequenceIndex !== accessSequence.length) return;

      sequenceIndex = 0;
      unlockSecretLab();
      setView("open");
    };

    const requestOpen = () => setView("open");
    const requestLauncher = () => setView("launcher");
    window.addEventListener(SECRET_LAB_OPEN_EVENT, requestOpen);
    window.addEventListener(SECRET_LAB_LAUNCHER_EVENT, requestLauncher);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener(SECRET_LAB_OPEN_EVENT, requestOpen);
      window.removeEventListener(SECRET_LAB_LAUNCHER_EVENT, requestLauncher);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  if (view === null) return null;

  return <SecretLabPanel onViewChange={setView} view={view} />;
}
