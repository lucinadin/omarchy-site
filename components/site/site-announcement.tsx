import Link from "next/link";

export function SiteAnnouncement() {
  return (
    <aside
      aria-label="Announcement"
      className="site-announcement bg-primary text-meta text-primary-foreground fixed inset-x-0 top-0 z-[193] flex h-(--site-announcement-height,36px) min-h-(--site-announcement-height,36px) items-center justify-center px-4 py-2 text-center"
    >
      <Link
        className="decoration-transparent underline-offset-[0.2em] hover:decoration-current"
        href="/news/2026/08/omacom-foundation-launches-with-8-million"
        transitionTypes={["nav-forward"]}
      >
        Omacom Foundation launches with $14.95 million <span aria-hidden="true">→</span>
      </Link>
    </aside>
  );
}
