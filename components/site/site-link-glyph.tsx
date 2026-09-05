import { getSiteLinkKind, type SiteLink } from "@/lib/site-navigation";

export function SiteLinkGlyph({ className, link }: { className: string; link: SiteLink }) {
  const kind = getSiteLinkKind(link);

  return (
    <span aria-hidden="true" className={className} data-link-kind={kind}>
      {kind === "internal" ? "→" : "↗"}
    </span>
  );
}
