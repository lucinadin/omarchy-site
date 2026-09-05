const approvedUtilities = new Set([
  "shadow-none",
  "shadow-overlay",
  "shadow-notification",
  "inset-shadow-keycap",
  "text-shadow-readable",
]);

/** Shared by the Oxlint rule and CSS @apply audit. */
export function prohibitedShadowUtilities(value: string): string[] {
  const tokens = value.match(/\S+/gu) ?? [];
  return [
    ...new Set(
      tokens.filter((token) => {
        const normalized = token.replace(/(^|:)!|!$/gu, "$1");
        const utility = normalized.match(
          /(?:^|:)((?:shadow|inset-shadow|drop-shadow|text-shadow)-.*)$/u
        )?.[1];
        return (
          (utility !== undefined && !approvedUtilities.has(utility)) ||
          /\[(?:box-shadow|text-shadow|--tw-(?:inset-)?(?:shadow|text-shadow|drop-shadow)[\w-]*):/u.test(
            token
          ) ||
          /\bdrop-shadow\(/u.test(token)
        );
      })
    ),
  ];
}
