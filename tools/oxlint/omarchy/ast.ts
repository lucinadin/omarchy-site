import type { ESTree } from "@oxlint/plugins";

type PropertyNode =
  | ESTree.ObjectProperty
  | ESTree.AssignmentTargetProperty
  | ESTree.AssignmentTargetPropertyProperty
  | ESTree.BindingProperty;

type LiteralNode =
  | ESTree.BigIntLiteral
  | ESTree.BooleanLiteral
  | ESTree.NullLiteral
  | ESTree.NumericLiteral
  | ESTree.RegExpLiteral
  | ESTree.StringLiteral;

export function isObjectProperty(node: PropertyNode): node is ESTree.ObjectProperty {
  return node.parent.type === "ObjectExpression";
}

export function isStringLiteral(node: LiteralNode): node is ESTree.StringLiteral {
  return typeof node.value === "string";
}

export function propertyName(node: ESTree.ObjectProperty): string | null {
  if (!node.computed && node.key.type === "Identifier") return node.key.name;
  if (node.key.type === "Literal" && isStringLiteral(node.key)) return node.key.value;
  return null;
}
