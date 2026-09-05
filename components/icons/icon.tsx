import { createElement, type ComponentPropsWithRef } from "react";

export type IconDefinition = readonly (readonly [
  string,
  Readonly<Record<string, string | number>>,
])[];

export type IconProps = Omit<ComponentPropsWithRef<"svg">, "children"> & {
  color?: string;
  size?: number | string;
};

type IconRendererProps = IconProps & {
  icon: IconDefinition;
};

export function Icon({
  color = "currentColor",
  icon,
  size = 24,
  strokeWidth,
  ...props
}: IconRendererProps) {
  const strokeProps =
    strokeWidth === undefined ? undefined : { stroke: "currentColor", strokeWidth };

  return (
    <svg
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
      color={color}
    >
      {icon.map(([tag, attributes]) =>
        createElement(tag, {
          ...attributes,
          ...strokeProps,
          key: attributes.key,
        })
      )}
    </svg>
  );
}

export function createIcon(icon: IconDefinition, displayName: string) {
  function IconComponent(props: IconProps) {
    return <Icon {...props} icon={icon} />;
  }

  IconComponent.displayName = displayName;
  return IconComponent;
}
