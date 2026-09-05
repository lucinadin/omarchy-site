export function storageGet(key: string) {
  try {
    return globalThis.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function storageSet(key: string, value: string) {
  try {
    globalThis.localStorage.setItem(key, value);
  } catch {
    // Storage can be disabled without disabling the in-memory feature.
  }
}

export function storageSetJson<Value>(key: string, value: Value) {
  storageSet(key, JSON.stringify(value));
}

export function storageRemove(key: string) {
  try {
    globalThis.localStorage.removeItem(key);
  } catch {
    // Storage can be disabled without disabling the in-memory feature.
  }
}
