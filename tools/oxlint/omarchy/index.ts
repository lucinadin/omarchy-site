import { eslintCompatPlugin } from "@oxlint/plugins";

import { noExtractedClassnameConstantsRule } from "./rules/no-extracted-classname-constants.ts";
import { noInlineClampRule } from "./rules/no-inline-clamp.ts";
import { noShadowDriftRule } from "./rules/no-shadow-drift.ts";
import { noUnscaledTypographyRule } from "./rules/no-unscaled-typography.ts";
import { preferVariableShorthandRule } from "./rules/prefer-variable-shorthand.ts";

const omarchyPlugin = eslintCompatPlugin({
  meta: { name: "omarchy" },
  rules: {
    "no-extracted-classname-constants": noExtractedClassnameConstantsRule,
    "no-inline-clamp": noInlineClampRule,
    "no-shadow-drift": noShadowDriftRule,
    "no-unscaled-typography": noUnscaledTypographyRule,
    "prefer-variable-shorthand": preferVariableShorthandRule,
  },
});

export default omarchyPlugin;
