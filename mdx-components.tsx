import type { MDXComponents } from "mdx/types";
import type { ComponentPropsWithoutRef } from "react";

function ResponsiveTable(props: ComponentPropsWithoutRef<"table">) {
  return (
    <div className="typeset-scroll">
      <table {...props} />
    </div>
  );
}

const components: MDXComponents = {
  table: ResponsiveTable,
};

export function useMDXComponents(): MDXComponents {
  return components;
}
