export const themePreferenceKey = "omarchy-preview-theme:v1";

export const defaultThemeSkewAngle = 3.5;
export const maximumThemeSkewAngle = 4.5;
export const minimumThemeSkewAngle = 0;
export const themeSkewAnglePreferenceKey = "omarchy.secret-lab:v1:theme-skew-angle";

export function normalizeThemeSkewAngle(value: number | string | null) {
  if (value === null || String(value).trim() === "") {
    return defaultThemeSkewAngle;
  }
  const angle = Number(value);
  if (!Number.isFinite(angle)) return defaultThemeSkewAngle;
  return Math.min(maximumThemeSkewAngle, Math.max(minimumThemeSkewAngle, angle));
}
