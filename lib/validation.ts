export function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function findCatalogId<const Catalog extends readonly { readonly id: string }[], Value>(
  catalog: Catalog,
  value: Value
): Catalog[number]["id"] | null {
  return catalog.find((entry) => Object.is(entry.id, value))?.id ?? null;
}

export function unreachable(value: never): never {
  throw new TypeError(`Unexpected domain value: ${String(value)}`);
}
