import { ManualNavigation } from "@/features/manual/components/manual-sidebar-links";
import { getManualChapters } from "@/features/manual/manual-queries";

export async function ManualSidebar() {
  const chapters = await getManualChapters();

  return <ManualNavigation chapters={chapters} />;
}

export function ManualSidebarSkeleton() {
  return (
    <>
      <aside
        className="border-border sticky top-16 h-[calc(100vh-64px)] overflow-y-auto border-r pt-14 pr-8 pb-12 [@media(max-width:800px)]:hidden"
        aria-hidden="true"
      >
        <div className="bg-surface h-96 [animation:skeleton-pulse_1.2s_ease-in-out_infinite_alternate]" />
      </aside>
      <div
        className="[@media(max-width:800px)]:bg-surface hidden [@media(max-width:800px)]:sticky [@media(max-width:800px)]:top-16 [@media(max-width:800px)]:z-[45] [@media(max-width:800px)]:mx-[calc(-1*var(--page-gutter))] [@media(max-width:800px)]:grid [@media(max-width:800px)]:min-h-16 [@media(max-width:800px)]:[animation:skeleton-pulse_1.2s_ease-in-out_infinite_alternate] [@media(max-width:800px)]:grid-cols-[44px_minmax(0,1fr)_44px] [@media(max-width:800px)]:items-center [@media(max-width:800px)]:gap-[0.55rem] [@media(max-width:800px)]:px-(--page-gutter) [@media(max-width:800px)]:py-[0.65rem] [@media(max-width:800px)]:backdrop-blur-[12px]"
        aria-hidden="true"
      />
    </>
  );
}
