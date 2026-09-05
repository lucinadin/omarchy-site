import type { MDXComponents } from "mdx/types";
import type { ComponentPropsWithoutRef, ElementType } from "react";

type ManualHeadingProps = ComponentPropsWithoutRef<"h2"> & {
  as: "h2" | "h3" | "h4" | "h5" | "h6";
};

function ManualHeading({ as: Heading, children, id, ...props }: ManualHeadingProps) {
  return (
    <Heading id={id} {...props}>
      {children}
      {id ? (
        <>
          {" "}
          <a aria-label="Link to this section" className="manual__heading-link" href={`#${id}`}>
            #
          </a>
        </>
      ) : null}
    </Heading>
  );
}

function heading(level: ManualHeadingProps["as"]): ElementType {
  return function MdxHeading(props: ComponentPropsWithoutRef<"h2">) {
    return <ManualHeading as={level} {...props} />;
  };
}

export const manualMdxComponents = {
  h2: heading("h2"),
  h3: heading("h3"),
  h4: heading("h4"),
  h5: heading("h5"),
  h6: heading("h6"),
} satisfies MDXComponents;
