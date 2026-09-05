import { defineRule } from "@oxlint/plugins";
import type { ESTree } from "@oxlint/plugins";

const extractedClassBinding = /class(?:name|names|list|es)?$/iu;

function isExtractedClassValue(expression: ESTree.Expression): boolean {
  if (
    expression.type === "ParenthesizedExpression" ||
    expression.type === "TSAsExpression" ||
    expression.type === "TSSatisfiesExpression" ||
    expression.type === "TSTypeAssertion" ||
    expression.type === "TSNonNullExpression"
  ) {
    return isExtractedClassValue(expression.expression);
  }

  return expression.type !== "MemberExpression" && expression.type !== "NewExpression";
}

/** Keep Tailwind classes next to their element unless they form a real component variant API. */
export const noExtractedClassnameConstantsRule = defineRule({
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Disallow className strings and maps extracted into constants; keep one-offs inline and model reusable component variants with cva.",
    },
    messages: {
      extracted:
        "Keep one-off classes inline with the element and use cn() for conditions. If this is a reusable component API, model it as a cva variant instead.",
    },
  },
  createOnce(context) {
    return {
      VariableDeclarator(node) {
        if (
          node.id.type !== "Identifier" ||
          node.init === null ||
          !extractedClassBinding.test(node.id.name) ||
          !isExtractedClassValue(node.init)
        ) {
          return;
        }

        context.report({ node, messageId: "extracted" });
      },
    };
  },
});
