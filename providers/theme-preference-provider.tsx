"use client";

import {
  createContext,
  useEffect,
  useEffectEvent,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
  ViewTransition,
} from "react";
import { createPortal } from "react-dom";

import { notifySite } from "@/lib/site-notification-events";
import { createThemeSelection } from "@/lib/themes/client-catalog";
import {
  applyDocumentTheme,
  cycleThemePreference,
  getThemeById,
  getThemePreferenceEventDetail,
  getSavedTheme,
  isThemeCycleShortcut,
  isThemePreferenceStorageEvent,
  persistThemePreference,
  runThemeViewTransition,
  setThemeTransitionOrigin,
  themePreferenceEvent,
  type ThemeTransitionOrigin,
  type ThemeViewTransitionType,
} from "@/lib/themes/theme-runtime";
import { isEditableTarget } from "@/lib/ui/editable-target";

function subscribeToTransitionHost() {
  return () => {
    // document.body is the stable client transition host.
  };
}

function getTransitionHost() {
  return document.body;
}

function getServerTransitionHost() {
  return null;
}

type ThemePreferenceRequest = {
  origin?: ThemeTransitionOrigin;
  themeId: string;
  transitionType: ThemeViewTransitionType;
  update?: () => void;
};

type RequestThemePreference = (request: ThemePreferenceRequest) => void;

type ThemePreferenceContextValue = {
  applyTheme: (
    request: Pick<ThemePreferenceRequest, "origin" | "themeId"> & { signal: AbortSignal }
  ) => Promise<void>;
  cancelPendingTheme: () => void;
  requestTheme: RequestThemePreference;
};

const ThemePreferenceContext = createContext<ThemePreferenceContextValue | null>(null);

export function useThemePreferenceRequest() {
  const requestTheme = useContext(ThemePreferenceContext);
  if (!requestTheme) {
    throw new Error("useThemePreferenceRequest must be used within ThemePreferenceProvider");
  }
  return requestTheme;
}

export function ThemePreferenceProvider({ children }: { children: ReactNode }) {
  const selectionRef = useRef(createThemeSelection());
  const [themeRequest, setThemeRequest] = useState(() => ({
    revision: 0,
    themeId: getSavedTheme().id,
  }));

  const requestTheme: RequestThemePreference = ({ origin, themeId, transitionType, update }) => {
    selectionRef.current.cancel();
    setThemeTransitionOrigin(origin);
    runThemeViewTransition(transitionType, () => {
      setThemeRequest((current) => ({ revision: current.revision + 1, themeId }));
      update?.();
    });
  };
  const applyTheme: ThemePreferenceContextValue["applyTheme"] = ({ origin, themeId, signal }) =>
    selectionRef.current.select(
      themeId,
      (theme) => {
        requestTheme({
          origin,
          themeId: theme.id,
          transitionType: "theme-apply",
          update: () => persistThemePreference(theme),
        });
        notifySite(`${theme.name} theme applied`);
      },
      signal
    );
  const cancelPendingTheme = () => selectionRef.current.cancel();
  const requestThemeFromEffect = useEffectEvent(requestTheme);
  const transitionHost = useSyncExternalStore(
    subscribeToTransitionHost,
    getTransitionHost,
    getServerTransitionHost
  );
  useLayoutEffect(() => {
    applyDocumentTheme(getThemeById(themeRequest.themeId) ?? getSavedTheme());
  }, [themeRequest]);

  useEffect(() => {
    const selection = selectionRef.current;
    const applyRequestedTheme = (event: Event) => {
      const eventDetail = getThemePreferenceEventDetail(event);
      if (!eventDetail) return;

      requestThemeFromEffect({
        origin: eventDetail.origin,
        themeId: eventDetail.themeId,
        transitionType: eventDetail.transitionType ?? "theme-apply",
      });
    };

    const applySavedTheme = (event: StorageEvent) => {
      let localStorageArea: Storage;
      try {
        localStorageArea = window.localStorage;
      } catch {
        return;
      }

      if (!isThemePreferenceStorageEvent(event, localStorageArea)) return;
      requestThemeFromEffect({
        themeId: getSavedTheme().id,
        transitionType: "theme-apply",
      });
    };

    const cycleTheme = (event: KeyboardEvent) => {
      if (!isThemeCycleShortcut(event)) return;
      const modalOpen = document.querySelector('[aria-modal="true"], dialog[open]');
      if (isEditableTarget(event.target) || modalOpen) return;

      event.preventDefault();
      cycleThemePreference();
    };

    window.addEventListener("storage", applySavedTheme);
    window.addEventListener(themePreferenceEvent, applyRequestedTheme);
    window.addEventListener("keydown", cycleTheme);

    return () => {
      selection.cancel();
      window.removeEventListener("storage", applySavedTheme);
      window.removeEventListener(themePreferenceEvent, applyRequestedTheme);
      window.removeEventListener("keydown", cycleTheme);
    };
  }, []);

  return (
    <ThemePreferenceContext value={{ applyTheme, cancelPendingTheme, requestTheme }}>
      {transitionHost ? (
        <ViewTransition
          default="none"
          update={{
            "theme-apply": "theme-transition-driver",
            "theme-revert": "theme-transition-driver",
            default: "none",
          }}
        >
          {createPortal(
            <span
              aria-hidden="true"
              className="pointer-events-none fixed top-0 left-0 size-px opacity-0"
              data-theme-transition-revision={themeRequest.revision}
            />,
            transitionHost
          )}
        </ViewTransition>
      ) : null}
      {children}
    </ThemePreferenceContext>
  );
}
