import { isFiniteNumber } from "@/lib/validation";

export function numberInRange<Value>(value: Value, fallback: number, minimum = 0, maximum = 1) {
  return isFiniteNumber(value) ? Math.min(maximum, Math.max(minimum, value)) : fallback;
}
