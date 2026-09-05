import { isJsonObject, type JsonValue as LogoEffectJsonValue } from "@/lib/json";

export function collectColorBindingKinds(value: LogoEffectJsonValue, kinds: string[]) {
  if (Array.isArray(value)) {
    for (const item of value) collectColorBindingKinds(item, kinds);
    return;
  }
  if (!isJsonObject(value)) return;
  if ("kind" in value && (value.kind === "theme" || value.kind === "literal")) {
    kinds.push(value.kind);
  }
  for (const child of Object.values(value)) collectColorBindingKinds(child, kinds);
}
