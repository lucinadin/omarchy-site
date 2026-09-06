export const SECRET_LAB_OPEN_EVENT = "omarchy:secret-lab:open";
export const SECRET_LAB_UNLOCKED_EVENT = "omarchy:secret-lab:unlocked";

const SECRET_LAB_VISIBILITY_KEY = "omarchy.lab:v1:visible";

export function isSecretLabUnlocked() {
  if (typeof window === "undefined") return false;

  try {
    return window.localStorage.getItem(SECRET_LAB_VISIBILITY_KEY) === "1";
  } catch {
    return false;
  }
}

export function openSecretLab() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(SECRET_LAB_OPEN_EVENT));
}

export function unlockSecretLab() {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(SECRET_LAB_VISIBILITY_KEY, "1");
  } catch {
    // The current session can still use the Secret Lab when storage is unavailable.
  }

  window.dispatchEvent(new Event(SECRET_LAB_UNLOCKED_EVENT));
}
