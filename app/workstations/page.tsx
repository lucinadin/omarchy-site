import type { Metadata } from "next";

import { PageTransition } from "@/components/site/page-transition";
import { SiteHeader } from "@/components/site/site-header";
import { WorkstationsPageContent } from "@/features/workstations/components/workstations-page-content";

export const metadata: Metadata = {
  title: "Workstations | Omarchy",
  description: "Omarchy workstations shared by the community.",
  alternates: { canonical: "/workstations/" },
  openGraph: {
    title: "Omarchy workstations",
    description: "Omarchy workstations shared by the community.",
    images: ["/assets/images/opengraph.png"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Omarchy workstations",
    description: "Omarchy workstations shared by the community.",
    images: ["/assets/images/opengraph.png"],
  },
};

export default function WorkstationsPage() {
  return (
    <>
      <SiteHeader />
      <PageTransition>
        <WorkstationsPageContent />
      </PageTransition>
    </>
  );
}
