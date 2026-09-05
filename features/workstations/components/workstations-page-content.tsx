import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderEyebrow,
  PageHeaderMeta,
  PageHeaderTitle,
} from "@/components/site/page-header";
import { WorkstationGallery } from "@/features/workstations/components/workstation-gallery";
import { workstationPhotos } from "@/features/workstations/workstations-data";
import { ArrowUpRightIcon } from "@/icons";

const discordUrl = "https://discord.com/channels/1390012484194275541/1399365919293051010";

export function WorkstationsPageContent() {
  return (
    <main className="page-main overflow-clip">
      <PageHeader>
        <PageHeaderEyebrow>Community setups</PageHeaderEyebrow>
        <PageHeaderTitle>Omarchy workstations</PageHeaderTitle>
        <PageHeaderDescription>
          Desks, laptops, and battlestations shared by people running Omarchy.
        </PageHeaderDescription>
        <PageHeaderMeta>
          <a
            className="text-meta text-link inline-flex items-center gap-[0.45rem] underline-offset-[0.2em]"
            href={discordUrl}
          >
            Share yours in #omarchy-workstations
            <ArrowUpRightIcon aria-hidden="true" size={14} />
          </a>
        </PageHeaderMeta>
      </PageHeader>

      <section className="py-fluid-section" aria-labelledby="workstations-gallery-title">
        <header className="mb-fluid-xl flex items-end justify-between gap-8 [@media(max-width:800px)]:flex-col [@media(max-width:800px)]:items-start">
          <div>
            <p className="text-meta text-primary m-0 font-medium">The community wall</p>
            <h2
              className="text-title-lg text-bright-foreground mt-[0.9rem] mb-0 font-light tracking-[-0.045em]"
              id="workstations-gallery-title"
            >
              80 ways to make it yours
            </h2>
          </div>
          <p className="text-small leading-copy text-muted-foreground m-0 text-right [@media(max-width:520px)]:hidden [@media(max-width:800px)]:text-left">
            Open any photo for a closer look.
          </p>
        </header>

        <WorkstationGallery photos={workstationPhotos} />
      </section>
    </main>
  );
}
