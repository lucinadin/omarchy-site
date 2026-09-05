import Link from "next/link";
import type { ReactNode } from "react";

import { ArrowLeftIcon } from "@/icons";

export function PageBackLink({
  href = "/",
  children = "Home",
}: {
  href?: string;
  children?: ReactNode;
}) {
  return (
    <Link
      href={href}
      transitionTypes={["nav-back"]}
      className="text-small text-muted-foreground hover:text-primary focus-visible:text-primary mb-6 inline-flex items-center gap-2 no-underline"
    >
      <ArrowLeftIcon aria-hidden="true" size={14} />
      {children}
    </Link>
  );
}
