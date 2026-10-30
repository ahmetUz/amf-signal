import { Suspense } from "react";
import { FiltersSidebar } from "@/components/publications/filters-sidebar";
import { PublicationsFeed } from "@/components/publications/publications-feed";
import { parseFilters } from "@/lib/publications/filters";
import { listFilterOptions, listPublications } from "@/lib/publications/queries";

type SearchParams = PageProps<"/">["searchParams"];

// cacheComponents (Next 16) : l'en-tête est prérendu, la partie qui lit l'URL et la base est streamée dans le Suspense.
export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <main className="mx-auto w-full max-w-[1280px] space-y-6 px-6 py-10">
      <header className="space-y-1">
        <h1 className="text-[28px] font-bold tracking-[-.025em]">Le fil AMF</h1>
        <p className="text-sm text-muted-foreground">
          Informations réglementées déposées sur info-financiere.gouv.fr (version française).
        </p>
      </header>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Chargement…</p>}>
        <PublicationsSection searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function PublicationsSection({ searchParams }: { searchParams: SearchParams }) {
  const filters = parseFilters(await searchParams);
  const [rows, options] = await Promise.all([listPublications(filters), listFilterOptions()]);
  return (
    <div className="grid gap-10 lg:grid-cols-[260px_minmax(0,1fr)]">
      <FiltersSidebar
        filters={filters}
        subtypes={options.subtypes}
        days={options.days}
        selected={rows.filter((r) => r.selected)}
      />
      <div>
        <p className="text-sm text-muted-foreground">
          {rows.length} résultat{rows.length > 1 ? "s" : ""}
        </p>
        <PublicationsFeed rows={rows} />
      </div>
    </div>
  );
}
