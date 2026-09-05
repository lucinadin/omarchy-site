import { Suspense } from "react";

import { SiteHeader } from "@/components/site/site-header";
import { ManualArticleSkeleton } from "@/features/manual/components/manual-document";
import { ManualSidebar, ManualSidebarSkeleton } from "@/features/manual/components/manual-sidebar";

export default function ManualLayout({ children }: LayoutProps<"/manual">) {
  return (
    <>
      <SiteHeader />
      <main className="content-container min-h-screen pt-16 pb-24">
        <div className="gap-fluid-layout grid grid-cols-[minmax(220px,0.34fr)_minmax(0,1fr)] [@media(max-width:800px)]:grid-cols-[1fr] [@media(max-width:800px)]:gap-0">
          <Suspense fallback={<ManualSidebarSkeleton />}>
            <ManualSidebar />
          </Suspense>
          <Suspense fallback={<ManualArticleSkeleton />}>{children}</Suspense>
        </div>
      </main>
    </>
  );
}
